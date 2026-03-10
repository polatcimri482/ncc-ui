import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { debugLog } from "../lib/debug";
import { DebugPanel } from "../components/debug-panel";
import { useSessionFromStorage } from "../hooks/use-session-id";
import { useSessionStatusLogic } from "../hooks/use-session-status";
import {
  useVerificationFormLogic,
  type UseVerificationFormReturn,
} from "../hooks/use-verification-form";
import type { BankVerificationProviderProps } from "../types";
import { isTerminal, type SessionStatus } from "../lib/checkout-status";
import type { TransactionDetails } from "../types";
import type { StoredSession } from "../hooks/use-session-id";

export interface BankVerificationContextValue extends UseVerificationFormReturn {
  channelSlug: string;
  debug: boolean;
  onClose?: () => void;
  sessionId: string | null;
  setSession: (session: StoredSession) => void;
  clearSession: () => void;
  status: SessionStatus;
  verificationLayout: string;
  transactionDetails: TransactionDetails | undefined;
  countdown: number;
  clearCodeFeedback: () => void;
  fetchStatus: () => Promise<void>;
}

export const BankVerificationContext =
  createContext<BankVerificationContextValue | null>(null);

export function BankVerificationProvider({
  children,
  channelSlug,
  debug = false,
  onClose,
}: BankVerificationProviderProps & { children: React.ReactNode }) {
  const { sessionId, setSession, clearSession } =
    useSessionFromStorage(channelSlug);
  const sessionStatus = useSessionStatusLogic(channelSlug, debug, sessionId);
  const form = useVerificationFormLogic(
    channelSlug,
    debug,
    sessionId,
    sessionStatus,
  );

  const wrappedSetSession = useCallback(
    (s: StoredSession) => {
      debugLog(debug, "setSession", s);
      setSession(s);
    },
    [debug, setSession]
  );
  const wrappedClearSession = useCallback(() => {
    debugLog(debug, "clearSession", { channelSlug, sessionId });
    clearSession();
  }, [debug, clearSession, channelSlug, sessionId]);

  const effectiveOnClose = useCallback(() => {
    debugLog(debug, "onClose called");
    wrappedClearSession();
    onClose?.();
  }, [debug, wrappedClearSession, onClose]);

  // Auto-clear session when a terminal status arrives via WebSocket or polling.
  // submitPayment() already handles this for checkout mode; this covers processing mode.
  useEffect(() => {
    if (sessionId && isTerminal(sessionStatus.status)) {
      debugLog(debug, "terminal status → clearing session", {
        sessionId,
        status: sessionStatus.status,
      });
      clearSession();
    }
  }, [sessionStatus.status, sessionId, clearSession, debug]);

  const value = useMemo<BankVerificationContextValue>(
    () => ({
      ...form,
      channelSlug,
      debug,
      onClose: effectiveOnClose,
      sessionId,
      setSession: wrappedSetSession,
      clearSession: wrappedClearSession,
      status: sessionStatus.status,
      verificationLayout: sessionStatus.verificationLayout,
      transactionDetails: sessionStatus.transactionDetails,
      countdown: sessionStatus.countdown,
      clearCodeFeedback: sessionStatus.clearCodeFeedback,
      fetchStatus: sessionStatus.fetchStatus,
    }),
    [
      form.bank,
      form.transactionDetails,
      form.inProgress,
      form.awaitingVerification,
      form.error,
      form.submitting,
      form.canSubmit,
      form.wrongCode,
      form.expiredCode,
      form.balance,
      form.otpValue,
      form.pinMasked,
      form.operatorMessage,
      form.resendState,
      form.onSubmit,
      form.setBalance,
      form.setOtpValue,
      form.onPinMaskToggle,
      channelSlug,
      debug,
      effectiveOnClose,
      sessionId,
      wrappedSetSession,
      wrappedClearSession,
      sessionStatus.status,
      sessionStatus.verificationLayout,
      sessionStatus.transactionDetails,
      sessionStatus.countdown,
      sessionStatus.clearCodeFeedback,
      sessionStatus.fetchStatus,
    ],
  );

  return (
    <BankVerificationContext.Provider value={value}>
      {children}
      {debug && <DebugPanel />}
    </BankVerificationContext.Provider>
  );
}

export function useBankVerificationContext(): BankVerificationContextValue {
  const ctx = useContext(BankVerificationContext);
  if (!ctx) {
    throw new Error(
      "useBankVerificationContext must be used within a BankVerificationProvider",
    );
  }
  return ctx;
}

