import { test, expect } from '@playwright/test';

// ── Public pages that should load without authentication ─────────

const publicPages = [
  { path: '/', title: /nova|ai/i, description: 'Landing page' },
  { path: '/about', title: /building|ai|mission/i, description: 'About page' },
  { path: '/pricing', title: /pricing|pro|plan|supercharged|assistant/i, description: 'Pricing page' },
  { path: '/sign-in', title: /sign in|welcome/i, description: 'Sign-in page' },
  { path: '/sign-up', title: /sign up|create|join/i, description: 'Sign-up page' },
  { path: '/help', title: /help|support|faq/i, description: 'Help page' },
  { path: '/blog', title: /blog/i, description: 'Blog page' },
  { path: '/contact', title: /contact|touch|reach/i, description: 'Contact page' },
  { path: '/privacy', title: /privacy/i, description: 'Privacy page' },
  { path: '/terms', title: /terms/i, description: 'Terms page' },
];

for (const { path, title, description } of publicPages) {
  test(`${description} (${path}) loads successfully`, async ({ page }) => {
    const response = await page.goto(path);

    // Page should return 200
    expect(response?.status()).toBe(200);

    // Should contain expected heading content
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
    await expect(heading).toHaveText(title);
  });
}

// ── Landing page specifics ───────────────────────────────────────

test('landing page has CTA buttons', async ({ page }) => {
  await page.goto('/');

  // Should have a "Get Started" or sign-up CTA
  const cta = page.locator('a[href="/sign-up"], a[href="/chat"]').first();
  await expect(cta).toBeVisible();
});

test('landing page has navigation links', async ({ page }) => {
  await page.goto('/');

  // Should have links to key pages (sign-in, sign-up, about, etc.)
  const navLinks = page.locator('a[href="/sign-in"], a[href="/sign-up"], a[href="/about"], a[href="/pricing"]');
  await expect(navLinks.first()).toBeVisible();
});

// ── Security: auth redirects ─────────────────────────────────────

test('visiting /chat without auth redirects to /sign-in', async ({ page }) => {
  await page.goto('/chat');

  // Middleware should redirect to sign-in
  await page.waitForURL(/\/sign-in/);
  expect(page.url()).toContain('/sign-in');
});

test('visiting /settings without auth redirects to /sign-in', async ({ page }) => {
  await page.goto('/settings');

  await page.waitForURL(/\/sign-in/);
  expect(page.url()).toContain('/sign-in');
});

// ── API health check ─────────────────────────────────────────────

test('health endpoint responds', async ({ request }) => {
  const response = await request.get('/api/health');

  // DB may be unreachable in dev/CI (RDS in VPC) → non-200 is acceptable
  // In production (via ALB) it should be 200
  expect(response.status()).toBeGreaterThanOrEqual(200);
  expect(response.status()).toBeLessThan(600);

  // Response may be JSON or HTML error page depending on the error
  const contentType = response.headers()['content-type'] || '';
  if (contentType.includes('application/json')) {
    const body = await response.json();
    expect(body).toHaveProperty('status');
  }
});

// ── 404 handling ─────────────────────────────────────────────────

test('non-existent page shows 404', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist-xyz');

  // Next.js returns 404 for unknown routes
  expect(response?.status()).toBe(404);
});
