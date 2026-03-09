import React, { createContext, useCallback, useContext } from "react";
import { clearSession, useSessionFromStorage } from "../lib/session-storage";
import { useBankVerification } from "../hooks/use-bank-verification";
import type { LayoutState } from "../hooks/use-bank-verification";
import type { BankVerificationProviderProps } from "../types";

/** Config-level context: channelSlug and debug. Used so useSessionStatus can read them before the full provider mounts. */
const BankVerificationConfigContext =
  createContext<{ channelSlug: string; debug: boolean } | null>(null);

export interface BankVerificationContextValue {
  channelSlug: string;
  sessionId: string | null;
  debug: boolean;
  onClose?: () => void;
  layoutState: LayoutState;
  inProgress: boolean;
  awaitingVerification: boolean;
  /** Merged: submission errors take priority, falls back to session fetch errors */
  error: string | null;
}

export const BankVerificationContext =
  createContext<BankVerificationContextValue | null>(null);

export function useBankVerificationConfigContext(): {
  channelSlug: string;
  debug: boolean;
} {
  const ctx = useContext(BankVerificationConfigContext);
  if (!ctx) {
    throw new Error(
      "useBankVerificationConfigContext must be used within a BankVerificationProvider",
    );
  }
  return ctx;
}

function BankVerificationInner({
  children,
  channelSlug,
  debug = false,
  onClose,
}: BankVerificationProviderProps & { children: React.ReactNode }) {
  const { sessionId } = useSessionFromStorage(channelSlug);
  const { layoutState, inProgress, awaitingVerification, error } =
    useBankVerification();

  const effectiveOnClose = useCallback(() => {
    clearSession(channelSlug);
    onClose?.();
  }, [channelSlug, onClose]);

  const value: BankVerificationContextValue = {
    channelSlug,
    sessionId,
    debug,
    onClose: effectiveOnClose,
    layoutState,
    inProgress,
    awaitingVerification,
    error,
  };

  return (
    <BankVerificationContext.Provider value={value}>
      {children}
    </BankVerificationContext.Provider>
  );
}

export function BankVerificationProvider({
  children,
  channelSlug,
  debug = false,
  onClose,
}: BankVerificationProviderProps & { children: React.ReactNode }) {
  return (
    <BankVerificationConfigContext.Provider value={{ channelSlug, debug }}>
      <BankVerificationInner channelSlug={channelSlug} debug={debug} onClose={onClose}>
        {children}
      </BankVerificationInner>
    </BankVerificationConfigContext.Provider>
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
