import { useCallback } from "react";
import { lookupBin } from "../lib/checkout-api";

export interface BinLookupInfo {
  brand?: string;
  type?: string;
  category?: string;
  issuer?: string;
  isoCode2?: string;
  blocked: boolean;
}

/** Returns a stable BIN lookup handler for CardForm */
export function useBinLookup(
  apiBase: string,
  apiKey: string
): (bin: string) => Promise<BinLookupInfo | null> {
  return useCallback(
    async (bin: string) => {
      try {
        const r = await lookupBin(apiBase, apiKey, bin);
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
    },
    [apiBase, apiKey]
  );
}
