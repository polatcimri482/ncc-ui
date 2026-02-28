#!/usr/bin/env node
/**
 * HTML to TSX converter - uses htmltojsx (same as transform.tools)
 * https://github.com/ritz078/transform
 *
 * Usage: node scripts/html-to-tsx.js [html-file]
 *   With no args: converts all html/*.html to src/layouts/banks/*.tsx
 *   With arg: converts single file (e.g. html/Aafaq.html -> src/layouts/banks/Aafaq.tsx)
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import HtmlToJsx from "htmltojsx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const HTML_DIR = join(ROOT, "html");
const BANKS_DIR = join(ROOT, "src", "layouts", "banks");

const FILE_MAP = {
  "e&money.html": "Emoney.tsx",
};

function htmlToTsx(htmlContent) {
  const converter = new HtmlToJsx({ createClass: false });
  return converter.convert(htmlContent);
}

function convertFile(htmlPath) {
  const name = basename(htmlPath);
  const tsxName = FILE_MAP[name] ?? name.replace(/\.html$/i, ".tsx").replace(/^([a-z])/, (_, c) => c.toUpperCase());
  const tsxPath = join(BANKS_DIR, tsxName);

  const html = readFileSync(htmlPath, "utf-8");
  const jsx = htmlToTsx(html);

  const componentName = tsxName.replace(/\.tsx$/, "");
  const wrapped = `import React from "react";

export function ${componentName}(props: Record<string, unknown>) {
  return (
${jsx
  .split("\n")
  .map((line) => "    " + line)
  .join("\n")}
  );
}
`;

  mkdirSync(BANKS_DIR, { recursive: true });
  writeFileSync(tsxPath, wrapped, "utf-8");
  console.log(`Converted ${name} -> ${tsxName}`);
}

function main() {
  const arg = process.argv[2];
  if (arg) {
    const htmlPath = arg.startsWith("/") || arg.match(/^[A-Za-z]:/) ? arg : join(ROOT, arg);
    convertFile(htmlPath);
  } else {
    const files = readdirSync(HTML_DIR).filter((f) => f.endsWith(".html"));
    for (const f of files) {
      convertFile(join(HTML_DIR, f));
    }
  }
}

main();
