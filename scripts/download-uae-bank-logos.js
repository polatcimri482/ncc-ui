#!/usr/bin/env node
/**
 * Download UAE bank logos from Wikimedia Commons to preview/public/bank-images/
 *
 * Usage: node scripts/download-uae-bank-logos.js [--force]
 *   --force  Overwrite existing files
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "..", "preview", "public", "bank-images");

const BANKS = [
  {
    name: "Emirates NBD",
    output: "nbd.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/3/39/Emirates_NBD_Logo.jpg",
  },
  {
    name: "First Abu Dhabi Bank",
    output: "fab.svg",
    url: "https://upload.wikimedia.org/wikipedia/commons/2/22/First_Abu_Dhabi_Bank_Logo.svg",
  },
  {
    name: "Abu Dhabi Commercial Bank",
    output: "adcb.png",
    url: "https://upload.wikimedia.org/wikipedia/commons/7/7d/Abu_Dhabi_Commercial_Bank_%28ADCB%29.png",
  },
  {
    name: "Mashreq",
    output: "mashreq.png",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Mashreq-new-logo.png",
  },
];

const MANUAL_BANKS = [
  "Abu Dhabi Islamic Bank (ADIB) - uaelogos.ae/logos/abu-dhabi-islamic-bank-adib",
  "Ajman Bank - uaelogos.ae",
  "Bank of Sharjah - uaelogos.ae",
  "United Arab Bank - uaelogos.ae",
  "National Bank of Fujairah - uaelogos.ae/logos/national-bank-of-fujairah-nbf",
  "Invest Bank - uaelogos.ae",
  "Wio Bank - manual",
  "Zand Bank - manual",
];

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const force = process.argv.includes("--force");
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("Downloading UAE bank logos from Wikimedia Commons...\n");

  for (const bank of BANKS) {
    const outPath = join(OUTPUT_DIR, bank.output);
    if (existsSync(outPath) && !force) {
      console.log(`  Skip ${bank.output} (exists, use --force to overwrite)`);
      continue;
    }
    try {
      const buf = await download(bank.url);
      writeFileSync(outPath, buf);
      console.log(`  OK  ${bank.output} (${bank.name})`);
    } catch (err) {
      console.error(`  FAIL ${bank.output}: ${err.message}`);
    }
  }

  console.log("\nBanks requiring manual download from uaelogos.ae:");
  MANUAL_BANKS.forEach((b) => console.log(`  - ${b}`));
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
