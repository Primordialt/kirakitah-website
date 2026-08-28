/**
 * One-off generator for app router favicon assets from the official purple brand mark.
 * Run: npm install --no-save sharp && node scripts/generate-site-icons.mjs
 */
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const logoMark = join(root, "public/brand/logo-mark.png");
const appDir = join(root, "src/app");

const BACKGROUND = { r: 255, g: 255, b: 255, alpha: 1 };

function createIcoFromPng(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size;
  entry[1] = size >= 256 ? 0 : size;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(22, 12);

  return Buffer.concat([header, entry, pngBuffer]);
}

async function composeIcon(size, markScale = 0.78) {
  const markSize = Math.max(1, Math.round(size * markScale));
  const resizedMark = await sharp(logoMark)
    .resize(markSize, markSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BACKGROUND,
    },
  })
    .composite([{ input: resizedMark, gravity: "center" }])
    .png()
    .toBuffer();
}

async function main() {
  const appleIcon = await composeIcon(180);
  writeFileSync(join(appDir, "apple-icon.png"), appleIcon);

  const icon48 = await composeIcon(48);
  writeFileSync(join(appDir, "icon.png"), icon48);

  const favicon32 = await composeIcon(32);
  writeFileSync(join(appDir, "favicon.ico"), createIcoFromPng(favicon32, 32));

  console.log("Generated apple-icon.png, icon.png, and favicon.ico.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
