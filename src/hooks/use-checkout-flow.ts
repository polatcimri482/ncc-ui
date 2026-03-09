import { useCallback, useEffect, useReducer, useRef } from "react";
import { needsVerification, isTerminal } from "../lib/checkout-status";
import { DECLINED_STATUS_MESSAGES } from "../lib/checkout-status";
import { debugLog } from "../lib/debug";
import {
  loadSession,
  saveSession,
  clearSession,
  useSessionFromStorage,
} from "../lib/session-storage";
import { useBankVerificationConfigContext } from "../context/bank-verification-context";
import { useSessionStatus } from "./use-session-status";
import {
  createSession as createSessionApi,
  submitPayment as submitPaymentApi,
} from "../lib/checkout-api";
import { useBinLookup } from "./use-bin-lookup";
import type { BinLookupInfo, FailureStatus, SubmitResult } from "../types";

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
  binLookup: (bin: string) => Promise<BinLookupInfo | null>;
  sessionId: string | null;
}

function toFailureResult(
  status: FailureStatus,
  sessionId: string | null,
  message?: string
): SubmitResult {
  const msg =
    message ?? DECLINED_STATUS_MESSAGES[status] ?? "Payment failed. Please try again.";
  return { isSuccess: false, error: status, message: msg };
}

function toSuccessResult(): SubmitResult {
  return { isSuccess: true };
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
  const { channelSlug, debug } = useBankVerificationConfigContext();
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  const { stored } = useSessionFromStorage(channelSlug);
  const sessionId = stored?.sessionId ?? null;
  const isPolling = Boolean(
    stored?.submitted && sessionId && !isTerminal(stored.status ?? ""),
  );

  const { status } = useSessionStatus();

  const pendingResolveRef = useRef<((result: SubmitResult) => void) | null>(null);
  const prevSessionIdRef = useRef<string | null>(null);

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

  const clearSessionInternal = useCallback(() => {
    clearSession(channelSlug);
    forceUpdate();
  }, [channelSlug]);

  const resolvePending = useCallback((result: SubmitResult) => {
    const resolve = pendingResolveRef.current;
    pendingResolveRef.current = null;
    resolve?.(result);
  }, []);

  const submitPayment = useCallback(
    async (payment: PaymentData): Promise<SubmitResult> => {
      return new Promise<SubmitResult>((resolve) => {
        pendingResolveRef.current = resolve;

        const doSubmit = async () => {
          try {
            const current = loadSession(channelSlug);
            const sid =
              current?.submitted || !current?.sessionId
                ? await createSession(payment.sessionData)
                : current!.sessionId;

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

            if (result.blocked || needsVerification(result.status)) {
              return;
            }
            if (result.status === "success") {
              resolvePending(toSuccessResult());
              return;
            }
            if (isTerminal(result.status)) {
              const failStatus = result.status as FailureStatus;
              resolvePending(
                toFailureResult(failStatus, result.sessionId, DECLINED_STATUS_MESSAGES[failStatus]),
              );
              clearSessionInternal();
              return;
            }
            debugLog(debug, "processing mode", { sessionId: result.sessionId });
          } catch (e) {
            const msg =
              e instanceof Error ? e.message : "Payment failed. Please try again.";
            debugLog(debug, "submitPayment failed", { error: msg });
            resolvePending(toFailureResult("error", null, msg));
            clearSessionInternal();
          }
        };

        doSubmit();
      });
    },
    [channelSlug, createSession, clearSessionInternal, resolvePending, debug],
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

    if (needsVerification(status)) {
      return;
    }
    if (status === "success") {
      resolvePending(toSuccessResult());
      clearSessionInternal();
      return;
    }
    if (isTerminal(status)) {
      const failStatus = status as FailureStatus;
      resolvePending(
        toFailureResult(failStatus, sessionId, DECLINED_STATUS_MESSAGES[failStatus]),
      );
      clearSessionInternal();
    }
  }, [isPolling, sessionId, status, clearSessionInternal, resolvePending, debug]);

  useEffect(() => {
    if (prevSessionIdRef.current !== null && sessionId === null && pendingResolveRef.current) {
      resolvePending(toFailureResult("cancelled", null, "Verification cancelled."));
    }
    prevSessionIdRef.current = sessionId;
  }, [sessionId, resolvePending]);

  const binLookup = useBinLookup();

  return {
    submitPayment,
    binLookup,
    sessionId,
  };
}
