/**
 * Nova AI Agent — Per-User Isolated Container
 *
 * This is the main entry point for the agent container that runs on AWS ECS Fargate.
 * Each user gets their own instance with:
 * - Isolated filesystem and sessions
 * - Own AI model connection (API key from Secrets Manager)
 * - WebSocket control plane for real-time communication
 * - HTTP health check endpoint
 * - Persistent memory via PostgreSQL
 * - Heartbeat system for proactive outreach
 */

import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import http from 'http';
import pg from 'pg';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

// ──────────────────────────────────────────────
// Configuration from environment
// ──────────────────────────────────────────────

const config = {
  agentId: process.env.NOVA_AGENT_ID || 'local',
  userId: process.env.NOVA_USER_ID || 'local',
  port: parseInt(process.env.PORT || '18789'),
  healthPort: parseInt(process.env.HEALTH_PORT || '18790'),
  dataDir: process.env.DATA_DIR || '/data',
  modelProvider: process.env.MODEL_PROVIDER || 'openai',
  modelName: process.env.MODEL_NAME || 'gpt-4o-mini',
  agentName: process.env.AGENT_NAME || 'Nova',
  personality: process.env.AGENT_PERSONALITY || 'friendly',
  databaseUrl: process.env.DATABASE_URL || '',
};

// ──────────────────────────────────────────────
// PostgreSQL client for memory persistence
// ──────────────────────────────────────────────

const pool = config.databaseUrl
  ? new pg.Pool({ connectionString: config.databaseUrl, max: 3 })
  : null;

// ──────────────────────────────────────────────
// AI Model Client
// ──────────────────────────────────────────────

let aiClient: OpenAI;

/**
 * Fetch the user's API key from AWS Secrets Manager at startup.
 * Falls back to environment variable for local development.
 */
async function initializeAIClient(): Promise<void> {
  const secretArn = process.env.API_KEY_SECRET_ARN;
  let apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY || '';

  if (secretArn && secretArn !== '') {
    try {
      const smClient = new SecretsManagerClient({
        region: process.env.AWS_REGION || 'eu-north-1',
      });
      const result = await smClient.send(
        new GetSecretValueCommand({ SecretId: secretArn })
      );
      if (result.SecretString) {
        const parsed = JSON.parse(result.SecretString);
        apiKey = parsed.apiKey || result.SecretString;
      }
      console.log('✅ API key loaded from Secrets Manager');
    } catch (error) {
      console.error('⚠️ Failed to fetch API key from Secrets Manager, falling back to env var:', error);
    }
  }

  aiClient = new OpenAI({
    apiKey: apiKey || 'placeholder',
  });
}

// ──────────────────────────────────────────────
// System Prompt
// ──────────────────────────────────────────────

function getSystemPrompt(): string {
  return `You are ${config.agentName}, a personal AI assistant. Your personality is: ${config.personality}.

Key capabilities:
- You are a persistent, always-available assistant that runs 24/7
- You remember context from previous conversations via your memory system
- You can be reached through multiple channels (WhatsApp, Telegram, Discord, etc.)
- You can proactively check in with your user via heartbeat messages
- You have access to skills/tools that extend your capabilities

Core traits:
- You're genuinely helpful, not performatively helpful
- You have personality - be ${config.personality}
- You're concise but thorough when needed
- You anticipate needs and offer proactive suggestions
- You remember everything about your user and their preferences

When you learn something important about your user (preferences, facts, tasks), 
note it so it can be saved to your long-term memory.`;
}

// ──────────────────────────────────────────────
// Memory System
// ──────────────────────────────────────────────

interface MemoryEntry {
  content: string;
  category: 'general' | 'preference' | 'task' | 'fact';
}

const memoryBuffer: MemoryEntry[] = [];

