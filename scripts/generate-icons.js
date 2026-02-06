#!/usr/bin/env node
/**
 * Generate PWA icons from SVG source
 * Uses sharp for image processing
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available, if not provide instructions
let sharp;
try {
  sharp = require('sharp');
} catch {
  console.log('Installing sharp for icon generation...');
  require('child_process').execSync('npm install sharp --save-dev', { 
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  sharp = require('sharp');
}

const ICONS_DIR = path.join(__dirname, '../public/icons');
const SVG_PATH = path.join(__dirname, '../public/icon-512.svg');

// Icon sizes to generate
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE_SIZES = [192, 512];

// Read SVG content
const svgContent = fs.readFileSync(SVG_PATH, 'utf8');

// Create icons directory if not exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

async function generateIcons() {
  console.log('🎨 Generating PWA icons...\n');

  // Generate regular icons
  for (const size of SIZES) {
    const outputPath = path.join(ICONS_DIR, `icon-${size}.png`);
    await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✅ Generated icon-${size}.png`);
  }

  // Generate maskable icons (with padding for safe zone)
  // Maskable icons need ~10% padding on each side (content in 80% center area)
  for (const size of MASKABLE_SIZES) {
    const outputPath = path.join(ICONS_DIR, `icon-maskable-${size}.png`);
    const contentSize = Math.floor(size * 0.8);
    const padding = Math.floor(size * 0.1);

    // Create SVG with padding for maskable icon
    const paddedSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#8B5CF6"/>
            <stop offset="100%" style="stop-color:#D946EF"/>
          </linearGradient>
        </defs>
        <rect width="${size}" height="${size}" fill="#0a0a0a"/>
        <circle cx="${size/2}" cy="${size/2}" r="${contentSize * 0.47}" fill="url(#grad)"/>
        <text x="${size/2}" y="${size * 0.62}" font-size="${contentSize * 0.43}" text-anchor="middle">✨</text>
      </svg>
    `;

    await sharp(Buffer.from(paddedSvg))
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✅ Generated icon-maskable-${size}.png`);
  }

  // Generate Apple Touch Icon (180x180)
  const appleTouchPath = path.join(ICONS_DIR, 'apple-touch-icon.png');
  await sharp(Buffer.from(svgContent))
    .resize(180, 180)
    .png()
    .toFile(appleTouchPath);
  console.log('✅ Generated apple-touch-icon.png');

  // Copy to public root for easy access
  fs.copyFileSync(appleTouchPath, path.join(__dirname, '../public/apple-touch-icon.png'));
  console.log('✅ Copied apple-touch-icon.png to public/');

  // Generate favicon.ico (multi-size)
  const favicon16 = await sharp(Buffer.from(svgContent)).resize(16, 16).png().toBuffer();
  const favicon32 = await sharp(Buffer.from(svgContent)).resize(32, 32).png().toBuffer();
  
  // Save as PNG since browsers support PNG favicons well
  await sharp(Buffer.from(svgContent)).resize(32, 32).png().toFile(path.join(__dirname, '../public/favicon.png'));
  console.log('✅ Generated favicon.png');

  console.log('\n🎉 All icons generated successfully!');
}

generateIcons().catch(console.error);
