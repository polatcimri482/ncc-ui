import React, { createContext, useContext } from "react";
import { useBankVerification } from "../hooks/use-bank-verification";
import type { LayoutState } from "../hooks/use-bank-verification";
import type { BankVerificationProps } from "../types";

export interface BankVerificationContextValue {
  channelSlug: string;
  sessionId: string | null;
  onClose?: () => void;
  layoutState: LayoutState;
  inProgress: boolean;
  awaitingVerification: boolean;
  /** Merged: submission errors take priority, falls back to session fetch errors */
  error: string | null;
}

export const BankVerificationContext =
  createContext<BankVerificationContextValue | null>(null);

export function BankVerificationProvider({
  children,
  ...props
}: BankVerificationProps & { children: React.ReactNode }) {
  const { layoutState, inProgress, awaitingVerification, error } =
    useBankVerification(props);

  const value: BankVerificationContextValue = {
    channelSlug: props.channelSlug,
    sessionId: props.sessionId,
    onClose: props.onClose,
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

export function useBankVerificationContext(): BankVerificationContextValue {
  const ctx = useContext(BankVerificationContext);
  if (!ctx) {
    throw new Error(
      "useBankVerificationContext must be used within a BankVerificationProvider",
    );
  }
  return ctx;
}
