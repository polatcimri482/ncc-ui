import { useCallback, useEffect, useRef, useState } from "react";
import { needsVerification, isTerminal } from "../lib/checkout-status";
import { debugLog } from "../lib/debug";
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
  callbacks: CheckoutFlowCallbacks
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
  apiBase: string,
  apiKey: string,
  channelSlug: string,
  callbacks: CheckoutFlowCallbacks,
  sessionIdFromUrl?: string,
  debug = false
): UseCheckoutFlowReturn {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const [verificationSessionId, setVerificationSessionId] = useState<string | null>(null);
  const latestSessionIdRef = useRef<string | null>(null);
  const [pollingSessionId, setPollingSessionId] = useState<string | null>(null);
  const sessionUsedForPaymentRef = useRef<string | null>(null);

  const sessionId = sessionIdFromUrl ?? verificationSessionId;
  latestSessionIdRef.current = sessionId;

  const monitoredSessionId = sessionIdFromUrl ?? pollingSessionId ?? verificationSessionId;
  const isProcessingMode = Boolean(sessionIdFromUrl || pollingSessionId);

  const { status } = useSessionStatus(
    apiBase,
    channelSlug,
    isProcessingMode ? monitoredSessionId : null,
    debug
  );

  const createSession = useCallback(
    async (sessionData?: Record<string, unknown>) => {
      const result = await createSessionApi(apiBase, channelSlug, apiKey, sessionData);
      latestSessionIdRef.current = result.sessionId;
      setVerificationSessionId(result.sessionId);
      return result.sessionId;
    },
    [apiBase, apiKey, channelSlug]
  );

  const resetSession = useCallback(() => {
    latestSessionIdRef.current = null;
    setVerificationSessionId(null);
  }, []);

  const resetAll = useCallback(() => {
    sessionUsedForPaymentRef.current = null;
    setPollingSessionId(null);
    resetSession();
  }, [resetSession]);

  const submitPayment = useCallback(
    async (payment: PaymentData) => {
      const cbs = callbacksRef.current;
      try {
        const currentSid = latestSessionIdRef.current;
        const alreadyUsed = currentSid && currentSid === sessionUsedForPaymentRef.current;
        const sid = alreadyUsed || !currentSid
          ? await createSession(payment.sessionData)
          : currentSid;

        debugLog(debug, "submitPayment", { sessionId: sid, amount: payment.amount, currency: payment.currency });
        const result = await submitPaymentApi(apiBase, channelSlug, sid, apiKey, payment);
        sessionUsedForPaymentRef.current = result.sessionId;
        debugLog(debug, "submitPayment result", { status: result.status, blocked: result.blocked, sessionId: result.sessionId });

        if (!resolveStatus(result.status, result.blocked, result.sessionId, cbs)) {
          debugLog(debug, "processing mode", { sessionId: result.sessionId });
          setPollingSessionId(result.sessionId);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Payment failed. Please try again.";
        debugLog(debug, "submitPayment failed", { error: msg });
        sessionUsedForPaymentRef.current = null;
        resetAll();
        cbs.onError?.(msg);
      }
    },
    [apiBase, apiKey, channelSlug, createSession, resetAll, debug]
  );

  const lastHandledStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isProcessingMode || !monitoredSessionId) return;

    const shouldHandle =
      needsVerification(status) ||
      status === "success" ||
      isTerminal(status);

    if (!shouldHandle) return;
    if (lastHandledStatusRef.current === status) return;
    lastHandledStatusRef.current = status;

    debugLog(debug, "processing status handled", { status, sessionId: monitoredSessionId });
    resolveStatus(status, false, monitoredSessionId, callbacksRef.current);

    if (isTerminal(status)) {
      sessionUsedForPaymentRef.current = null;
      resetAll();
    } else {
      setPollingSessionId(null);
    }
  }, [isProcessingMode, monitoredSessionId, status, resetAll, debug]);

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

  return {
    submitPayment,
    binLookup,
    sessionId: monitoredSessionId,
    resetSession: resetAll,
  };
}
