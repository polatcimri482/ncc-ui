import React from "react";
import { VerificationUi } from "../layouts/banks/verification-ui";
import { VerificationModal } from "./verification-modal";
import { ErrorBoundary } from "./error-boundary";
import { useBankVerificationStore } from "../context/bank-verification-context";
import { useVerificationForm } from "../hooks/use-verification-form";
import type { BankVerificationModalProps } from "../types";

/**
 * Bank verification UI rendered inside a modal overlay.
 *
 * Must be used within BankVerificationProvider. Modal visibility is derived
 * from the store (sessionId + awaitingVerification/inProgress). Session reset
 * is handled internally when the user closes the modal.
 */
export function BankVerificationModal({ onClose }: BankVerificationModalProps) {
  const sessionId = useBankVerificationStore((s) => s.sessionId);
  const contextOnClose = useBankVerificationStore((s) => s.onClose);
  const { awaitingVerification, inProgress } = useVerificationForm();

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
