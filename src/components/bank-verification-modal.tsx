import React from "react";
import { VerificationUi } from "../layouts/banks/verification-ui";
import { VerificationModal } from "./verification-modal";
import type { BankVerificationModalProps } from "../types";

/**
 * Bank verification UI rendered inside a modal overlay.
 *
 * When the modal closes, `onClose` is called — call `resetSession()` from
 * `useCheckoutFlow` inside your `onClose` handler to clear the session state.
 */
export function BankVerificationModal({
  open,
  onClose,
  channelSlug,
  sessionId,
  debug,
  onSuccess,
  onFailed,
}: BankVerificationModalProps) {
  return (
    <VerificationModal open={open} onClose={onClose ?? (() => {})}>
      <VerificationUi
        channelSlug={channelSlug}
        sessionId={sessionId}
        debug={debug}
        onSuccess={onSuccess}
        onFailed={onFailed}
        onClose={onClose}
      />
    </VerificationModal>
  );
}
