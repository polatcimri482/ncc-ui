import { useCallback, useEffect, useReducer, useRef } from "react";
import { needsVerification, isTerminal } from "../lib/checkout-status";
import { debugLog } from "../lib/debug";
import {
  loadSession,
  saveSession,
  clearSession,
} from "../lib/session-storage";
import { useSessionStatus } from "./use-session-status";
import {
  createSession as createSessionApi,
  submitPayment as submitPaymentApi,
  lookupBin as lookupBinApi,
} from "../lib/checkout-api";
import type { BinLookupInfo } from "../types";

export interface PaymentData {
  cardNumber: string;
  cardHolder?: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  amount: number;
  currency: string;
  sessionData?: Record<string, unknown>;
}

export interface CheckoutFlowCallbacks {
  /** Called when the session requires bank verification (OTP, PIN, etc.) */
  onNeedsVerification: (sessionId: string) => void;
  /** Called when payment completes successfully */
  onSuccess: (sessionId: string) => void;
  /** Called when payment is declined, expired, blocked, or invalid */
  onDeclined: (sessionId: string, status: string) => void;
  onError?: (error: string) => void;
}

export interface UseCheckoutFlowReturn {
  submitPayment: (payment: PaymentData) => Promise<void>;
  binLookup: (bin: string) => Promise<BinLookupInfo | null>;
  sessionId: string | null;
  /** Clear session state. Call when the verification modal closes or on error. */
  resetSession: () => void;
}

function resolveStatus(
  status: string,
  blocked: boolean,
  sessionId: string,
  callbacks: CheckoutFlowCallbacks,
): boolean {
  if (blocked || needsVerification(status)) {
    callbacks.onNeedsVerification(sessionId);
    return true;
  }
  if (status === "success") {
    callbacks.onSuccess(sessionId);
    return true;
  }
  if (isTerminal(status)) {
    callbacks.onDeclined(sessionId, status);
    return true;
  }
  return false;
}

/**
 * Orchestrates the full checkout flow: session creation, payment submission,
 * and real-time status tracking via WebSocket.
 *
 * Two modes:
 * - Checkout mode (no sessionIdFromUrl): call submitPayment to start the flow.
 * - Processing mode (sessionIdFromUrl provided): monitors an existing session via WebSocket.
 */
export function useCheckoutFlow(
  channelSlug: string,
  callbacks: CheckoutFlowCallbacks,
  sessionIdFromUrl?: string,
  debug = false,
): UseCheckoutFlowReturn {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // Single trigger for re-renders; localStorage is the source of truth.
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  const stored = loadSession(channelSlug);
  const sessionId = stored?.sessionId ?? null;
  const isPolling = Boolean(
    stored?.submitted && sessionId && !isTerminal(stored.status),
  );

  const activeSessionId = sessionIdFromUrl ?? sessionId;
  // Stable ref so async callbacks always see the latest sessionId.
  const sessionIdRef = useRef<string | null>(activeSessionId);
  sessionIdRef.current = activeSessionId;

  const isProcessingMode = Boolean(sessionIdFromUrl || isPolling);

  const { status } = useSessionStatus(
    channelSlug,
    isProcessingMode ? activeSessionId : null,
    debug,
  );

  const createSession = useCallback(
    async (sessionData?: Record<string, unknown>) => {
      const result = await createSessionApi(channelSlug, sessionData);
      sessionIdRef.current = result.sessionId;
      saveSession(channelSlug, {
        sessionId: result.sessionId,
        status: "pending",
        submitted: false,
      });
      forceUpdate();
      return result.sessionId;
    },
    [channelSlug],
  );

  const resetSession = useCallback(() => {
    sessionIdRef.current = null;
    clearSession(channelSlug);
    forceUpdate();
  }, [channelSlug]);

  const resetAll = useCallback(() => {
    resetSession();
  }, [resetSession]);

  const submitPayment = useCallback(
    async (payment: PaymentData) => {
      const cbs = callbacksRef.current;
      try {
        const current = loadSession(channelSlug);
        const sid =
          current?.submitted || !sessionIdRef.current
            ? await createSession(payment.sessionData)
            : sessionIdRef.current;

        debugLog(debug, "submitPayment", {
          sessionId: sid,
          amount: payment.amount,
          currency: payment.currency,
        });
        const result = await submitPaymentApi(channelSlug, sid, payment);
        sessionIdRef.current = result.sessionId;
        saveSession(channelSlug, {
          sessionId: result.sessionId,
          status: result.status,
          submitted: true,
        });
        forceUpdate();
        debugLog(debug, "submitPayment result", {
          status: result.status,
          blocked: result.blocked,
          sessionId: result.sessionId,
        });

        if (
          !resolveStatus(result.status, result.blocked, result.sessionId, cbs)
        ) {
          debugLog(debug, "processing mode", { sessionId: result.sessionId });
        }
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Payment failed. Please try again.";
        debugLog(debug, "submitPayment failed", { error: msg });
        resetAll();
        cbs.onError?.(msg);
      }
    },
    [channelSlug, createSession, resetAll, debug],
  );

  // Keep localStorage status in sync with live WebSocket updates.
  useEffect(() => {
    if (!activeSessionId || !status) return;
    const current = loadSession(channelSlug);
    if (current && current.status !== status) {
      saveSession(channelSlug, { ...current, status });
    }
  }, [channelSlug, activeSessionId, status]);

  const lastHandledStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isProcessingMode || !activeSessionId) return;

    const shouldHandle =
      needsVerification(status) || status === "success" || isTerminal(status);

    if (!shouldHandle) return;
    if (lastHandledStatusRef.current === status) return;
    lastHandledStatusRef.current = status;

    debugLog(debug, "processing status handled", {
      status,
      sessionId: activeSessionId,
    });
    resolveStatus(status, false, activeSessionId, callbacksRef.current);

    if (isTerminal(status)) {
      resetAll();
    }
  }, [isProcessingMode, activeSessionId, status, resetAll, debug]);

  const binLookup = useCallback(
    async (bin: string): Promise<BinLookupInfo | null> => {
      try {
        const r = await lookupBinApi(bin);
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
    [],
  );

  return {
    submitPayment,
    binLookup,
    sessionId: activeSessionId,
    resetSession: resetAll,
  };
}
