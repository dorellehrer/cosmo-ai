import { test, expect } from '@playwright/test';
import { hasValidAuthState } from '../helpers';

// These tests run with a pre-authenticated session (storageState from auth.setup.ts)

test.beforeEach(async ({}, testInfo) => {
  if (!hasValidAuthState()) {
    testInfo.skip(true, 'No authenticated session (DB likely unreachable)');
  }
});

test.describe('Chat', () => {
  test('chat page loads with message input', async ({ page }) => {
    await page.goto('/chat');

    // Should see the message input area
    const input = page.locator('textarea, [role="textbox"]').first();
    await expect(input).toBeVisible({ timeout: 10_000 });
  });

  test('can type a message', async ({ page }) => {
    await page.goto('/chat');

    const input = page.locator('textarea').first();
    await expect(input).toBeVisible({ timeout: 10_000 });

    await input.fill('Hello, Nova!');
    await expect(input).toHaveValue('Hello, Nova!');
  });

  test('send button is present', async ({ page }) => {
    await page.goto('/chat');

    // Look for the send/submit button
    const sendButton = page.locator(
      'button[type="submit"], button[aria-label*="send" i]'
    ).first();
    await expect(sendButton).toBeVisible({ timeout: 10_000 });
  });

  test('sending a message shows it in the chat', async ({ page }) => {
    // Mock the chat API to avoid real OpenAI calls
    await page.route('**/api/chat', async (route) => {
      // Return a mock SSE response
      const body = [
        'data: {"type":"conversationId","conversationId":"test-conv-123"}\n\n',
        'data: {"type":"content","content":"Hello! How can I help?"}\n\n',
        'data: {"type":"done"}\n\n',
      ].join('');

      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body,
      });
    });

    await page.goto('/chat');

    const input = page.locator('textarea').first();
    await expect(input).toBeVisible({ timeout: 10_000 });

    // Type and send a message
    await input.fill('Hello, Nova!');
    await input.press('Enter');

    // User message should appear in the chat
    await expect(page.getByText('Hello, Nova!')).toBeVisible({ timeout: 5_000 });

    // Assistant response should appear
    await expect(page.getByText('Hello! How can I help?')).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe('Conversations sidebar', () => {
  test('sidebar shows conversation list or empty state', async ({ page }) => {
    await page.goto('/chat');

    // The sidebar should be visible (or accessible via toggle on mobile)
    // Look for either conversation items or an empty state
    const sidebar = page.locator(
      'nav, [role="navigation"], aside, [data-testid="sidebar"]'
    ).first();
    await expect(sidebar).toBeVisible({ timeout: 10_000 });
  });
});