async function flushMemory(): Promise<void> {
  if (!pool || memoryBuffer.length === 0) return;

  const today = new Date().toISOString().split('T')[0];
  const entries = memoryBuffer.splice(0, memoryBuffer.length);

  for (const entry of entries) {
    try {
      await pool.query(
        `INSERT INTO "AgentMemory" (id, "userId", date, content, category, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          crypto.randomUUID(),
          config.userId,
          today,
          entry.content,
          entry.category,
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      );
    } catch (error) {
      console.error('Failed to flush memory:', error);
    }
  }
}

// Flush memory every 30 seconds
setInterval(flushMemory, 30_000);

// ──────────────────────────────────────────────
// Session Management
// ──────────────────────────────────────────────

interface Session {
  key: string;
  messages: ChatCompletionMessageParam[];
  lastActive: Date;
}

const sessions = new Map<string, Session>();

function getOrCreateSession(key: string): Session {
  let session = sessions.get(key);
  if (!session) {
    session = {
      key,
      messages: [],
      lastActive: new Date(),
    };
    sessions.set(key, session);
  }
  session.lastActive = new Date();
  return session;
}

// ──────────────────────────────────────────────
// AI Chat Handler
// ──────────────────────────────────────────────

async function handleMessage(
  sessionKey: string,
  userMessage: string
): Promise<string> {
  const session = getOrCreateSession(sessionKey);

  session.messages.push({ role: 'user', content: userMessage });

  // Keep last 50 messages for context window management
  if (session.messages.length > 50) {
    // TODO: Compact/summarize older messages before dropping
    session.messages = session.messages.slice(-50);
  }

  try {
    const response = await aiClient.chat.completions.create({
      model: config.modelName,
      messages: [
        { role: 'system', content: getSystemPrompt() },
        ...session.messages,
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const assistantMessage = response.choices[0]?.message?.content || 'I had trouble responding. Please try again.';
    session.messages.push({ role: 'assistant', content: assistantMessage });

    return assistantMessage;
  } catch (error) {
    console.error('AI response error:', error);
    return 'I encountered an error processing your message. Please check the agent logs.';
  }
}

// ──────────────────────────────────────────────
// WebSocket Control Plane (port 18789)
// ──────────────────────────────────────────────

const wss = new WebSocketServer({ port: config.port });

wss.on('connection', (ws: WebSocket) => {
  console.log('Control plane client connected');

  ws.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'chat': {
          const sessionKey = message.sessionKey || 'default';
          const response = await handleMessage(sessionKey, message.content);
          ws.send(JSON.stringify({ type: 'response', content: response, sessionKey }));
          break;
        }

        case 'status': {
          ws.send(JSON.stringify({
            type: 'status',
            agentId: config.agentId,
            name: config.agentName,
            uptime: process.uptime(),
            sessions: sessions.size,
            memoryBuffer: memoryBuffer.length,
          }));
          break;
        }

        case 'memory.add': {
          memoryBuffer.push({
            content: message.content,
            category: message.category || 'general',
          });
          ws.send(JSON.stringify({ type: 'ack', action: 'memory.add' }));
          break;
        }

        case 'session.list': {
          const sessionList = Array.from(sessions.entries()).map(([key, s]) => ({
            key,
            messageCount: s.messages.length,
            lastActive: s.lastActive.toISOString(),
          }));
          ws.send(JSON.stringify({ type: 'sessions', sessions: sessionList }));
          break;
        }

        case 'session.clear': {
          const sessionKey = message.sessionKey;
          if (sessionKey) {
            sessions.delete(sessionKey);
          } else {
            sessions.clear();
          }
          ws.send(JSON.stringify({ type: 'ack', action: 'session.clear' }));
          break;
        }

        default:
          ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${message.type}` }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to process message' }));
    }
  });

  ws.on('close', () => {
    console.log('Control plane client disconnected');
  });
});

// ──────────────────────────────────────────────
// HTTP Health Check Server (port 18790)
// ──────────────────────────────────────────────

const healthApp = express();

healthApp.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    agentId: config.agentId,
    userId: config.userId,
    uptime: process.uptime(),
    sessions: sessions.size,
    model: `${config.modelProvider}/${config.modelName}`,
    timestamp: new Date().toISOString(),
  });
});

healthApp.get('/metrics', (_req, res) => {
  res.json({
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    sessions: sessions.size,
    memoryBufferSize: memoryBuffer.length,
  });
});

const healthServer = http.createServer(healthApp);
healthServer.listen(config.healthPort, () => {
  console.log(`Health check server on port ${config.healthPort}`);
});

// ──────────────────────────────────────────────
// Startup
// ──────────────────────────────────────────────

async function main() {
  // Initialize AI client (fetches API key from Secrets Manager in production)
  await initializeAIClient();

  console.log(`
╔══════════════════════════════════════════╗
║         🌟 Nova AI Agent 🌟            ║
╠══════════════════════════════════════════╣
║  Agent ID:   ${config.agentId.padEnd(27)}║
║  User ID:    ${config.userId.padEnd(27)}║
║  Model:      ${(config.modelProvider + '/' + config.modelName).padEnd(27)}║
║  Name:       ${config.agentName.padEnd(27)}║
║  WS Port:    ${String(config.port).padEnd(27)}║
║  Health Port: ${String(config.healthPort).padEnd(26)}║
╚══════════════════════════════════════════╝
  `);
}

main().catch((err) => {
  console.error('Fatal: Agent failed to start:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await flushMemory();
  await pool?.end();
  wss.close();
  healthServer.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  await flushMemory();
  await pool?.end();
  wss.close();
  healthServer.close();
  process.exit(0);
});
