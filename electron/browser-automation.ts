/**
 * Browser Automation — Playwright-based browser control for the Electron desktop app.
 *
 * Uses `playwright-core` with the system-installed Chrome/Chromium to avoid
 * bundling a full browser. Falls back to searching common Chrome paths on macOS.
 *
 * Requires: npm install playwright-core
 *
 * Tool commands handled:
 *   browser.open     — Launch a persistent browser context
 *   browser.navigate — Navigate to a URL
 *   browser.snapshot — Get page text content / accessibility tree
 *   browser.click    — Click an element (by text, selector, or coordinates)
 *   browser.type     — Type text into a focused element or selector
 *   browser.screenshot — Take a full-page or element screenshot
 *   browser.close    — Close the browser
 */

import * as fs from 'fs';

// Dynamically imported types — playwright-core may not be installed
type Browser = import('playwright-core').Browser;
type BrowserContext = import('playwright-core').BrowserContext;
type Page = import('playwright-core').Page;

const CHROME_PATHS: Record<string, string[]> = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    String.raw`${process.env.LOCALAPPDATA}\Google\Chrome\Application\chrome.exe`,
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ],
};

export interface BrowserToolResult {
  success: boolean;
  data?: string;
  error?: string;
  screenshot?: string; // base64 PNG
}

export class BrowserAutomation {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private chromePath: string | null = null;

  constructor() {
    this.chromePath = this.findChrome();
  }

  /** Check if browser is currently open. */
  isOpen(): boolean {
    return this.browser !== null && this.browser.isConnected();
  }

  /** Launch the browser and open a URL. */
  async open(url?: string): Promise<BrowserToolResult> {
    try {
      const { chromium } = await import('playwright-core');

      if (!this.chromePath) {
        return { success: false, error: 'No Chrome/Chromium installation found on this system' };
      }

      if (this.browser?.isConnected()) {
        // Already open — just navigate
        if (url && this.page) {
          await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          return { success: true, data: `Navigated to ${url}` };
        }
        return { success: true, data: 'Browser already open' };
      }

      this.browser = await chromium.launch({
        executablePath: this.chromePath,
        headless: false,
        args: [
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-infobars',
        ],
      });

      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      });

      this.page = await this.context.newPage();

      if (url) {
        await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        return { success: true, data: `Browser opened at ${url}` };
      }

