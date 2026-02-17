#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function assertInvariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function extractModelBlock(schema, modelName) {
  const modelStart = schema.indexOf(`model ${modelName} {`);
  if (modelStart === -1) return null;
  const rest = schema.slice(modelStart);
  const end = rest.indexOf('\n}\n');
  if (end === -1) return null;
  return rest.slice(0, end + 2);
}

async function run() {
  const root = process.cwd();
  const schemaPath = resolve(root, 'prisma/schema.prisma');
  const conversationRoutePath = resolve(root, 'src/app/api/conversations/[id]/route.ts');
  const conversationsListPath = resolve(root, 'src/app/api/conversations/route.ts');
  const chatRoutePath = resolve(root, 'src/app/api/chat/route.ts');

  const schema = await readFile(schemaPath, 'utf8');
  const conversationRoute = await readFile(conversationRoutePath, 'utf8');
  const conversationsListRoute = await readFile(conversationsListPath, 'utf8');
  const chatRoute = await readFile(chatRoutePath, 'utf8');

  const conversationModel = extractModelBlock(schema, 'Conversation');
  assertInvariant(conversationModel, 'Conversation model missing from prisma schema');

  assertInvariant(
    /@@unique\(\[userId\]\)/.test(conversationModel),
    'Conversation model must enforce @@unique([userId])',
  );

  assertInvariant(
    !/@@index\(\[userId\]\)/.test(conversationModel),
    'Conversation model must not include @@index([userId]) in single-chat mode',
  );

  assertInvariant(
    !/data\.pinned\s*=/.test(conversationRoute),
    'Conversation PATCH route must not write pinned state in single-chat mode',
  );

  assertInvariant(
    /getOrCreateCanonicalConversation/.test(conversationsListRoute),
    '/api/conversations route must resolve canonical conversation',
  );

  assertInvariant(
    /getOrCreateCanonicalConversation/.test(chatRoute),
    '/api/chat route must resolve canonical conversation',
  );

  console.log('[single-chat-invariants] PASS');
}

run().catch((error) => {
  console.error('[single-chat-invariants] FAIL:', error instanceof Error ? error.message : error);
  process.exit(1);
});
