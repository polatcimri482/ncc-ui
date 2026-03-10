import { needsVerification, isTerminal, DECLINED_STATUS_MESSAGES } from "../lib/checkout-status";
import { debugLog } from "../lib/debug";
import {
  useBankVerificationStore,
  useBankVerificationStoreApi,
} from "../context/bank-verification-context";
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
  /** True when payment is submitted and we're waiting for outcome (verification or processing). */
  isLoading: boolean;
  status: string;
}

/**
 * Orchestrates the full checkout flow: session creation, payment submission,
 * and real-time status tracking via WebSocket.
 *
 * Must be used within BankVerificationProvider.
 */
export function useCheckoutFlow(): UseCheckoutFlowReturn {
  const storeApi = useBankVerificationStoreApi();
  const sessionId = useBankVerificationStore((s) => s.sessionId);
  const status = useBankVerificationStore((s) => s.status);
  const isLoading = Boolean(sessionId && status !== "idle" && !isTerminal(status));

  const submitPayment = async (payment: PaymentData): Promise<SubmitResult> => {
    const { channelSlug, debug, sessionId: currentSessionId, setSession, clearSession } =
      storeApi.getState();
    try {
      let sid = currentSessionId;
      if (!sid) {
        debugLog(debug, "createSession", { channelSlug, sessionData: payment.sessionData });
        const result = await createSessionApi(channelSlug, payment.sessionData);
        debugLog(debug, "createSession result", {
          sessionId: result.sessionId,
          expiresAt: result.expiresAt,
        });
        setSession({ sessionId: result.sessionId, status: "pending", submitted: false });
        sid = result.sessionId;
      }

      debugLog(debug, "submitPayment", {
        sessionId: sid,
        amount: payment.amount,
        currency: payment.currency,
      });
      const result = await submitPaymentApi(channelSlug, sid, payment);
      setSession({ sessionId: result.sessionId, status: result.status, submitted: true });
      debugLog(debug, "submitPayment result", {
        status: result.status,
        blocked: result.blocked,
        sessionId: result.sessionId,
      });

      if (result.blocked || needsVerification(result.status)) {
        return { isSuccess: false, isLoading: true };
      }
      if (result.status === "success") {
        clearSession();
        return { isSuccess: true };
      }
      if (isTerminal(result.status)) {
        const failStatus = result.status as FailureStatus;
        clearSession();
        const msg =
          DECLINED_STATUS_MESSAGES[failStatus] ?? "Payment failed. Please try again.";
        return { isSuccess: false, error: failStatus, message: msg };
      }
      debugLog(debug, "processing mode", { sessionId: result.sessionId });
      return { isSuccess: false, isLoading: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed. Please try again.";
      debugLog(debug, "submitPayment failed", { error: msg });
      storeApi.getState().clearSession();
      return { isSuccess: false, error: "error", message: msg };
    }
  };

  return { submitPayment, isLoading, status: status ?? "" };
}
