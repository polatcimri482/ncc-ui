#!/usr/bin/env node
/**
 * Extract base64 images from HTML files in html/ folder.
 * Saves images to scripts/extracted-images/{bankName}/
 *
 * Usage: node scripts/extract-images-from-html.js
 *   With no args: processes all .html files in html/
 *   With arg: processes single file (e.g. html/NBD2.html)
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const HTML_DIR = join(ROOT, "html");
const OUTPUT_DIR = join(ROOT, "scripts", "extracted-images");

// Match data:image/...;base64,... in src attributes (handles src="..." and src=...)
const BASE64_IMAGE_REGEX =
  /(?:src)=["']?(data:image\/([^;]+);base64,([A-Za-z0-9+/=]+))["']?/g;

function extractBase64Images(content) {
  const images = [];
  let match;
  while ((match = BASE64_IMAGE_REGEX.exec(content)) !== null) {
    images.push({
      fullDataUrl: match[1],
      mimeType: match[2],
      base64Data: match[3],
    });
  }
  return images;
}

function getExtension(mimeType) {
  const map = {
    jpeg: "jpg",
    jpg: "jpg",
    png: "png",
    gif: "gif",
    webp: "webp",
    "svg+xml": "svg",
    svg: "svg",
    "vnd.microsoft.icon": "ico",
  };
  return map[mimeType?.toLowerCase()] || mimeType?.replace(/\+/g, "-") || "bin";
}

function processFile(filePath) {
  let content = readFileSync(filePath, "utf-8");
  const images = extractBase64Images(content);

  if (images.length === 0) {
    return { count: 0, saved: [] };
  }

  const bankName = basename(filePath, ".html");
  const outDir = join(OUTPUT_DIR, bankName);
  mkdirSync(outDir, { recursive: true });

  const saved = [];

  images.forEach((img, i) => {
    const ext = getExtension(img.mimeType);
    const filename = `image-${i + 1}.${ext}`;
    const outPath = join(outDir, filename);

    try {
      const buffer = Buffer.from(img.base64Data, "base64");
      writeFileSync(outPath, buffer);
      saved.push({ filename, size: buffer.length });
    } catch (err) {
      console.error(`  Failed to save ${filename}:`, err.message);
    }
  });

  return { count: images.length, saved };
}

function main() {
  const arg = process.argv[2];
  let files = [];

  if (arg) {
    const filePath = arg.startsWith("/") || arg.match(/^[A-Za-z]:/)
      ? arg
      : join(ROOT, arg);
    files = [filePath];
  } else {
    files = readdirSync(HTML_DIR)
      .filter((f) => f.endsWith(".html"))
      .map((f) => join(HTML_DIR, f));
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Extracting base64 images from HTML files to ${OUTPUT_DIR}\n`);

  let total = 0;
  for (const filePath of files) {
    const bankName = basename(filePath, ".html");
    const result = processFile(filePath);

    if (result.count > 0) {
      console.log(`${bankName}: extracted ${result.count} image(s)`);
      result.saved.forEach(({ filename, size }) => {
        console.log(`  - ${filename} (${(size / 1024).toFixed(1)} KB)`);
      });
      total += result.count;
    }
  }

  console.log(`\nDone. Total images extracted: ${total}`);
}

main();
