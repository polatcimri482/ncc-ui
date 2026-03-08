import React from "react";
import { VerificationUi } from "../layouts/banks/verification-ui";
import { VerificationModal } from "./verification-modal";
import type { BankVerificationModalProps } from "../types";

/**
 * Bank verification UI rendered inside a modal overlay.
 * Use when embedding verification in a page (e.g. checkout) and opening on demand.
 * For full-page/route usage, use BankVerification directly.
 */
export function BankVerificationModal({
  open,
  onClose,
  apiBase,
  channelSlug,
  sessionId,
  debug,
  onSuccess,
  onDeclined,
  onError,
  onRedirect,
}: BankVerificationModalProps) {
  const handleClose = () => {
    onClose?.();
  };

  return (
    <VerificationModal open={open} onClose={handleClose}>
      <VerificationUi
        apiBase={apiBase}
        channelSlug={channelSlug}
        sessionId={sessionId}
        debug={debug}
        onSuccess={onSuccess}
        onDeclined={onDeclined}
        onError={onError}
        onRedirect={onRedirect}
        onClose={handleClose}
      />
    </VerificationModal>
  );
}
