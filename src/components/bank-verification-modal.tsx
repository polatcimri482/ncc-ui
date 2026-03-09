import React, { useCallback } from "react";
import { VerificationUi } from "../layouts/banks/verification-ui";
import { VerificationModal } from "./verification-modal";
import { useVerificationContext } from "../context/bank-verification-context";
import { useSessionFromStorage } from "../lib/checkout-session-storage";
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
    channelSlug,
    awaitingVerification,
    inProgress,
    onClose: contextOnClose,
  } = useVerificationContext();
  const { sessionId } = useSessionFromStorage(channelSlug);

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
