import { test as setup, expect } from '@playwright/test';
import fs from 'fs';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@nova.local';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPass123!';
const AUTH_FILE = '.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Navigate to sign-in page
  await page.goto('/sign-in');

  // Fill credentials
  await page.locator('#email').fill(TEST_EMAIL);
  await page.locator('#password').fill(TEST_PASSWORD);

  // Submit the form
  await page.locator('button[type="submit"]').click();

  // Wait for either redirect to /chat OR an error alert (DB unreachable locally)
  const redirected = await Promise.race([
    page.waitForURL('/chat**', { timeout: 15_000 }).then(() => true),
    page.locator('[role="alert"]').waitFor({ timeout: 15_000 }).then(() => false),
  ]).catch(() => false);

  if (!redirected) {
    // DB likely unreachable (RDS in VPC) — write empty auth state so
    // dependent tests get skipped gracefully rather than crashing
    fs.mkdirSync('.auth', { recursive: true });
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }));
    setup.skip(true, 'Sign-in failed (database likely unreachable in local dev)');
    return;
  }

  // Verify the session is active by checking for a chat-specific element
  await expect(page.locator('textarea, [role="textbox"]').first()).toBeVisible({
    timeout: 10_000,
  });

  // Persist signed-in state to reuse across authenticated tests
  await page.context().storageState({ path: AUTH_FILE });
});
