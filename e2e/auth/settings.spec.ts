import { test, expect } from '@playwright/test';
import { hasValidAuthState } from '../helpers';

test.beforeEach(async ({}, testInfo) => {
  if (!hasValidAuthState()) {
    testInfo.skip(true, 'No authenticated session (DB likely unreachable)');
  }
});

test.describe('Settings', () => {
  test('settings page loads', async ({ page }) => {
    await page.goto('/settings');

    // Should see a settings heading
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test('settings page has user profile section', async ({ page }) => {
    await page.goto('/settings');

    // Should show user-related info (email, name, etc.)
    await expect(
      page.getByText(/profile|account|email/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('settings page has subscription/billing info', async ({ page }) => {
    await page.goto('/settings');

    // Should show plan/billing section
    await expect(
      page.getByText(/plan|subscription|billing|free|pro/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
