import { prisma } from '@/lib/prisma';

export async function getCanonicalConversation(userId: string) {
  return prisma.conversation.findFirst({
    where: { userId },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function getOrCreateCanonicalConversation(userId: string) {
  const existing = await getCanonicalConversation(userId);
  if (existing) return existing;

  return prisma.conversation.create({
    data: { userId },
  });
}

export async function assertCanonicalConversation(userId: string, conversationId: string) {
  const canonical = await getOrCreateCanonicalConversation(userId);
  return {
    canonical,
    isCanonical: canonical.id === conversationId,
  };
}
