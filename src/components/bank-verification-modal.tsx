import React, { useCallback } from "react";
import { VerificationUi } from "../layouts/banks/verification-ui";
import { VerificationModal } from "./verification-modal";
import { useBankVerificationContext } from "../context/bank-verification-context";
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
    sessionId,
    awaitingVerification,
    inProgress,
    onClose: contextOnClose,
  } = useBankVerificationContext();

  const open = Boolean(sessionId && (awaitingVerification || inProgress));

  const handleClose = useCallback(() => {
    contextOnClose?.();
    onClose?.();
  }, [contextOnClose, onClose]);

  return (
    <VerificationModal open={open} onClose={handleClose}>
      <VerificationUi />
    </VerificationModal>
  );
}
