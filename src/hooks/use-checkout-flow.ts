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
import type { BinLookupInfo, FailureStatus } from "../types";

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
  /** Called for all failure outcomes. `status` discriminates the reason:
   *  - `"declined"` / `"expired"` / `"blocked"` / `"invalid"` — terminal session outcome
   *  - `"error"` — technical/network error; `message` carries the detail
   */
  onFailed?: (status: FailureStatus, sessionId: string | null, message?: string) => void;
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
    callbacks.onFailed?.(status as FailureStatus, sessionId);
    return true;
  }
  return false;
}

/**
 * Orchestrates the full checkout flow: session creation, payment submission,
 * and real-time status tracking via WebSocket.
 *
 * Two modes:
 * - Checkout mode: call submitPayment to start the flow.
 * - Processing mode: monitors an existing session via WebSocket (when a session is stored and submitted).
 */
export function useCheckoutFlow(
  channelSlug: string,
  callbacks: CheckoutFlowCallbacks,
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

  const { status } = useSessionStatus(
    channelSlug,
    isPolling ? sessionId : null,
    debug,
  );

  const createSession = useCallback(
    async (sessionData?: Record<string, unknown>) => {
      const result = await createSessionApi(channelSlug, sessionData);
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
    clearSession(channelSlug);
    forceUpdate();
  }, [channelSlug]);

  const submitPayment = useCallback(
    async (payment: PaymentData) => {
      const cbs = callbacksRef.current;
      try {
        const current = loadSession(channelSlug);
        const sid =
          current?.submitted || !current?.sessionId
            ? await createSession(payment.sessionData)
            : current.sessionId;

        debugLog(debug, "submitPayment", {
          sessionId: sid,
          amount: payment.amount,
          currency: payment.currency,
        });
        const result = await submitPaymentApi(channelSlug, sid, payment);
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
        resetSession();
        cbs.onFailed?.("error", null, msg);
      }
    },
    [channelSlug, createSession, resetSession, debug],
  );

  // Keep localStorage status in sync with live WebSocket updates.
  useEffect(() => {
    if (!sessionId || !status) return;
    const current = loadSession(channelSlug);
    if (current && current.status !== status) {
      saveSession(channelSlug, { ...current, status });
    }
  }, [channelSlug, sessionId, status]);

  const lastHandledStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isPolling || !sessionId) return;

    const shouldHandle =
      needsVerification(status) || status === "success" || isTerminal(status);

    if (!shouldHandle) return;
    if (lastHandledStatusRef.current === status) return;
    lastHandledStatusRef.current = status;

    debugLog(debug, "processing status handled", {
      status,
      sessionId,
    });
    resolveStatus(status, false, sessionId, callbacksRef.current);

    if (isTerminal(status)) {
      resetSession();
    }
  }, [isPolling, sessionId, status, resetSession, debug]);

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
    sessionId,
    resetSession,
  };
}