      return { success: true, data: 'Browser launched (no URL specified)' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Cannot find module')) {
        return { success: false, error: 'playwright-core not installed. Run: npm install playwright-core' };
      }
      return { success: false, error: `Failed to launch browser: ${msg}` };
    }
  }

  /** Navigate to a URL in the current page. */
  async navigate(url: string): Promise<BrowserToolResult> {
    if (!this.page) {
      return { success: false, error: 'Browser not open. Use browser.open first.' };
    }

    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const title = await this.page.title();
      return { success: true, data: `Navigated to "${title}" (${url})` };
    } catch (err) {
      return { success: false, error: `Navigation failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  /** Get a text snapshot of the current page. */
  async snapshot(): Promise<BrowserToolResult> {
    if (!this.page) {
      return { success: false, error: 'Browser not open. Use browser.open first.' };
    }

    try {
      const title = await this.page.title();
      const url = this.page.url();

      // Get a simplified text representation of the page
      const textContent = await this.page.evaluate(() => {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_ELEMENT,
          {
            acceptNode: (node) => {
              const el = node as HTMLElement;
              const tag = el.tagName.toLowerCase();
              // Skip hidden elements and scripts
              if (el.hidden || tag === 'script' || tag === 'style' || tag === 'noscript') {
                return NodeFilter.FILTER_REJECT;
              }
              const style = window.getComputedStyle(el);
              if (style.display === 'none' || style.visibility === 'hidden') {
                return NodeFilter.FILTER_REJECT;
              }
              return NodeFilter.FILTER_ACCEPT;
            },
          },
        );

        const elements: string[] = [];
        let node: Node | null = walker.currentNode;
        while (node) {
          const el = node as HTMLElement;
          const tag = el.tagName?.toLowerCase();
          const text = el.textContent?.trim().slice(0, 200);

          if (tag === 'a' && el instanceof HTMLAnchorElement) {
            elements.push(`[link: "${text}" → ${el.href}]`);
          } else if (tag === 'button') {
            elements.push(`[button: "${text}"]`);
          } else if (tag === 'input' && el instanceof HTMLInputElement) {
            elements.push(`[input ${el.type}: "${el.placeholder || el.name}" = "${el.value}"]`);
          } else if (tag === 'img' && el instanceof HTMLImageElement) {
            elements.push(`[image: "${el.alt || 'no alt'}"]`);
          } else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
            elements.push(`[${tag}: "${text}"]`);
          } else if (tag === 'p' && text) {
            elements.push(text);
          } else if (tag === 'li' && text) {
            elements.push(`• ${text}`);
          }

          node = walker.nextNode();
        }

        // Deduplicate and limit
        const seen = new Set<string>();
        return elements
          .filter((e) => {
            if (seen.has(e)) return false;
            seen.add(e);
            return true;
          })
          .slice(0, 150)
          .join('\n');
      });

      const snapshot = `Page: ${title}\nURL: ${url}\n\n${textContent}`;
      return { success: true, data: snapshot.slice(0, 8000) };
    } catch (err) {
      return { success: false, error: `Snapshot failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  /** Click an element by text content, CSS selector, or coordinates. */
  async click(target: string): Promise<BrowserToolResult> {
    if (!this.page) {
      return { success: false, error: 'Browser not open. Use browser.open first.' };
    }

    try {
      // Check if target looks like coordinates "x,y"
      const coordMatch = target.match(/^(\d+)\s*,\s*(\d+)$/);
      if (coordMatch) {
        const x = parseInt(coordMatch[1]);
        const y = parseInt(coordMatch[2]);
        await this.page.mouse.click(x, y);
        return { success: true, data: `Clicked at coordinates (${x}, ${y})` };
      }

      // Try text-based click first
      try {
        await this.page.getByText(target, { exact: false }).first().click({ timeout: 5000 });
        return { success: true, data: `Clicked element with text "${target}"` };
      } catch {
        // Fall back to CSS selector
        await this.page.click(target, { timeout: 5000 });
        return { success: true, data: `Clicked element "${target}"` };
      }
    } catch (err) {
      return { success: false, error: `Click failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  /** Type text into a focused element or a specific selector. */
  async type(text: string, selector?: string): Promise<BrowserToolResult> {
    if (!this.page) {
      return { success: false, error: 'Browser not open. Use browser.open first.' };
    }

    try {
      if (selector) {
        await this.page.fill(selector, text, { timeout: 5000 });
        return { success: true, data: `Typed "${text}" into "${selector}"` };
      } else {
        await this.page.keyboard.type(text, { delay: 30 });
        return { success: true, data: `Typed "${text}"` };
      }
    } catch (err) {
      return { success: false, error: `Type failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  /** Take a screenshot of the current page. */
  async screenshot(selector?: string): Promise<BrowserToolResult> {
    if (!this.page) {
      return { success: false, error: 'Browser not open. Use browser.open first.' };
    }

    try {
      let buffer: Buffer;
      if (selector) {
        const element = this.page.locator(selector).first();
        buffer = await element.screenshot({ type: 'png' }) as Buffer;
      } else {
        buffer = await this.page.screenshot({
          type: 'png',
          fullPage: false,
        }) as Buffer;
      }

      const base64 = buffer.toString('base64');
      return {
        success: true,
        data: `Screenshot captured (${buffer.length} bytes)`,
        screenshot: base64,
      };
    } catch (err) {
      return { success: false, error: `Screenshot failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  /** Close the browser. */
  async close(): Promise<BrowserToolResult> {
    try {
      if (this.page) {
        await this.page.close().catch(() => {});
        this.page = null;
      }
      if (this.context) {
        await this.context.close().catch(() => {});
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close().catch(() => {});
        this.browser = null;
      }
      return { success: true, data: 'Browser closed' };
    } catch (err) {
      return { success: false, error: `Close failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  // ── Chrome Discovery ───────────────────────────

  private findChrome(): string | null {
    const platform = process.platform;
    const candidates = CHROME_PATHS[platform] || [];

    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate)) {
          console.log(`[BrowserAutomation] Found Chrome: ${candidate}`);
          return candidate;
        }
      } catch {
        // Continue searching
      }
    }

    console.warn('[BrowserAutomation] No Chrome/Chromium found on system');
    return null;
  }
}
