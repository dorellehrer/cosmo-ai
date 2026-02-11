/**
 * Next.js Instrumentation Hook
 *
 * Runs once when the server starts (both dev and production).
 * Used to start the Gateway WebSocket server on a dedicated port.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only start the Gateway WS server in the Node.js runtime
  // (not in Edge runtime, not during build)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const port = parseInt(process.env.GATEWAY_WS_PORT || '3001', 10);

    try {
      const { startGatewayWebSocketServer } = await import(
        '@/lib/gateway/ws-server'
      );
      await startGatewayWebSocketServer(port);
    } catch (err) {
      console.error('[Instrumentation] Failed to start Gateway WS server:', err);
    }
  }
}
