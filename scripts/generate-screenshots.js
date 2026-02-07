#!/usr/bin/env node
/**
 * Generates PWA screenshots for manifest.json
 * Creates desktop (1280x720) and mobile (390x844) mockup images
 * using sharp with raw pixel compositing — no Pango/font rendering needed.
 *
 * Usage: node scripts/generate-screenshots.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'screenshots');

// Nova brand colors
const VIOLET = { r: 139, g: 92, b: 246 };
const FUCHSIA = { r: 217, g: 70, b: 239 };
const BG_DARK = { r: 10, g: 10, b: 26 };
const SURFACE = { r: 17, g: 17, b: 30 };

/**
 * Create a gradient rectangle as a raw buffer
 */
function createGradientRect(w, h, colorFrom, colorTo) {
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = x / w; // horizontal gradient
      const idx = (y * w + x) * 4;
      buf[idx] = Math.round(colorFrom.r + (colorTo.r - colorFrom.r) * t);
      buf[idx + 1] = Math.round(colorFrom.g + (colorTo.g - colorFrom.g) * t);
      buf[idx + 2] = Math.round(colorFrom.b + (colorTo.b - colorFrom.b) * t);
      buf[idx + 3] = 255;
    }
  }
  return buf;
}

/**
 * Create a solid color rectangle
 */
function createSolidRect(w, h, color, alpha = 255) {
  const buf = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    buf[idx] = color.r;
    buf[idx + 1] = color.g;
    buf[idx + 2] = color.b;
    buf[idx + 3] = alpha;
  }
  return buf;
}

/**
 * Create a circle as raw RGBA
 */
function createCircle(diameter, color) {
  const r = diameter / 2;
  const buf = Buffer.alloc(diameter * diameter * 4);
  for (let y = 0; y < diameter; y++) {
    for (let x = 0; x < diameter; x++) {
      const dx = x - r + 0.5;
      const dy = y - r + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * diameter + x) * 4;
      if (dist <= r) {
        // Gradient fill
        const t = x / diameter;
        buf[idx] = Math.round(VIOLET.r + (FUCHSIA.r - VIOLET.r) * t);
        buf[idx + 1] = Math.round(VIOLET.g + (FUCHSIA.g - VIOLET.g) * t);
        buf[idx + 2] = Math.round(VIOLET.b + (FUCHSIA.b - VIOLET.b) * t);
        // Anti-alias at edge
        const edgeDist = r - dist;
        buf[idx + 3] = edgeDist < 1 ? Math.round(edgeDist * 255) : 255;
      } else {
        buf[idx + 3] = 0;
      }
    }
  }
  return buf;
}

