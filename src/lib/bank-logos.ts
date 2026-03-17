/**
 * Bank/issuer name to logo filename. Keys are lowercase for case-insensitive lookup.
 * Issuer names come from BIN lookup (HandyAPI, card_bins) - run `bun run list-bank-issuers` in ncc-api to see DB values.
 */
import { BANK_LOGO_DATA_URLS } from "../assets/bank-logos";

const DEFAULT_BANK_LOGO = "nbd.png";

export const BANK_TO_LOGO: Record<string, string> = {
  "emirates nbd": "nbd.png",
  "emirates nbd bank (p.j.s.c.)": "nbd.png",
  enbd: "nbd.png",
  nbd: "nbd.png",
  rakbank: "RAKBANK.png",
  "emirates islamic": "EmiratesIslamic.png",
  "dubai islamic": "dib.png",
  dib: "dib.png",
  adcb: "adcb.png",
  fab: "fab.svg",
  "first abu dhabi": "fab.svg",
  mashreq: "mashreq.png",
  mashreqbank: "mashreq.png",
  adib: "nbd.png",
  "abu dhabi islamic": "nbd.png",
  hsbc: "hsbc.jpg",
  citi: "citi.png",
  "sharjah islamic": "sib.png",
  sib: "sib.png",
  psc: "psc.png",
  cmb: "cmb.png",
  "commercial bank of dubai": "cmb.png",
  "commercial bank of dubai(psc)": "cmb.png",
  cbd: "cmb.png",
  afaq: "afaq.jpg",
  emoney: "Emoney.jpg",
  "digital financial services llc": "nbd.png",
};

/**
 * Returns a data URL for the bank logo, or a default fallback when useDefaultFallback is true.
 * When useDefaultFallback is false (e.g. for issuer strip), returns "" if no logo is mapped.
 */
export function getBankLogoUrl(
  bank: string | undefined,
  options?: { useDefaultFallback?: boolean }
): string {
  const useDefaultFallback = options?.useDefaultFallback ?? true;
  if (!bank) {
    return useDefaultFallback
      ? BANK_LOGO_DATA_URLS[DEFAULT_BANK_LOGO] ?? ""
      : "";
  }
  const key = bank.toLowerCase().trim();
  const filename =
    BANK_TO_LOGO[key] ??
    Object.entries(BANK_TO_LOGO).find(
      ([k]) => key.includes(k) || k.includes(key)
    )?.[1];

  if (!filename) return useDefaultFallback ? BANK_LOGO_DATA_URLS[DEFAULT_BANK_LOGO] ?? "" : "";
  return BANK_LOGO_DATA_URLS[filename] ?? (useDefaultFallback ? BANK_LOGO_DATA_URLS[DEFAULT_BANK_LOGO] ?? "" : "");
}
