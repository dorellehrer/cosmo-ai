import { test, expect } from '@playwright/test';
import WebSocket from 'ws';
import { hasValidAuthState } from '../helpers';

test.beforeEach(async ({}, testInfo) => {
  if (!hasValidAuthState()) {
    testInfo.skip(true, 'No authenticated session (DB likely unreachable)');
  }
});

function withPath(baseEndpoint: string, path: string): string {
  const endpoint = new URL(baseEndpoint);
  endpoint.pathname = path;
  endpoint.search = '';
  endpoint.hash = '';
  return endpoint.toString();
}

async function registerGatewayDevice(request: import('@playwright/test').APIRequestContext) {
  const deviceName = `Gateway E2E ${Date.now()}`;
  const response = await request.post('/api/gateway/devices', {
    data: {
      name: deviceName,
      platform: 'web',
      capabilities: ['desktop', 'browser'],
    },
  });

  expect(response.status()).toBe(201);

  const body = await response.json();
  expect(body.wsEndpoint).toBeTruthy();
  expect(body.protocolVersion).toBeTruthy();
  expect(body.session?.token).toBeTruthy();
  expect(body.device?.id).toBeTruthy();

  return {
    deviceId: body.device.id as string,
    token: body.session.token as string,
    wsEndpoint: body.wsEndpoint as string,
  };
}

async function connectAndRegister(endpoint: string, token: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.terminate();
      reject(new Error(`Timed out waiting for ack from ${endpoint}`));
    }, 10_000);

    const socket = new WebSocket(endpoint);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.removeAllListeners();
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    };

    socket.on('open', () => {
      socket.send(
        JSON.stringify({
          type: 'register',
          payload: {
            token,
            platform: 'web',
            version: '1.0.0-e2e',
            capabilities: ['desktop', 'browser'],
          },
        })
      );
    });

    socket.on('message', (raw) => {
      try {
        const message = JSON.parse(raw.toString());
        if (message.type === 'ack') {
          cleanup();
          resolve();
        }
      } catch (error) {
        cleanup();
        reject(error);
      }
    });

    socket.on('error', (error) => {
      cleanup();
      reject(error);
    });

    socket.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

test.describe('Gateway API', () => {
  test('register device returns ws endpoint and protocol metadata', async ({ request }) => {
    const registered = await registerGatewayDevice(request);

    const statusResponse = await request.get('/api/gateway');
    expect(statusResponse.status()).toBe(200);

    const statusBody = await statusResponse.json();
    expect(statusBody.status).toBe('ok');
    expect(Array.isArray(statusBody.user?.devices)).toBe(true);

    const healthResponse = await request.get('/api/gateway/health');
    expect(healthResponse.status()).toBe(200);

    const healthBody = await healthResponse.json();
    expect(healthBody.status).toBe('healthy');
    expect(typeof healthBody.gateway?.dispatchQueue?.pending).toBe('number');
    expect(typeof healthBody.gateway?.dispatchQueue?.processing).toBe('number');
    expect(typeof healthBody.gateway?.dispatchQueue?.completedLastHour).toBe('number');
    expect(typeof healthBody.gateway?.dispatchQueue?.expiredLastHour).toBe('number');
    expect(typeof healthBody.gateway?.dispatchQueue?.failedLastHour).toBe('number');

    await request.delete(`/api/gateway/devices/${registered.deviceId}`);
  });

  test('websocket registration works on /ws and /api/gateway/ws', async ({ request }) => {
    const registered = await registerGatewayDevice(request);

    const wsPathEndpoint = withPath(registered.wsEndpoint, '/ws');
    await connectAndRegister(wsPathEndpoint, registered.token);

    const apiPathEndpoint = withPath(registered.wsEndpoint, '/api/gateway/ws');
    await connectAndRegister(apiPathEndpoint, registered.token);

    await request.delete(`/api/gateway/devices/${registered.deviceId}`);
  });
});
