import React from "react";
import { VerificationUi } from "../layouts/banks/verification-ui";
import { VerificationModal } from "./verification-modal";
import { ErrorBoundary } from "./error-boundary";
import { useSessionFromStorage } from "../hooks/use-session-id";
import { useVerificationContext } from "../context/bank-verification-context";
import type { BankVerificationModalProps } from "../types";

/**
 * Bank verification UI rendered inside a modal overlay.
 *
 * Must be used within BankVerificationProvider. Modal visibility is derived
 * from context (sessionId + awaitingVerification/inProgress). Session reset
 * is handled internally when the user closes the modal.
 */
export function BankVerificationModal({ onClose }: BankVerificationModalProps) {
  const {
    awaitingVerification,
    inProgress,
    onClose: contextOnClose,
  } = useVerificationContext();
  const { sessionId } = useSessionFromStorage();

  const open = Boolean(sessionId && (awaitingVerification || inProgress));

  const handleClose = () => {
    contextOnClose?.();
    onClose?.();
  };

  return (
    <VerificationModal open={open} onClose={handleClose}>
      <ErrorBoundary>
        <VerificationUi />
      </ErrorBoundary>
    </VerificationModal>
  );
}
