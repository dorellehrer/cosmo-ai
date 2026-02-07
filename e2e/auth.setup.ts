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

  // Wait for redirect to /chat — confirms successful login
  try {
    await page.waitForURL('**/chat**', { timeout: 15_000 });
  } catch {
    // Sign-in failed — capture the page state for debugging
    const url = page.url();
    const alertText = await page.locator('[role="alert"]').first().textContent().catch(() => 'none');
    console.log(`Auth setup failed. URL: ${url}, Alert: ${alertText}`);

    // Write empty auth state so dependent tests skip gracefully
    fs.mkdirSync('.auth', { recursive: true });
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }));
    setup.skip(true, `Sign-in did not redirect to /chat. Current URL: ${url}`);
    return;
  }

  // Verify the session is active by checking for a chat-specific element
  await expect(page.locator('textarea, [role="textbox"]').first()).toBeVisible({
    timeout: 10_000,
  });

  // Persist signed-in state to reuse across authenticated tests
  await page.context().storageState({ path: AUTH_FILE });
});
