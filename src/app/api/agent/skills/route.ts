import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BUILTIN_SKILLS, getSkillIdVariants, toCanonicalSkillId } from '@/types/agent';
import { checkRateLimitDistributed, RATE_LIMIT_API } from '@/lib/rate-limit';
import { triggerAgentConfigReload, touchRunningAgentActivity } from '@/lib/agent';

// GET /api/agent/skills — List installed skills + available marketplace
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit check
    const rateLimit = await checkRateLimitDistributed(`agent:skills:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimit.headers }
      );
    }

    const installed = await prisma.agentSkill.findMany({
      where: { userId: session.user.id },
      orderBy: { installedAt: 'desc' },
    });

    // Merge with available skills to show install status
    const available = BUILTIN_SKILLS.map(skill => {
      const variants = getSkillIdVariants(skill.id);
      const userSkill = installed.find(s => variants.includes(s.skillId));
      return {
        ...skill,
        installed: !!userSkill,
        enabled: userSkill?.enabled ?? skill.defaultEnabled,
        installedId: userSkill?.id || null,
      };
    });

    return NextResponse.json({ skills: available, installed });
  } catch (error) {
    console.error('Failed to fetch skills:', error);
    return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 });
  }
}

// POST /api/agent/skills — Install a skill
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit check
    const rateLimitPost = await checkRateLimitDistributed(`agent:skills:install:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimitPost.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitPost.headers }
      );
    }

    const body = await req.json();
    const { skillId } = body;

    if (!skillId) {
      return NextResponse.json({ error: 'skillId is required' }, { status: 400 });
    }

    // Find skill definition
    const canonicalSkillId = toCanonicalSkillId(skillId);
    const variants = getSkillIdVariants(canonicalSkillId);
    const skillDef = BUILTIN_SKILLS.find(s => s.id === canonicalSkillId);
    if (!skillDef) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    // Check if already installed
    const existing = await prisma.agentSkill.findFirst({
      where: {
        userId: session.user.id,
        skillId: { in: variants },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Skill already installed' }, { status: 409 });
    }

    const skill = await prisma.agentSkill.create({
      data: {
        userId: session.user.id,
        skillId: skillDef.id,
        name: skillDef.name,
        description: skillDef.description,
        source: skillDef.source,
        enabled: true,
      },
    });

    await touchRunningAgentActivity(session.user.id).catch(() => {});

    await triggerAgentConfigReload(session.user.id).catch((err) => {
      console.warn('[agent/skills] config.reload failed after install:', err);
    });

    return NextResponse.json({ skill }, { status: 201 });
  } catch (error) {
    console.error('Failed to install skill:', error);
    return NextResponse.json({ error: 'Failed to install skill' }, { status: 500 });
  }
}

// PATCH /api/agent/skills — Toggle a skill's enabled state
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitPatch = await checkRateLimitDistributed(`agent:skills:toggle:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimitPatch.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitPatch.headers }
      );
    }

    const body = await req.json();
    const { skillId, enabled } = body;

    if (!skillId || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'skillId and enabled (boolean) are required' }, { status: 400 });
    }

    const canonicalSkillId = toCanonicalSkillId(skillId);
    const variants = getSkillIdVariants(canonicalSkillId);

    const result = await prisma.agentSkill.updateMany({
      where: {
        userId: session.user.id,
        skillId: { in: variants },
      },
      data: { enabled },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Skill not found or not installed' }, { status: 404 });
    }

    await touchRunningAgentActivity(session.user.id).catch(() => {});

    await triggerAgentConfigReload(session.user.id).catch((err) => {
      console.warn('[agent/skills] config.reload failed after toggle:', err);
    });

    return NextResponse.json({ updated: true, skillId: canonicalSkillId, enabled });
  } catch (error) {
    console.error('Failed to toggle skill:', error);
    return NextResponse.json({ error: 'Failed to toggle skill' }, { status: 500 });
  }
}
