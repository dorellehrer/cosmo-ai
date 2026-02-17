#!/usr/bin/env node

const baseUrl = process.env.GATEWAY_SMOKE_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
const providedSessionCookie = process.env.GATEWAY_SMOKE_COOKIE || '';
const testUserEmail = process.env.TEST_USER_EMAIL || '';
const testUserPassword = process.env.TEST_USER_PASSWORD || '';

function extractCookie(setCookieHeader, cookieNamePattern) {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(new RegExp(`(${cookieNamePattern}=[^;]+)`));
  return match ? match[1] : null;
}

async function getSessionCookie() {
  if (providedSessionCookie) {
    return providedSessionCookie;
  }

  if (!testUserEmail || !testUserPassword) {
    throw new Error('Missing auth input. Provide GATEWAY_SMOKE_COOKIE or TEST_USER_EMAIL + TEST_USER_PASSWORD.');
  }

  const csrfResponse = await fetch(new URL('/api/auth/csrf', baseUrl).toString(), {
    method: 'GET',
  });

  if (!csrfResponse.ok) {
    throw new Error(`Failed to fetch CSRF token (${csrfResponse.status})`);
  }

  const csrfJson = await csrfResponse.json();
  const csrfToken = csrfJson?.csrfToken;
  if (!csrfToken || typeof csrfToken !== 'string') {
    throw new Error('CSRF token missing from /api/auth/csrf');
  }

  const csrfCookie = extractCookie(
    csrfResponse.headers.get('set-cookie'),
    '(?:__Host-)?next-auth\\.csrf-token',
  );

  if (!csrfCookie) {
    throw new Error('CSRF cookie missing from /api/auth/csrf response');
  }

  const callbackUrl = new URL('/chat', baseUrl).toString();
  const body = new URLSearchParams({
    csrfToken,
    email: testUserEmail,
    password: testUserPassword,
    callbackUrl,
    json: 'true',
  });

  const loginResponse = await fetch(new URL('/api/auth/callback/credentials?json=true', baseUrl).toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: csrfCookie,
    },
    body,
    redirect: 'manual',
  });

  if (loginResponse.status >= 400) {
    throw new Error(`Credentials callback failed (${loginResponse.status})`);
  }

  const sessionCookie = extractCookie(
    loginResponse.headers.get('set-cookie'),
    '(?:__Secure-)?next-auth\\.session-token',
  );

  if (!sessionCookie) {
    throw new Error('Session cookie missing after credentials login');
  }

  return sessionCookie;
}

const randomSuffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const deviceName = `Gateway Smoke ${randomSuffix}`;

let createdDeviceId = null;
let activeHeaders = null;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, options = {}) {
  const url = new URL(path, baseUrl).toString();
  const response = await fetch(url, options);
  return response;
}

async function safeJson(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkHealth(headers) {
  const response = await request('/api/gateway/health', {
    method: 'GET',
    headers,
  });
  const body = await safeJson(response);

  assert(response.ok, `Health check failed (${response.status})`);
  assert(body?.status === 'healthy', 'Gateway health status is not healthy');
  assert(typeof body?.gateway?.dispatchQueue?.pending === 'number', 'dispatchQueue.pending missing');
  assert(typeof body?.gateway?.dispatchQueue?.processing === 'number', 'dispatchQueue.processing missing');
  assert(typeof body?.gateway?.dispatchQueue?.completedLastHour === 'number', 'dispatchQueue.completedLastHour missing');
  assert(typeof body?.gateway?.dispatchQueue?.expiredLastHour === 'number', 'dispatchQueue.expiredLastHour missing');
  assert(typeof body?.gateway?.dispatchQueue?.failedLastHour === 'number', 'dispatchQueue.failedLastHour missing');

  return body;
}

async function registerDevice(headers) {
  const response = await request('/api/gateway/devices', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: deviceName,
      platform: 'web',
      capabilities: ['desktop', 'browser'],
    }),
  });
  const body = await safeJson(response);

  assert(response.status === 201, `Device registration failed (${response.status})`);
  assert(typeof body?.device?.id === 'string' && body.device.id.length > 0, 'device.id missing');
  assert(typeof body?.wsEndpoint === 'string' && body.wsEndpoint.length > 0, 'wsEndpoint missing');
  assert(typeof body?.protocolVersion === 'string' && body.protocolVersion.length > 0, 'protocolVersion missing');
  assert(typeof body?.session?.token === 'string' && body.session.token.length > 0, 'session.token missing');

  createdDeviceId = body.device.id;
  return body;
}

