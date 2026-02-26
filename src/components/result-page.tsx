import React from "react";
import { DECLINED_STATUS_MESSAGES } from "../lib/checkout-status";

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
