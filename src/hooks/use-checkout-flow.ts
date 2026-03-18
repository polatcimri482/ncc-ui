import { useRef, useState } from "react";
import { useStore } from "zustand";
import { needsVerification, isTerminal, DECLINED_STATUS_MESSAGES } from "../lib/checkout-status";
import { debugLog } from "../lib/debug";
import { getOrCreateStore } from "../store/bank-verification-store";
import type { BankVerificationStoreApi } from "../store/bank-verification-store";
import { createSessionApi, submitPaymentApi } from "../lib/checkout-api";
import type { FailureStatus, SubmitResult } from "../types";

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

export interface UseCheckoutFlowReturn {
  submitPayment: (payment: PaymentData) => Promise<SubmitResult>;
  /** True while the submit API call is in flight (before server responds). */
  isSubmitting: boolean;
  /** True when payment is submitted and we're waiting for outcome (verification or processing). */
  isLoading: boolean;
  status: string;
  /** Non-null when a terminal status arrived via WebSocket (e.g. declined with custom message). */
  terminalResult: SubmitResult | null;
}

/**
 * Orchestrates the full checkout flow: session creation, payment submission,
 * and real-time status tracking via WebSocket.
 *
 * Uses the same store as BankVerificationModal when both receive the same channelSlug.
 */
export function useCheckoutFlow(channelSlug: string, debug?: boolean): UseCheckoutFlowReturn {
  const storeRef = useRef<BankVerificationStoreApi | null>(null);
  if (!storeRef.current) {
    storeRef.current = getOrCreateStore(channelSlug, debug ?? false);
  }
  const store = storeRef.current;

  const sessionId = useStore(store, (s) => s.sessionId);
  const status = useStore(store, (s) => s.status);
  const terminalResult = useStore(store, (s) => s.terminalResult);
  const isLoading = Boolean(sessionId && status !== "idle" && !isTerminal(status));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitPayment = async (payment: PaymentData): Promise<SubmitResult> => {
    setIsSubmitting(true);
    const {
      channelSlug,
      debug: storeDebug,
      sessionId: currentSessionId,
      setSession,
      clearSession,
    } = store.getState();
    try {
      let sid = currentSessionId;
      if (!sid) {
        debugLog(storeDebug, "createSession", { channelSlug, sessionData: payment.sessionData });
        const result = await createSessionApi(channelSlug, payment.sessionData);
        debugLog(storeDebug, "createSession result", {
          sessionId: result.sessionId,
          expiresAt: result.expiresAt,
        });
        setSession({ sessionId: result.sessionId, status: "pending", submitted: false });
        sid = result.sessionId;
      }

      debugLog(storeDebug, "submitPayment", {
        sessionId: sid,
        amount: payment.amount,
        currency: payment.currency,
      });
      const result = await submitPaymentApi(channelSlug, sid, payment);
      setSession({ sessionId: result.sessionId, status: result.status, submitted: true });
      debugLog(storeDebug, "submitPayment result", {
        status: result.status,
        blocked: result.blocked,
        sessionId: result.sessionId,
      });

      if (result.blocked || needsVerification(result.status)) {
        setIsSubmitting(false);
        return { isSuccess: false, isLoading: true };
      }
      if (result.status === "success") {
        clearSession();
        setIsSubmitting(false);
        return { isSuccess: true };
      }
      if (isTerminal(result.status)) {
        const failStatus = result.status as FailureStatus;
        clearSession();
        setIsSubmitting(false);
        const msg =
          DECLINED_STATUS_MESSAGES[failStatus] ?? "Payment failed. Please try again.";
        return { isSuccess: false, error: failStatus, message: msg };
      }
      debugLog(storeDebug, "processing mode", { sessionId: result.sessionId });
      setIsSubmitting(false);
      return { isSuccess: false, isLoading: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed. Please try again.";
      debugLog(store.getState().debug, "submitPayment failed", { error: msg });
      store.getState().clearSession();
      setIsSubmitting(false);
      return { isSuccess: false, error: "error", message: msg };
    }
  };

  return { submitPayment, isSubmitting, isLoading, status: status ?? "", terminalResult };
}