async function checkGatewayStatus(headers, expectedDeviceId) {
  const attempts = 5;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await request('/api/gateway', {
      method: 'GET',
      headers,
    });
    const body = await safeJson(response);

    assert(response.ok, `Gateway status failed (${response.status})`);
    assert(body?.status === 'ok', 'Gateway status is not ok');
    assert(Array.isArray(body?.user?.devices), 'user.devices missing');

    if (body.user.devices.some((device) => device.deviceId === expectedDeviceId)) {
      return body;
    }

    if (attempt < attempts) {
      await wait(2000);
    }
  }

  throw new Error('Registered device not present in user.devices');
}

async function checkChatSurface(headers) {
  const response = await request('/api/conversations', {
    method: 'GET',
    headers,
  });
  const body = await safeJson(response);

  assert(response.ok, `Conversations check failed (${response.status})`);
  assert(Array.isArray(body), 'Conversations response is not an array');

  return body;
}

async function checkTrustSurface(headers) {
  const trustResponse = await request('/api/agent/trust', {
    method: 'GET',
    headers,
  });
  const trustBody = await safeJson(trustResponse);

  assert(trustResponse.ok, `Trust check failed (${trustResponse.status})`);
  assert(typeof trustBody?.mode === 'string', 'Trust mode missing from /api/agent/trust');
  assert(Array.isArray(trustBody?.contacts), 'Trust contacts missing from /api/agent/trust');

  const eventsResponse = await request('/api/agent/trust/events?hours=24', {
    method: 'GET',
    headers,
  });
  const eventsBody = await safeJson(eventsResponse);

  assert(eventsResponse.ok, `Trust events check failed (${eventsResponse.status})`);
  assert(typeof eventsBody?.windowHours === 'number', 'windowHours missing from trust events response');
  assert(typeof eventsBody?.totalBlocked === 'number', 'totalBlocked missing from trust events response');
  assert(Array.isArray(eventsBody?.byChannel), 'byChannel missing from trust events response');
  assert(Array.isArray(eventsBody?.recent), 'recent missing from trust events response');

  return {
    mode: trustBody.mode,
    contacts: trustBody.contacts.length,
    blockedLast24h: eventsBody.totalBlocked,
  };
}

async function cleanupDevice() {
  if (!createdDeviceId) return;
  if (!activeHeaders) return;

  const response = await request(`/api/gateway/devices/${createdDeviceId}`, {
    method: 'DELETE',
    headers: activeHeaders,
  });

  if (!response.ok) {
    const body = await safeJson(response);
    console.warn(`[gateway-smoke] Device cleanup failed (${response.status})`, body);
  }
}

async function run() {
  console.log(`[gateway-smoke] Base URL: ${baseUrl}`);

  const sessionCookie = await getSessionCookie();
  const headers = {
    'Content-Type': 'application/json',
    Cookie: sessionCookie,
  };
  activeHeaders = headers;

  const health = await checkHealth(headers);
  console.log('[gateway-smoke] Health OK', {
    pending: health.gateway.dispatchQueue.pending,
    processing: health.gateway.dispatchQueue.processing,
    completedLastHour: health.gateway.dispatchQueue.completedLastHour,
    expiredLastHour: health.gateway.dispatchQueue.expiredLastHour,
    failedLastHour: health.gateway.dispatchQueue.failedLastHour,
  });

  const registration = await registerDevice(headers);
  console.log('[gateway-smoke] Device registered', {
    deviceId: registration.device.id,
    wsEndpoint: registration.wsEndpoint,
    protocolVersion: registration.protocolVersion,
  });

  await checkGatewayStatus(headers, registration.device.id);
  console.log('[gateway-smoke] Gateway status OK');

  const conversations = await checkChatSurface(headers);
  console.log('[gateway-smoke] Chat surface OK', {
    conversations: conversations.length,
  });

  const trust = await checkTrustSurface(headers);
  console.log('[gateway-smoke] Trust surface OK', trust);
}

try {
  await run();
  console.log('[gateway-smoke] PASS');
  await cleanupDevice();
  process.exit(0);
} catch (error) {
  console.error('[gateway-smoke] FAIL:', error instanceof Error ? error.message : error);
  await cleanupDevice();
  process.exit(1);
}
