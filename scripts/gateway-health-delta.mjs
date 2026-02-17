#!/usr/bin/env node

const baseUrl = process.env.GATEWAY_SMOKE_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
const providedSessionCookie = process.env.GATEWAY_SMOKE_COOKIE || '';
const testUserEmail = process.env.TEST_USER_EMAIL || '';
const testUserPassword = process.env.TEST_USER_PASSWORD || '';

const sampleSeconds = Math.max(Number.parseInt(process.env.GATEWAY_DELTA_SAMPLE_SECONDS || '30', 10), 1);
const expectedCompletedInc = Number.parseInt(process.env.GATEWAY_EXPECT_COMPLETED_INC || '0', 10);
const expectedExpiredInc = Number.parseInt(process.env.GATEWAY_EXPECT_EXPIRED_INC || '0', 10);
const expectedFailedInc = Number.parseInt(process.env.GATEWAY_EXPECT_FAILED_INC || '0', 10);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractCookie(setCookieHeader, cookieNamePattern) {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(new RegExp(`(${cookieNamePattern}=[^;]+)`));
  return match ? match[1] : null;
}

async function getSessionCookie() {
  if (providedSessionCookie) return providedSessionCookie;

  if (!testUserEmail || !testUserPassword) {
    throw new Error('Missing auth input. Provide GATEWAY_SMOKE_COOKIE or TEST_USER_EMAIL + TEST_USER_PASSWORD.');
  }

  const csrfResponse = await fetch(new URL('/api/auth/csrf', baseUrl).toString(), { method: 'GET' });
  assert(csrfResponse.ok, `Failed to fetch CSRF token (${csrfResponse.status})`);

  const csrfJson = await csrfResponse.json();
  const csrfToken = csrfJson?.csrfToken;
  assert(typeof csrfToken === 'string' && csrfToken.length > 0, 'CSRF token missing from /api/auth/csrf');

  const csrfCookie = extractCookie(csrfResponse.headers.get('set-cookie'), '(?:__Host-)?next-auth\\.csrf-token');
  assert(csrfCookie, 'CSRF cookie missing from /api/auth/csrf response');

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

  assert(loginResponse.status < 400, `Credentials callback failed (${loginResponse.status})`);

  const sessionCookie = extractCookie(
    loginResponse.headers.get('set-cookie'),
    '(?:__Secure-)?next-auth\\.session-token',
  );

  assert(sessionCookie, 'Session cookie missing after credentials login');
  return sessionCookie;
}

async function fetchGatewayHealth(headers) {
  const response = await fetch(new URL('/api/gateway/health', baseUrl).toString(), {
    method: 'GET',
    headers,
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  assert(response.ok, `Gateway health request failed (${response.status})`);
  assert(body?.status === 'healthy', 'Gateway health status is not healthy');

  const queue = body?.gateway?.dispatchQueue;
  assert(queue, 'dispatchQueue missing from gateway health response');

  for (const key of ['pending', 'processing', 'completedLastHour', 'expiredLastHour', 'failedLastHour']) {
    assert(typeof queue[key] === 'number', `dispatchQueue.${key} missing or non-numeric`);
  }

  return {
    timestamp: body.timestamp,
    pending: queue.pending,
    processing: queue.processing,
    completedLastHour: queue.completedLastHour,
    expiredLastHour: queue.expiredLastHour,
    failedLastHour: queue.failedLastHour,
  };
}

function computeDelta(before, after) {
  return {
    pending: after.pending - before.pending,
    processing: after.processing - before.processing,
    completedLastHour: after.completedLastHour - before.completedLastHour,
    expiredLastHour: after.expiredLastHour - before.expiredLastHour,
    failedLastHour: after.failedLastHour - before.failedLastHour,
  };
}

function validateExpectations(delta) {
  if (expectedCompletedInc > 0 && delta.completedLastHour < expectedCompletedInc) {
    throw new Error(`Expected completedLastHour to increase by at least ${expectedCompletedInc}, got ${delta.completedLastHour}`);
  }

  if (expectedExpiredInc > 0 && delta.expiredLastHour < expectedExpiredInc) {
    throw new Error(`Expected expiredLastHour to increase by at least ${expectedExpiredInc}, got ${delta.expiredLastHour}`);
  }

  if (expectedFailedInc > 0 && delta.failedLastHour < expectedFailedInc) {
    throw new Error(`Expected failedLastHour to increase by at least ${expectedFailedInc}, got ${delta.failedLastHour}`);
  }
}

async function run() {
  console.log(`[gateway-delta] Base URL: ${baseUrl}`);
  console.log(`[gateway-delta] Sampling window: ${sampleSeconds}s`);

  const sessionCookie = await getSessionCookie();
  const headers = {
    'Content-Type': 'application/json',
    Cookie: sessionCookie,
  };

  const before = await fetchGatewayHealth(headers);
  console.log('[gateway-delta] Before', before);

  await sleep(sampleSeconds * 1000);

  const after = await fetchGatewayHealth(headers);
  console.log('[gateway-delta] After', after);

  const delta = computeDelta(before, after);
  console.log('[gateway-delta] Delta', delta);

  validateExpectations(delta);
  console.log('[gateway-delta] PASS');
}

run().catch((error) => {
  console.error('[gateway-delta] FAIL:', error instanceof Error ? error.message : error);
  process.exit(1);
});
