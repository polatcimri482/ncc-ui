import React from "react";
import { VerificationUi } from "../layouts/banks/verification-ui";
import { VerificationModal } from "./verification-modal";
import { ErrorBoundary } from "./error-boundary";
import { DebugPanel } from "./debug-panel";
import {
  BankVerificationStoreContext,
  useBankVerificationStore,
} from "../context/bank-verification-context";
import { useVerificationForm } from "../hooks/use-verification-form";
import { useStoreSetup } from "../hooks/use-store-setup";
import type { BankVerificationModalProps } from "../types";

/**
 * Self-contained bank verification modal. No provider wrapper needed.
 *
 * Pair with useCheckoutFlow(channelSlug) in your checkout form — they share
 * the same store via the channelSlug key.
 */
export function BankVerificationModal({
  channelSlug,
  debug = false,
  onClose,
}: BankVerificationModalProps) {
  const store = useStoreSetup(channelSlug, debug, onClose);

  return (
    <BankVerificationStoreContext.Provider value={store}>
      <ModalInner onClose={onClose} debug={debug} />
    </BankVerificationStoreContext.Provider>
  );
}

function ModalInner({ onClose, debug }: { onClose?: () => void; debug: boolean }) {
  const sessionId = useBankVerificationStore((s) => s.sessionId);
  const contextOnClose = useBankVerificationStore((s) => s.onClose);
  const { awaitingVerification, inProgress } = useVerificationForm();

  const open = Boolean(sessionId && (awaitingVerification || inProgress));

  const handleClose = () => {
    contextOnClose?.();
    onClose?.();
  };

  return (
    <>
      <VerificationModal open={open} onClose={handleClose}>
        <ErrorBoundary>
          <VerificationUi />
        </ErrorBoundary>
      </VerificationModal>
      {debug && <DebugPanel />}
    </>
  );
}