async function generateDesktop() {
  const W = 1280, H = 720;

  // Background: dark gradient
  const bg = createSolidRect(W, H, BG_DARK);

  // Add a subtle purple glow in the center
  const glowBuf = Buffer.alloc(W * H * 4);
  const cx = W / 2, cy = H / 2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x - cx) / W;
      const dy = (y - cy) / H;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * W + x) * 4;
      if (dist < 0.5) {
        const intensity = Math.round((1 - dist * 2) * 30);
        glowBuf[idx] = 30 + intensity;    // r (purple tint)
        glowBuf[idx + 1] = 10;
        glowBuf[idx + 2] = 68 + intensity; // b
        glowBuf[idx + 3] = intensity * 3;
      }
    }
  }

  // Sidebar
  const sidebar = createSolidRect(260, H, SURFACE, 200);

  // Sidebar separator line
  const sepLine = createSolidRect(1, H, { r: 255, g: 255, b: 255 }, 25);

  // Chat bubbles
  const userBubble = createGradientRect(320, 48, VIOLET, FUCHSIA);
  const cosmoBubble1 = createSolidRect(440, 72, SURFACE, 230);
  const cosmoBubble2 = createSolidRect(520, 160, SURFACE, 230);

  // Avatar circles
  const avatar = createCircle(36, VIOLET);

  // New Chat button
  const newChatBtn = createGradientRect(228, 40, VIOLET, FUCHSIA);

  // Conversation highlight
  const convHighlight = createSolidRect(228, 44, { r: 255, g: 255, b: 255 }, 20);

  // Conversation items (dimmer)
  const convItem = createSolidRect(180, 12, { r: 255, g: 255, b: 255 }, 60);
  const convItem2 = createSolidRect(150, 12, { r: 255, g: 255, b: 255 }, 40);
  const convItem3 = createSolidRect(160, 12, { r: 255, g: 255, b: 255 }, 40);

  // Input bar
  const inputBar = createSolidRect(740, 56, SURFACE, 220);
  const sendBtn = createCircle(40, VIOLET);

  // Suggestion chips
  const chip = createSolidRect(140, 36, { r: 255, g: 255, b: 255 }, 12);

  // Compose the image
  const image = await sharp(bg, { raw: { width: W, height: H, channels: 4 } })
    .composite([
      // Purple glow
      { input: glowBuf, raw: { width: W, height: H, channels: 4 }, blend: 'over', top: 0, left: 0 },
      // Sidebar
      { input: sidebar, raw: { width: 260, height: H, channels: 4 }, blend: 'over', top: 0, left: 0 },
      { input: sepLine, raw: { width: 1, height: H, channels: 4 }, blend: 'over', top: 0, left: 260 },
      // Logo circle in sidebar
      { input: createCircle(32, VIOLET), raw: { width: 32, height: 32, channels: 4 }, blend: 'over', top: 16, left: 20 },
      // "Nova" text bar (white rect)
      { input: createSolidRect(60, 16, { r: 255, g: 255, b: 255 }, 200), raw: { width: 60, height: 16, channels: 4 }, blend: 'over', top: 24, left: 62 },
      // New Chat button
      { input: newChatBtn, raw: { width: 228, height: 40, channels: 4 }, blend: 'over', top: 64, left: 16 },
      // Conversation highlight
      { input: convHighlight, raw: { width: 228, height: 44, channels: 4 }, blend: 'over', top: 120, left: 16 },
      { input: convItem, raw: { width: 180, height: 12, channels: 4 }, blend: 'over', top: 136, left: 32 },
      // More conversation items
      { input: convItem2, raw: { width: 150, height: 12, channels: 4 }, blend: 'over', top: 188, left: 32 },
      { input: convItem3, raw: { width: 160, height: 12, channels: 4 }, blend: 'over', top: 240, left: 32 },
      { input: createSolidRect(140, 12, { r: 255, g: 255, b: 255 }, 30), raw: { width: 140, height: 12, channels: 4 }, blend: 'over', top: 292, left: 32 },
      // Chat area: Nova greeting
      { input: avatar, raw: { width: 36, height: 36, channels: 4 }, blend: 'over', top: 102, left: 296 },
      { input: cosmoBubble1, raw: { width: 440, height: 72, channels: 4 }, blend: 'over', top: 94, left: 344 },
      // Text lines inside bubble (simulated as white bars)
      { input: createSolidRect(200, 12, { r: 255, g: 255, b: 255 }, 180), raw: { width: 200, height: 12, channels: 4 }, blend: 'over', top: 112, left: 360 },
      { input: createSolidRect(380, 10, { r: 255, g: 255, b: 255 }, 100), raw: { width: 380, height: 10, channels: 4 }, blend: 'over', top: 134, left: 360 },
      // User message
      { input: userBubble, raw: { width: 320, height: 48, channels: 4 }, blend: 'over', top: 200, left: 700 },
      { input: createSolidRect(260, 12, { r: 255, g: 255, b: 255 }, 220), raw: { width: 260, height: 12, channels: 4 }, blend: 'over', top: 218, left: 730 },
      // Nova response
      { input: avatar, raw: { width: 36, height: 36, channels: 4 }, blend: 'over', top: 282, left: 296 },
      { input: cosmoBubble2, raw: { width: 520, height: 160, channels: 4 }, blend: 'over', top: 270, left: 344 },
      // Response text lines
      { input: createSolidRect(300, 12, { r: 255, g: 255, b: 255 }, 180), raw: { width: 300, height: 12, channels: 4 }, blend: 'over', top: 290, left: 360 },
      { input: createSolidRect(340, 10, { r: 255, g: 255, b: 255 }, 100), raw: { width: 340, height: 10, channels: 4 }, blend: 'over', top: 314, left: 360 },
      { input: createSolidRect(280, 10, { r: 255, g: 255, b: 255 }, 100), raw: { width: 280, height: 10, channels: 4 }, blend: 'over', top: 336, left: 360 },
      { input: createSolidRect(320, 10, { r: 255, g: 255, b: 255 }, 100), raw: { width: 320, height: 10, channels: 4 }, blend: 'over', top: 358, left: 360 },
      { input: createSolidRect(200, 10, VIOLET, 200), raw: { width: 200, height: 10, channels: 4 }, blend: 'over', top: 390, left: 360 },
      // Suggestion chips
      { input: chip, raw: { width: 140, height: 36, channels: 4 }, blend: 'over', top: 460, left: 344 },
      { input: chip, raw: { width: 140, height: 36, channels: 4 }, blend: 'over', top: 460, left: 496 },
      { input: chip, raw: { width: 140, height: 36, channels: 4 }, blend: 'over', top: 460, left: 648 },
      // Input bar at bottom
      { input: inputBar, raw: { width: 740, height: 56, channels: 4 }, blend: 'over', top: H - 80, left: 296 },
      { input: createSolidRect(200, 12, { r: 255, g: 255, b: 255 }, 60), raw: { width: 200, height: 12, channels: 4 }, blend: 'over', top: H - 58, left: 330 },
      { input: sendBtn, raw: { width: 40, height: 40, channels: 4 }, blend: 'over', top: H - 72, left: 980 },
    ])
    .png()
    .toFile(path.join(OUTPUT_DIR, 'desktop.png'));

  console.log('✅ Generated public/screenshots/desktop.png (1280×720)');
}

