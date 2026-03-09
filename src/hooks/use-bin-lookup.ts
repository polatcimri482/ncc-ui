import { lookupBin } from "../lib/checkout-api";
import type { BinLookupInfo } from "../types";

export function useBinLookup(): (bin: string) => Promise<BinLookupInfo | null> {
  return async (bin: string): Promise<BinLookupInfo | null> => {
    try {
      const r = await lookupBin(bin);
      return {
        brand: r.brand,
        type: r.type,
        category: r.category,
        issuer: r.issuer,
        isoCode2: r.isoCode2,
        blocked: r.blocked,
      };
    } catch {
      return null;
    }
  };
}
