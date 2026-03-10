import { useRef } from "react";
import { lookupBin } from "../lib/checkout-api";
import type { BinLookupInfo } from "../types";

function normalizeBin(bin: string): string {
  return bin.replace(/\D/g, "").slice(0, 8);
}

export function useBinLookup(): (bin: string) => Promise<BinLookupInfo | null> {
  const cacheRef = useRef<Map<string, BinLookupInfo | null>>(new Map());
  const inflightRef = useRef<Map<string, Promise<BinLookupInfo | null>>>(new Map());

  return async (bin: string): Promise<BinLookupInfo | null> => {
    const key = normalizeBin(bin);
    if (key.length < 6) return null;

    const cached = cacheRef.current.get(key);
    if (cached !== undefined) return cached;

    let promise = inflightRef.current.get(key);
    if (!promise) {
      promise = (async () => {
        try {
          const r = await lookupBin(bin);
          const info: BinLookupInfo = {
            brand: r.brand,
            type: r.type,
            category: r.category,
            issuer: r.issuer,
            isoCode2: r.isoCode2,
            blocked: r.blocked,
          };
          cacheRef.current.set(key, info);
          return info;
        } catch {
          cacheRef.current.set(key, null);
          return null;
        } finally {
          inflightRef.current.delete(key);
        }
      })();
      inflightRef.current.set(key, promise);
    }
    return promise;
  };
}
