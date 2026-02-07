import { test, expect } from '@playwright/test';
import { hasValidAuthState } from '../helpers';

test.beforeEach(async ({}, testInfo) => {
  if (!hasValidAuthState()) {
    testInfo.skip(true, 'No authenticated session (DB likely unreachable)');
  }
});

test.describe('Authenticated navigation', () => {
  test('authenticated user visiting /sign-in is redirected to /chat', async ({
    page,
  }) => {
    await page.goto('/sign-in');

    // Middleware should redirect authenticated users away from auth routes
    await page.waitForURL('**/chat**', { timeout: 10_000 });
    expect(page.url()).toContain('/chat');
  });

  test('authenticated user visiting /sign-up is redirected to /chat', async ({
    page,
  }) => {
    await page.goto('/sign-up');

    await page.waitForURL('**/chat**', { timeout: 10_000 });
    expect(page.url()).toContain('/chat');
  });

  test('can navigate between chat and settings', async ({ page }) => {
    await page.goto('/chat');

    // Navigate to settings
    const settingsLink = page.locator('a[href="/settings"]').first();
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await page.waitForURL('**/settings**');
      expect(page.url()).toContain('/settings');
    }
  });
});
