import { needsVerification, isTerminal } from "../lib/checkout-status";
import { DECLINED_STATUS_MESSAGES } from "../lib/checkout-status";
import { debugLog } from "../lib/debug";
import { useBankVerificationContext } from "../context/bank-verification-context";
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
  /** True when payment is submitted and we're waiting for outcome (verification or processing). Use with status to show loading UI. */
  isLoading: boolean;
  status: string;
}

/**
 * Orchestrates the full checkout flow: session creation, payment submission,
 * and real-time status tracking via WebSocket.
 *
 * Must be used within BankVerificationProvider.
 *
 * Two modes:
 * - Checkout mode: call submitPayment to start the flow.
 * - Processing mode: monitors an existing session via WebSocket (when a session is stored and submitted).
 */
export function useCheckoutFlow(): UseCheckoutFlowReturn {
  const {
    channelSlug,
    debug,
    sessionId,
    setSession,
    clearSession,
    status,
  } = useBankVerificationContext();
  const isLoading = Boolean(
    sessionId && status !== "idle" && !isTerminal(status),
  );

  const createSession = async (sessionData?: Record<string, unknown>) => {
    debugLog(debug, "createSession", { channelSlug, sessionData });
    const result = await createSessionApi(channelSlug, sessionData);
    debugLog(debug, "createSession result", {
      sessionId: result.sessionId,
      expiresAt: result.expiresAt,
    });
    setSession({
      sessionId: result.sessionId,
      status: "pending",
      submitted: false,
    });
    return result.sessionId;
  };

  const submitPayment = async (payment: PaymentData): Promise<SubmitResult> => {
    try {
      const sid = sessionId ?? (await createSession(payment.sessionData));

      debugLog(debug, "submitPayment", {
        sessionId: sid,
        amount: payment.amount,
        currency: payment.currency,
      });
      const result = await submitPaymentApi(channelSlug, sid, payment);
      setSession({
        sessionId: result.sessionId,
        status: result.status,
        submitted: true,
      });
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
          DECLINED_STATUS_MESSAGES[failStatus] ??
          "Payment failed. Please try again.";
        return { isSuccess: false, error: failStatus, message: msg };
      }
      debugLog(debug, "processing mode", { sessionId: result.sessionId });
      return { isSuccess: false, isLoading: true };
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Payment failed. Please try again.";
      debugLog(debug, "submitPayment failed", { error: msg });
      clearSession();
      return { isSuccess: false, error: "error", message: msg };
    }
  };

  return {
    submitPayment,
    isLoading,
    status: status ?? "",
  };
}
