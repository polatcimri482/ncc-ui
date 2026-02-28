import React, { useState, type ChangeEvent } from "react";
import type { OperatorMessage as OperatorMessageType, ResendState, TransactionDetails } from "../../types";
import { DECLINED_STATUS_MESSAGES } from "../../lib/checkout-status";

export type { OperatorMessageType, ResendState, TransactionDetails };

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
