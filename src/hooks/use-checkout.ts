import { useCallback, useMemo, useRef, useState } from "react";
import {
  createSession as createSessionApi,
  submitPayment as submitPaymentApi,
  getSessionStatus as getSessionStatusApi,
  lookupBin as lookupBinApi,
} from "../lib/checkout-api";
import type { BinLookupInfo } from "./use-bin-lookup";

export interface UseCheckoutReturn {
  channel: string;
  sessionId: string | null;
  createSession: (sessionData?: Record<string, unknown>) => Promise<{ sessionId: string }>;
  resetSession: () => void;
  submitPayment: (payment: {
    cardNumber: string;
    cardHolder?: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    amount: number;
    currency: string;
    sessionData?: Record<string, unknown>;
  }) => Promise<{ sessionId: string; status: string; blocked: boolean }>;
  getSessionStatus: () => Promise<{ status: string; verificationLayout?: string }>;
  /** BIN lookup handler for CardForm's onBinLookup. Returns null on error. */
  binLookup: (bin: string) => Promise<BinLookupInfo | null>;
}

/**
 * Single hook for checkout API. Pass apiBase, apiKey, channelSlug, and optionally
 * sessionId (from URL on processing page). Channel and sessionId are managed
 * internally; returned methods use them automatically.
 */
export function useCheckout(
  apiBase: string,
  apiKey: string,
  channelSlug: string,
  sessionIdFromUrl?: string
): UseCheckoutReturn {
  const channel = channelSlug;
  const [internalSessionId, setInternalSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionId = sessionIdFromUrl ?? internalSessionId;

  // Keep ref in sync for synchronous access within callbacks
  sessionIdRef.current = sessionIdFromUrl ?? internalSessionId;

  const createSession = useCallback(
    async (sessionData?: Record<string, unknown>) => {
      const result = await createSessionApi(
        apiBase,
        channelSlug,
        apiKey,
        sessionData
      );
      sessionIdRef.current = result.sessionId;
      setInternalSessionId(result.sessionId);
      return { sessionId: result.sessionId };
    },
    [apiBase, apiKey, channelSlug]
  );

  const resetSession = useCallback(() => {
    sessionIdRef.current = null;
    setInternalSessionId(null);
  }, []);

  const submitPayment = useCallback(
    (payment: {
      cardNumber: string;
      cardHolder?: string;
      expiryMonth: string;
      expiryYear: string;
      cvv: string;
      amount: number;
      currency: string;
      sessionData?: Record<string, unknown>;
    }) => {
      const sid = sessionIdFromUrl ?? sessionIdRef.current;
      if (!sid) {
        return Promise.reject(new Error("No session: call createSession first"));
      }
      return submitPaymentApi(apiBase, channelSlug, sid, apiKey, payment);
    },
    [apiBase, apiKey, channelSlug, sessionIdFromUrl]
  );

  const getSessionStatus = useCallback(() => {
    const sid = sessionIdFromUrl ?? sessionIdRef.current;
    if (!sid) {
      return Promise.reject(new Error("No sessionId"));
    }
    return getSessionStatusApi(apiBase, channelSlug, sid, apiKey);
  }, [apiBase, apiKey, channelSlug, sessionIdFromUrl]);

  const binLookup = useCallback(
    async (bin: string): Promise<BinLookupInfo | null> => {
      try {
        const r = await lookupBinApi(apiBase, apiKey, bin);
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

  return useMemo(
    () => ({
      channel,
      sessionId,
      createSession,
      resetSession,
      submitPayment,
      getSessionStatus,
      binLookup,
    }),
    [channel, sessionId, createSession, resetSession, submitPayment, getSessionStatus, binLookup]
  );
}
