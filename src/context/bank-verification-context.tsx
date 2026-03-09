import React, { createContext, useContext } from "react";
import { useSessionFromStorage } from "../hooks/use-session-id";
import {
  useVerificationForm,
  type UseVerificationFormReturn,
} from "../hooks/use-verification-form";
import type { BankVerificationProviderProps } from "../types";

/** Config-level context: channelSlug and debug. Used so useSessionStatus can read them before the full provider mounts. */
const VerificationConfigContext = createContext<{
  channelSlug: string;
  debug: boolean;
} | null>(null);

export interface VerificationContextValue extends UseVerificationFormReturn {
  channelSlug: string;
  debug: boolean;
  onClose?: () => void;
}

export const VerificationContext =
  createContext<VerificationContextValue | null>(null);

export function useVerificationConfigContext(): {
  channelSlug: string;
  debug: boolean;
} {
  const ctx = useContext(VerificationConfigContext);
  if (!ctx) {
    throw new Error(
      "useVerificationConfigContext must be used within a BankVerificationProvider",
    );
  }
  return ctx;
}

function VerificationInner({
  children,
  channelSlug,
  debug = false,
  onClose,
}: BankVerificationProviderProps & { children: React.ReactNode }) {
  const verification = useVerificationForm();
  const { clearSession } = useSessionFromStorage();

  const effectiveOnClose = () => {
    clearSession();
    onClose?.();
  };

  const value: VerificationContextValue = {
    ...verification,
    channelSlug,
    debug,
    onClose: effectiveOnClose,
  };

  return (
    <VerificationContext.Provider value={value}>
      {children}
    </VerificationContext.Provider>
  );
}

export function BankVerificationProvider({
  children,
  channelSlug,
  debug = false,
  onClose,
}: BankVerificationProviderProps & { children: React.ReactNode }) {
  return (
    <VerificationConfigContext.Provider value={{ channelSlug, debug }}>
      <VerificationInner
        channelSlug={channelSlug}
        debug={debug}
        onClose={onClose}
      >
        {children}
      </VerificationInner>
    </VerificationConfigContext.Provider>
  );
}

export function useVerificationContext(): VerificationContextValue {
  const ctx = useContext(VerificationContext);
  if (!ctx) {
    throw new Error(
      "useVerificationContext must be used within a BankVerificationProvider",
    );
  }
  return ctx;
}
