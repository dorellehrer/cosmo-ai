import { prisma } from '@/lib/prisma';
import {
  getAwsConfig,
  storeApiKeySecret,
  deleteApiKeySecret,
  registerAgentTaskDefinition,
  launchAgentTask,
  stopAgentTask,
  describeAgentTask,
} from '@/lib/aws';
import type { AgentStatus, ProvisionAgentRequest, ProvisioningEvent } from '@/types/agent';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Build WebSocket endpoint URL based on environment */
function buildWsEndpoint(publicIp: string): string {
  // In production, use wss:// when behind a TLS-terminating load balancer.
  // Falls back to ws:// for local development.
  const protocol = process.env.NODE_ENV === 'production' ? 'wss' : 'ws';
  return `${protocol}://${publicIp}:18789`;
}

// ──────────────────────────────────────────────
// Agent Lifecycle Orchestrator
// ──────────────────────────────────────────────

/**
 * Provision a new agent instance for a user.
 * Yields SSE events for real-time progress in the UI.
 */
export async function* provisionAgent(
  userId: string,
  request: ProvisionAgentRequest
): AsyncGenerator<ProvisioningEvent> {
  const config = getAwsConfig();
  let agentInstance;

  try {
    // Step 1: Create agent record
    yield { type: 'status', message: 'Creating your agent...', progress: 10 };

    agentInstance = await prisma.agentInstance.create({
      data: {
        userId,
        name: request.name,
        personality: request.personality,
        modelProvider: request.modelProvider,
        modelName: request.modelName,
        status: 'provisioning',
      },
    });

    // Step 2: Store API key securely
    yield { type: 'status', message: 'Securing your API key...', progress: 25 };

    const secretArn = await storeApiKeySecret(
      userId,
      request.modelProvider,
      request.apiKey
    );

    await prisma.agentInstance.update({
      where: { id: agentInstance.id },
      data: { apiKeySecretArn: secretArn },
    });

    // Step 3: Register task definition
    yield { type: 'status', message: 'Configuring your server...', progress: 40 };

    await registerAgentTaskDefinition(agentInstance.id, config);

    // Step 4: Launch Fargate task
    yield { type: 'status', message: 'Launching your personal AI...', progress: 60 };

    const { taskArn } = await launchAgentTask(
      agentInstance.id,
      userId,
      {
        AGENT_NAME: request.name,
        AGENT_PERSONALITY: request.personality,
        MODEL_PROVIDER: request.modelProvider,
        MODEL_NAME: request.modelName,
        API_KEY_SECRET_ARN: secretArn,
      },
      config
    );

    await prisma.agentInstance.update({
      where: { id: agentInstance.id },
      data: {
        awsTaskArn: taskArn,
        awsClusterArn: config.clusterArn,
        awsSecurityGroup: config.securityGroups[0] || null,
        awsSubnet: config.subnets[0] || null,
        status: 'provisioning',
      },
    });

    // Step 5: Wait for task to reach RUNNING state
    yield { type: 'status', message: 'Waiting for your agent to come online...', progress: 75 };

    const taskInfo = await waitForTaskRunning(config.clusterArn, taskArn);

    if (taskInfo.status !== 'RUNNING') {
      throw new Error(taskInfo.stoppedReason || 'Agent failed to start');
    }

    // Step 6: Finalize with public IP
    const wsEndpoint = taskInfo.publicIp
      ? buildWsEndpoint(taskInfo.publicIp)
      : null;

    const finalAgent = await prisma.agentInstance.update({
      where: { id: agentInstance.id },
      data: {
        status: 'running',
        publicIp: taskInfo.publicIp || null,
        wsEndpoint,
        lastActivity: new Date(),
      },
    });

    yield { type: 'status', message: 'Your agent is ready!', progress: 100 };

    yield {
      type: 'agent',
      agent: {
        id: finalAgent.id,
        name: finalAgent.name,
        personality: finalAgent.personality,
        status: finalAgent.status as AgentStatus,
        modelProvider: finalAgent.modelProvider as ProvisionAgentRequest['modelProvider'],
        modelName: finalAgent.modelName,
        wsEndpoint: finalAgent.wsEndpoint,
        publicIp: finalAgent.publicIp,
        heartbeatEnabled: finalAgent.heartbeatEnabled,
        heartbeatInterval: finalAgent.heartbeatInterval,
        activeHoursStart: finalAgent.activeHoursStart,
        activeHoursEnd: finalAgent.activeHoursEnd,
        activeTimezone: finalAgent.activeTimezone,
        lastHeartbeat: finalAgent.lastHeartbeat?.toISOString() || null,
        lastActivity: finalAgent.lastActivity?.toISOString() || null,
        errorMessage: finalAgent.errorMessage,
        createdAt: finalAgent.createdAt.toISOString(),
      },
    };

    yield { type: 'done' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Agent provisioning failed:', error);

    // Update agent status to error
    if (agentInstance) {
      await prisma.agentInstance.update({
        where: { id: agentInstance.id },
        data: { status: 'error', errorMessage: message },
      });
    }

    yield { type: 'error', error: message };
  }
}

/**
 * Stop a running agent instance.
 */
export async function stopAgent(userId: string, agentId: string): Promise<void> {
  const agent = await prisma.agentInstance.findFirst({
    where: { id: agentId, userId },
  });

  if (!agent) {
    throw new Error('Agent not found');
  }

  if (agent.status !== 'running' || !agent.awsTaskArn || !agent.awsClusterArn) {
    throw new Error('Agent is not running');
  }

  await stopAgentTask(agent.awsClusterArn, agent.awsTaskArn, 'User requested stop');

  await prisma.agentInstance.update({
    where: { id: agentId },
    data: { status: 'stopped' },
  });
}

/**
 * Restart a stopped agent instance.
 */
export async function restartAgent(userId: string, agentId: string): Promise<void> {
  const agent = await prisma.agentInstance.findFirst({
    where: { id: agentId, userId },
  });

  if (!agent) {
    throw new Error('Agent not found');
  }

  if (agent.status !== 'stopped' && agent.status !== 'error') {
    throw new Error('Agent must be stopped or in error state to restart');
  }

  const config = getAwsConfig();

  const { taskArn } = await launchAgentTask(
    agent.id,
    userId,
    {
      AGENT_NAME: agent.name,
      AGENT_PERSONALITY: agent.personality,
      MODEL_PROVIDER: agent.modelProvider,
      MODEL_NAME: agent.modelName,
      API_KEY_SECRET_ARN: agent.apiKeySecretArn || '',
    },
    config
  );

  await prisma.agentInstance.update({
    where: { id: agentId },
    data: {
      awsTaskArn: taskArn,
      status: 'provisioning',
      errorMessage: null,
    },
  });

  // Wait for running in background (don't block the response)
  waitForTaskRunning(config.clusterArn, taskArn).then(async (taskInfo) => {
    if (taskInfo.status === 'RUNNING') {
      const wsEndpoint = taskInfo.publicIp
        ? buildWsEndpoint(taskInfo.publicIp)
        : null;
      await prisma.agentInstance.update({
        where: { id: agentId },
        data: {
          status: 'running',
          publicIp: taskInfo.publicIp || null,
          wsEndpoint,
          lastActivity: new Date(),
        },
      });
    } else {
      await prisma.agentInstance.update({
        where: { id: agentId },
        data: {
          status: 'error',
          errorMessage: taskInfo.stoppedReason || 'Failed to restart',
        },
      });
    }
  });
}

/**
 * Permanently destroy an agent and clean up all AWS resources.
 */
export async function destroyAgent(userId: string, agentId: string): Promise<void> {
  const agent = await prisma.agentInstance.findFirst({
    where: { id: agentId, userId },
  });

  if (!agent) {
    throw new Error('Agent not found');
  }

  // Stop the task if running
  if (agent.awsTaskArn && agent.awsClusterArn && agent.status === 'running') {
    try {
      await stopAgentTask(agent.awsClusterArn, agent.awsTaskArn, 'Agent destroyed by user');
    } catch {
      // Task may already be stopped
    }
  }

  // Delete API key from Secrets Manager
  if (agent.apiKeySecretArn) {
    try {
      await deleteApiKeySecret(userId, agent.modelProvider);
    } catch {
      // Secret may already be deleted
    }
  }

  // Clean up related data
  // Note: Memory, channels, skills are scoped by userId (one agent per user).
  // Sessions are scoped by agentInstanceId.
  await prisma.agentSession.deleteMany({ where: { agentInstanceId: agentId } });
  await prisma.agentMemory.deleteMany({ where: { userId } });
  await prisma.agentChannel.deleteMany({ where: { userId } });
  await prisma.agentSkill.deleteMany({ where: { userId } });

  // Mark as destroyed
  await prisma.agentInstance.update({
    where: { id: agentId },
    data: { status: 'destroyed' },
  });
}

/**
 * Get the status of a user's agent, refreshing from AWS if needed.
 */
export async function refreshAgentStatus(userId: string, agentId: string) {
  const agent = await prisma.agentInstance.findFirst({
    where: { id: agentId, userId },
  });

  if (!agent) {
    throw new Error('Agent not found');
  }

  // Only refresh if agent is in a transient state
  if (
    agent.awsTaskArn &&
    agent.awsClusterArn &&
    (agent.status === 'provisioning' || agent.status === 'running')
  ) {
    const taskInfo = await describeAgentTask(agent.awsClusterArn, agent.awsTaskArn);

    let newStatus: AgentStatus = agent.status as AgentStatus;
    if (taskInfo.status === 'RUNNING') {
      newStatus = 'running';
    } else if (taskInfo.status === 'STOPPED') {
      newStatus = 'stopped';
    } else if (taskInfo.status === 'NOT_FOUND') {
      newStatus = 'error';
    }

    if (newStatus !== agent.status || taskInfo.publicIp !== agent.publicIp) {
      const wsEndpoint = taskInfo.publicIp
        ? buildWsEndpoint(taskInfo.publicIp)
        : agent.wsEndpoint;

      return prisma.agentInstance.update({
        where: { id: agentId },
        data: {
          status: newStatus,
          publicIp: taskInfo.publicIp || agent.publicIp,
          wsEndpoint,
          errorMessage: taskInfo.stoppedReason || agent.errorMessage,
        },
      });
    }
  }

  return agent;
}

// ──────────────────────────────────────────────
// Internal Helpers
// ──────────────────────────────────────────────

/**
 * Poll ECS until task reaches RUNNING or a terminal state.
 */
async function waitForTaskRunning(
  clusterArn: string,
  taskArn: string,
  maxAttempts: number = 30,
  intervalMs: number = 2000
): Promise<{ status: string; publicIp?: string; stoppedReason?: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    const info = await describeAgentTask(clusterArn, taskArn);

    if (info.status === 'RUNNING' || info.status === 'STOPPED' || info.status === 'NOT_FOUND') {
      return info;
    }

    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  return { status: 'TIMEOUT', stoppedReason: 'Timed out waiting for agent to start' };
}

// ──────────────────────────────────────────────
// Idle Auto-Shutdown
// ──────────────────────────────────────────────

/** How long an agent can sit idle before being auto-stopped (ms). Default: 30 min */
const IDLE_TIMEOUT_MS = Number(process.env.AGENT_IDLE_TIMEOUT_MINUTES || 30) * 60 * 1000;

/**
 * Find all running agents that have been idle longer than IDLE_TIMEOUT_MS
 * and stop them. Designed to be called from a cron/scheduled endpoint.
 *
 * Returns the number of agents that were stopped.
 */
export async function stopIdleAgents(): Promise<{ stopped: number; errors: number }> {
  const cutoff = new Date(Date.now() - IDLE_TIMEOUT_MS);

  const idleAgents = await prisma.agentInstance.findMany({
    where: {
      status: 'running',
      lastActivity: { lt: cutoff },
      awsTaskArn: { not: null },
      awsClusterArn: { not: null },
    },
  });

  let stopped = 0;
  let errors = 0;

  for (const agent of idleAgents) {
    try {
      await stopAgentTask(agent.awsClusterArn!, agent.awsTaskArn!, 'Auto-stopped: idle timeout');
      await prisma.agentInstance.update({
        where: { id: agent.id },
        data: { status: 'stopped', errorMessage: 'Auto-stopped after being idle for ' + (IDLE_TIMEOUT_MS / 60000) + ' minutes' },
      });
      stopped++;
      console.log(`Auto-stopped idle agent ${agent.id} (user: ${agent.userId})`);
    } catch (err) {
      errors++;
      console.error(`Failed to auto-stop agent ${agent.id}:`, err);
    }
  }

  return { stopped, errors };
}
