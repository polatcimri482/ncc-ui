import { useCallback, useEffect, useRef, useState } from "react";
import { needsVerification, isTerminal } from "../lib/checkout-status";
import { debugLog } from "../lib/debug";
import { useCheckout } from "./use-checkout";
import { useSessionStatus } from "./use-session-status";
import type { BinLookupInfo } from "./use-bin-lookup";

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
  onNeedsVerification: (channel: string, sessionId: string) => void;
  onSuccess: (channel: string, sessionId: string) => void;
  onDeclined: (channel: string, sessionId: string, status: string) => void;
  onInvalid: (channel: string) => void;
  onProcessing: (channel: string, sessionId: string) => void;
  onError?: (error: string) => void;
}

function resolveStatus(
  status: string,
  blocked: boolean,
  channel: string,
  sessionId: string,
  callbacks: CheckoutFlowCallbacks
): boolean {
  if (blocked || needsVerification(status)) {
    callbacks.onNeedsVerification(channel, sessionId);
    return true;
  }
  if (status === "success") {
    callbacks.onSuccess(channel, sessionId);
    return true;
  }
  if (status === "invalid") {
    callbacks.onInvalid(channel);
    return true;
  }
  if (isTerminal(status)) {
    callbacks.onDeclined(channel, sessionId, status);
    return true;
  }
  return false;
}

export interface UseCheckoutFlowReturn {
  submitPayment: (payment: PaymentData) => Promise<void>;
  binLookup: (bin: string) => Promise<BinLookupInfo | null>;
  sessionId: string | null;
  channel: string;
  /** Clear session so user can start fresh. Call when verification fails (onError/onDeclined) or when the payment/verification modal closes. Pass to BankVerificationModal as resetSession. */
  resetSession: () => void;
}

/**
 * Wraps useCheckout with callback-based status routing. Handles two modes:
 * - Checkout mode (no sessionIdFromUrl): submitPayment creates session if needed, submits, then resolves status to callbacks.
 * - Processing mode (sessionIdFromUrl provided): uses WebSocket via useSessionStatus and invokes callbacks when status changes.
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
  const [processingSessionId, setProcessingSessionId] = useState<string | null>(null);

  const {
    channel,
    sessionId,
    createSession,
    resetSession,
    submitPayment: submitPaymentApi,
    binLookup,
  } = useCheckout(apiBase, apiKey, channelSlug, sessionIdFromUrl);

  const sid = sessionIdFromUrl ?? processingSessionId ?? sessionId;
  const isProcessingMode = Boolean(sessionIdFromUrl || processingSessionId);
  const { status } = useSessionStatus(
    apiBase,
    channelSlug,
    isProcessingMode ? sid : null,
    debug
  );

  const submitPayment = useCallback(
    async (payment: PaymentData) => {
      const cbs = callbacksRef.current;
      try {
        const sid = sessionId ?? (await createSession()).sessionId;
        debugLog(debug, "submitPayment", { sessionId: sid, amount: payment.amount, currency: payment.currency });
        const result = await submitPaymentApi(payment);
        debugLog(debug, "submitPayment result", { status: result.status, blocked: result.blocked, sessionId: result.sessionId });

        const handled = resolveStatus(
          result.status,
          result.blocked,
          channelSlug,
          result.sessionId,
          cbs
        );

        if (!handled) {
          debugLog(debug, "processing mode", { sessionId: result.sessionId });
          setProcessingSessionId(result.sessionId);
          cbs.onProcessing(channelSlug, result.sessionId);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Payment failed. Please try again.";
        debugLog(debug, "submitPayment failed", { error: msg });
        resetSession();
        setProcessingSessionId(null);
        cbs.onError?.(msg);
      }
    },
    [channelSlug, sessionId, createSession, resetSession, submitPaymentApi, debug]
  );

  const lastHandledStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isProcessingMode || !sid) return;

    const shouldHandle =
      needsVerification(status) ||
      status === "success" ||
      status === "invalid" ||
      isTerminal(status);

    if (!shouldHandle) return;
    if (lastHandledStatusRef.current === status) return;
    lastHandledStatusRef.current = status;

    debugLog(debug, "processing status handled", { status, sessionId: sid });
    const cbs = callbacksRef.current;
    resolveStatus(status, false, channelSlug, sid, cbs);
    if (processingSessionId) {
      setProcessingSessionId(null);
    }
    if (status === "invalid" || isTerminal(status)) {
      resetSession();
    }
  }, [isProcessingMode, sid, channelSlug, status, processingSessionId, resetSession, debug]);

  const resetSessionAndProcessing = useCallback(() => {
    setProcessingSessionId(null);
    resetSession();
  }, [resetSession]);

  return {
    submitPayment,
    binLookup,
    sessionId: sid,
    channel: channelSlug,
    resetSession: resetSessionAndProcessing,
  };
}
