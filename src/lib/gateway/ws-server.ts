/**
 * Gateway Hub — WebSocket Server
 *
 * Two modes of operation:
 *
 * 1. attachGatewayWebSocket(httpServer) — noServer mode, shares an HTTP server.
 *    Handles upgrade requests to /api/gateway/ws.
 *
 * 2. startGatewayWebSocketServer(port) — standalone mode, creates its own
 *    HTTP server on the given port. Used by instrumentation.ts so we don't
 *    need to modify the Next.js standalone server.js.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer, type IncomingMessage, type Server } from 'http';
import { gatewayHub } from './hub';

let wss: WebSocketServer | null = null;
let standaloneServer: Server | null = null;

// ── Mode 1: Attach to an existing HTTP server ──────────────

/**
 * Attach the Gateway WebSocket server to an HTTP server.
 * Handles upgrade requests to /api/gateway/ws.
 */
export function attachGatewayWebSocket(server: Server) {
  if (wss) {
    console.log('[Gateway WS] Already attached, skipping');
    return wss;
  }

  wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket) => {
    gatewayHub.handleConnection(ws);
  });

  server.on('upgrade', (request: IncomingMessage, socket, head) => {
    const { pathname } = new URL(request.url || '/', `http://${request.headers.host}`);

    if (pathname === '/api/gateway/ws') {
      wss!.handleUpgrade(request, socket, head, (ws: WebSocket) => {
        wss!.emit('connection', ws, request);
      });
    }
    // Don't handle other upgrade paths — let Next.js HMR etc. pass through
  });

  console.log('[Gateway WS] WebSocket server attached on /api/gateway/ws');
  return wss;
}

// ── Mode 2: Standalone server on dedicated port ─────────────

/**
 * Start a standalone WebSocket server on its own port.
 * Used by instrumentation.ts to avoid modifying the Next.js server.
 *
 * The HTTP server also serves a /health endpoint for monitoring.
 */
export function startGatewayWebSocketServer(port: number): Promise<Server> {
  if (standaloneServer) {
    console.log('[Gateway WS] Standalone server already running, skipping');
    return Promise.resolve(standaloneServer);
  }

  return new Promise((resolve, reject) => {
    const httpServer = createServer((req, res) => {
      if (req.url === '/health') {
        const stats = gatewayHub.getStats();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', gateway: true, ...stats }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    wss = new WebSocketServer({ server: httpServer, path: '/ws' });

    wss.on('connection', (ws: WebSocket) => {
      gatewayHub.handleConnection(ws);
    });

    httpServer.on('error', (err) => {
      console.error('[Gateway WS] Server error:', err);
      reject(err);
    });

    httpServer.listen(port, '0.0.0.0', () => {
      console.log(`[Gateway WS] Standalone WebSocket server listening on port ${port}`);
      standaloneServer = httpServer;
      resolve(httpServer);
    });
  });
}

// ── Shared helpers ──────────────────────────────

/**
 * Get the WebSocket server instance (for testing/monitoring).
 */
export function getGatewayWss(): WebSocketServer | null {
  return wss;
}

/**
 * Gracefully shut down the standalone server if running.
 */
export async function stopGatewayWebSocketServer(): Promise<void> {
  if (standaloneServer) {
    await new Promise<void>((resolve) => standaloneServer!.close(() => resolve()));
    standaloneServer = null;
    wss = null;
    console.log('[Gateway WS] Standalone server stopped');
  }
}
