import type { BankConfig } from "./types";

let config: BankConfig = { apiBase: "" };

function getConfig(): BankConfig {
  return config;
}

/** Configure the bank UI package. Call once at app startup before rendering bank components. */
export function configureBankUI(newConfig: BankConfig): void {
  config = newConfig;
}

export { getConfig };
