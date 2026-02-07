import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getNextRun } from '@/lib/cron';
import { getConnectedIntegrations } from '@/lib/ai/tool-definitions';
import { executeToolCall } from '@/lib/ai/tool-executor';
import { createProvider } from '@/lib/ai/providers';

/**
 * POST /api/routines/execute
 *
 * Called by a cron job (e.g., AWS EventBridge every minute) to execute due routines.
 * Secured with CRON_SECRET header.
 */
export async function POST(request: Request) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find all enabled routines that are due
    const dueRoutines = await prisma.routine.findMany({
      where: {
        enabled: true,
        nextRun: { lte: now },
      },
      include: {
        user: {
          select: { id: true, preferredModel: true, stripeSubscriptionId: true, stripeCurrentPeriodEnd: true },
        },
      },
    });

    if (dueRoutines.length === 0) {
      return NextResponse.json({ executed: 0 });
    }

    const results = [];

    for (const routine of dueRoutines) {
      const execution = await prisma.routineExecution.create({
        data: {
          routineId: routine.id,
          status: 'running',
        },
      });

      try {
        const toolChain = JSON.parse(routine.toolChain) as Array<{
          toolName: string;
          args?: Record<string, unknown>;
        }>;

        // Get user's integrations for tool execution
        const integrations = await getConnectedIntegrations(routine.userId);
        const provider = createProvider('openai'); // Routines always use OpenAI (cheapest)
        const isPro = !!routine.user.stripeSubscriptionId &&
          (!routine.user.stripeCurrentPeriodEnd || routine.user.stripeCurrentPeriodEnd > now);

        let previousResult = '';
        const stepResults: Array<{ tool: string; result: string }> = [];

        for (const step of toolChain) {
          // Replace {{PREVIOUS_RESULT}} placeholders with previous step's output
          const args = { ...step.args };
          for (const [key, value] of Object.entries(args)) {
            if (typeof value === 'string' && value.includes('{{PREVIOUS_RESULT}}')) {
              args[key] = value.replace('{{PREVIOUS_RESULT}}', previousResult);
            }
          }

          const result = await executeToolCall(
            step.toolName,
            args,
            integrations,
            routine.userId,
            isPro,
            provider,
          );

          previousResult = result;
          stepResults.push({ tool: step.toolName, result });
        }

        // Mark execution as completed
        await prisma.routineExecution.update({
          where: { id: execution.id },
          data: {
            status: 'completed',
            result: JSON.stringify(stepResults),
            finishedAt: new Date(),
          },
        });

        results.push({ routineId: routine.id, status: 'completed' });
      } catch (error) {
        // Mark execution as failed
        await prisma.routineExecution.update({
          where: { id: execution.id },
          data: {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            finishedAt: new Date(),
          },
        });

        results.push({ routineId: routine.id, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
      }

      // Update routine: set lastRun and calculate nextRun
      const nextRun = getNextRun(routine.schedule);
      await prisma.routine.update({
        where: { id: routine.id },
        data: {
          lastRun: now,
          nextRun,
        },
      });
    }

    return NextResponse.json({ executed: results.length, results });
  } catch (error) {
    console.error('POST /api/routines/execute error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
