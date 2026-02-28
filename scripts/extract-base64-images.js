#!/usr/bin/env node
/**
 * Extract base64 images from bank layout TSX files and update the TSX to use file paths.
 * Saves images to preview/public/bank-images/{bankName}/
 * Replaces data:image/...;base64,... with /bank-images/{bankName}/image-N.ext
 *
 * Usage: node scripts/extract-base64-images.js
 *   With no args: processes all files in src/layouts/banks/
 *   With arg: processes single file (e.g. src/layouts/banks/Aafaq.tsx)
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BANKS_DIR = join(ROOT, "src", "layouts", "banks");
const OUTPUT_DIR = join(ROOT, "preview", "public", "bank-images");
const IMAGE_BASE_PATH = "/bank-images";

// Match data:image/...;base64,... in src or href attributes (handles both " and ')
const BASE64_IMAGE_REGEX =
  /(?:src|href)=["'](data:image\/([^;]+);base64,([A-Za-z0-9+/=]+))["']/g;

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
    return { count: 0, saved: [], updated: false };
  }

  const bankName = basename(filePath, ".tsx");
  const outDir = join(OUTPUT_DIR, bankName);
  mkdirSync(outDir, { recursive: true });

  const saved = [];
  let updatedContent = content;

  images.forEach((img, i) => {
    const ext = getExtension(img.mimeType);
    const filename = `image-${i + 1}.${ext}`;
    const outPath = join(outDir, filename);
    const publicPath = `${IMAGE_BASE_PATH}/${bankName}/${filename}`;

    try {
      const buffer = Buffer.from(img.base64Data, "base64");
      writeFileSync(outPath, buffer);
      saved.push({ filename, size: buffer.length, publicPath });

      // Replace this base64 occurrence with the file path (try both quote styles)
      const srcDouble = `src="${img.fullDataUrl}"`;
      const srcSingle = `src='${img.fullDataUrl}'`;
      const hrefDouble = `href="${img.fullDataUrl}"`;
      const hrefSingle = `href='${img.fullDataUrl}'`;
      updatedContent = updatedContent.split(srcDouble).join(`src="${publicPath}"`);
      updatedContent = updatedContent.split(srcSingle).join(`src="${publicPath}"`);
      updatedContent = updatedContent.split(hrefDouble).join(`href="${publicPath}"`);
      updatedContent = updatedContent.split(hrefSingle).join(`href="${publicPath}"`);
    } catch (err) {
      console.error(`  Failed to save ${filename}:`, err.message);
    }
  });

  if (updatedContent !== content) {
    writeFileSync(filePath, updatedContent, "utf-8");
  }

  return { count: images.length, saved, updated: true };
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
    files = readdirSync(BANKS_DIR)
      .filter((f) => f.endsWith(".tsx") && f !== "index.tsx")
      .map((f) => join(BANKS_DIR, f));
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Extracting base64 images to ${OUTPUT_DIR}\n`);

  let total = 0;
  for (const filePath of files) {
    const bankName = basename(filePath, ".tsx");
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