async function generateMobile() {
  const W = 390, H = 844;

  const bg = createSolidRect(W, H, BG_DARK);

  // Purple glow
  const glow = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x - W / 2) / W;
      const dy = (y - H / 3) / H;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * W + x) * 4;
      if (dist < 0.4) {
        const intensity = Math.round((1 - dist * 2.5) * 25);
        glow[idx] = 30 + intensity;
        glow[idx + 1] = 10;
        glow[idx + 2] = 68 + intensity;
        glow[idx + 3] = intensity * 3;
      }
    }
  }

  // Header bar
  const header = createSolidRect(W, 56, SURFACE, 180);
  const headerLogo = createCircle(28, VIOLET);

  // Avatars
  const smallAvatar = createCircle(32, VIOLET);

  // Chat bubbles
  const cosmoBubble1 = createSolidRect(280, 64, SURFACE, 220);
  const userBubble = createGradientRect(266, 44, VIOLET, FUCHSIA);
  const cosmoBubble2 = createSolidRect(304, 140, SURFACE, 220);
  const userBubble2 = createGradientRect(256, 44, VIOLET, FUCHSIA);
  const cosmoBubble3 = createSolidRect(280, 60, SURFACE, 220);

  // Suggestion chips
  const chipSmall = createSolidRect(130, 32, { r: 255, g: 255, b: 255 }, 12);

  // Input bar
  const inputBar = createSolidRect(W - 32, 50, SURFACE, 200);
  const sendBtn = createCircle(36, VIOLET);

  // Home indicator
  const homeInd = createSolidRect(120, 4, { r: 255, g: 255, b: 255 }, 76);

  const image = await sharp(bg, { raw: { width: W, height: H, channels: 4 } })
    .composite([
      { input: glow, raw: { width: W, height: H, channels: 4 }, blend: 'over', top: 0, left: 0 },
      // Status bar elements
      { input: createSolidRect(30, 10, { r: 255, g: 255, b: 255 }, 180), raw: { width: 30, height: 10, channels: 4 }, blend: 'over', top: 8, left: 24 },
      { input: createSolidRect(40, 10, { r: 255, g: 255, b: 255 }, 150), raw: { width: 40, height: 10, channels: 4 }, blend: 'over', top: 8, left: W - 64 },
      // Header
      { input: header, raw: { width: W, height: 56, channels: 4 }, blend: 'over', top: 32, left: 0 },
      { input: createSolidRect(W, 1, { r: 255, g: 255, b: 255 }, 20), raw: { width: W, height: 1, channels: 4 }, blend: 'over', top: 88, left: 0 },
      // Menu icon (3 bars)
      { input: createSolidRect(18, 2, { r: 255, g: 255, b: 255 }, 150), raw: { width: 18, height: 2, channels: 4 }, blend: 'over', top: 53, left: 24 },
      { input: createSolidRect(18, 2, { r: 255, g: 255, b: 255 }, 150), raw: { width: 18, height: 2, channels: 4 }, blend: 'over', top: 58, left: 24 },
      { input: createSolidRect(18, 2, { r: 255, g: 255, b: 255 }, 150), raw: { width: 18, height: 2, channels: 4 }, blend: 'over', top: 63, left: 24 },
      // Logo + name in header
      { input: headerLogo, raw: { width: 28, height: 28, channels: 4 }, blend: 'over', top: 46, left: W / 2 - 44 },
      { input: createSolidRect(52, 14, { r: 255, g: 255, b: 255 }, 200), raw: { width: 52, height: 14, channels: 4 }, blend: 'over', top: 53, left: W / 2 - 10 },
      // Nova greeting
      { input: smallAvatar, raw: { width: 32, height: 32, channels: 4 }, blend: 'over', top: 114, left: 20 },
      { input: cosmoBubble1, raw: { width: 280, height: 64, channels: 4 }, blend: 'over', top: 106, left: 62 },
      { input: createSolidRect(160, 10, { r: 255, g: 255, b: 255 }, 180), raw: { width: 160, height: 10, channels: 4 }, blend: 'over', top: 124, left: 78 },
      { input: createSolidRect(200, 8, { r: 255, g: 255, b: 255 }, 100), raw: { width: 200, height: 8, channels: 4 }, blend: 'over', top: 144, left: 78 },
      // User message
      { input: userBubble, raw: { width: 266, height: 44, channels: 4 }, blend: 'over', top: 196, left: 104 },
      { input: createSolidRect(210, 10, { r: 255, g: 255, b: 255 }, 220), raw: { width: 210, height: 10, channels: 4 }, blend: 'over', top: 214, left: 130 },
      // Nova calendar reply
      { input: smallAvatar, raw: { width: 32, height: 32, channels: 4 }, blend: 'over', top: 270, left: 20 },
      { input: cosmoBubble2, raw: { width: 304, height: 140, channels: 4 }, blend: 'over', top: 262, left: 62 },
      { input: createSolidRect(220, 10, { r: 255, g: 255, b: 255 }, 180), raw: { width: 220, height: 10, channels: 4 }, blend: 'over', top: 282, left: 78 },
      { input: createSolidRect(240, 8, { r: 255, g: 255, b: 255 }, 100), raw: { width: 240, height: 8, channels: 4 }, blend: 'over', top: 304, left: 78 },
      { input: createSolidRect(200, 8, { r: 255, g: 255, b: 255 }, 100), raw: { width: 200, height: 8, channels: 4 }, blend: 'over', top: 324, left: 78 },
      { input: createSolidRect(220, 8, { r: 255, g: 255, b: 255 }, 100), raw: { width: 220, height: 8, channels: 4 }, blend: 'over', top: 344, left: 78 },
      { input: createSolidRect(180, 8, VIOLET, 200), raw: { width: 180, height: 8, channels: 4 }, blend: 'over', top: 374, left: 78 },
      // User second message
      { input: userBubble2, raw: { width: 256, height: 44, channels: 4 }, blend: 'over', top: 424, left: 114 },
      { input: createSolidRect(200, 10, { r: 255, g: 255, b: 255 }, 220), raw: { width: 200, height: 10, channels: 4 }, blend: 'over', top: 442, left: 140 },
      // Nova reminder reply
      { input: smallAvatar, raw: { width: 32, height: 32, channels: 4 }, blend: 'over', top: 498, left: 20 },
      { input: cosmoBubble3, raw: { width: 280, height: 60, channels: 4 }, blend: 'over', top: 490, left: 62 },
      { input: createSolidRect(240, 10, { r: 255, g: 255, b: 255 }, 180), raw: { width: 240, height: 10, channels: 4 }, blend: 'over', top: 508, left: 78 },
      { input: createSolidRect(180, 8, { r: 255, g: 255, b: 255 }, 100), raw: { width: 180, height: 8, channels: 4 }, blend: 'over', top: 530, left: 78 },
      // Suggestion chips
      { input: chipSmall, raw: { width: 130, height: 32, channels: 4 }, blend: 'over', top: 580, left: 24 },
      { input: chipSmall, raw: { width: 130, height: 32, channels: 4 }, blend: 'over', top: 580, left: 162 },
      { input: createSolidRect(66, 32, { r: 255, g: 255, b: 255 }, 12), raw: { width: 66, height: 32, channels: 4 }, blend: 'over', top: 580, left: 300 },
      // Input bar
      { input: inputBar, raw: { width: W - 32, height: 50, channels: 4 }, blend: 'over', top: H - 100, left: 16 },
      { input: createSolidRect(150, 10, { r: 255, g: 255, b: 255 }, 60), raw: { width: 150, height: 10, channels: 4 }, blend: 'over', top: H - 80, left: 48 },
      { input: sendBtn, raw: { width: 36, height: 36, channels: 4 }, blend: 'over', top: H - 93, left: W - 58 },
      // Home indicator
      { input: homeInd, raw: { width: 120, height: 4, channels: 4 }, blend: 'over', top: H - 10, left: W / 2 - 60 },
    ])
    .png()
    .toFile(path.join(OUTPUT_DIR, 'mobile.png'));

  console.log('✅ Generated public/screenshots/mobile.png (390×844)');
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  await generateDesktop();
  await generateMobile();
  console.log('\nDone! Screenshots are ready for manifest.json.');
}

main().catch((err) => {
  console.error('Failed to generate screenshots:', err);
  process.exit(1);
});
