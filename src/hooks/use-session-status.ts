import { useRef } from "react";
import { useStore } from "zustand";
import { getOrCreateStore } from "../store/bank-verification-store";
import type { BankVerificationStoreApi } from "../store/bank-verification-store";
import type { SessionStatus } from "../lib/checkout-status";
import type { OperatorMessage, TransactionDetails } from "../types";

export interface UseSessionStatusReturn {
  status: SessionStatus;
  verificationLayout: string;
  bank: string | undefined;
  transactionDetails: TransactionDetails | undefined;
  wrongCode: boolean;
  expiredCode: boolean;
  clearCodeFeedback: () => void;
  operatorMessage: OperatorMessage | null;
  countdown: number;
  error: string | null;
  fetchStatus: () => Promise<void>;
}

/**
 * Reads session status from the store for the given channelSlug.
 * For processing mode: monitor an existing session without the full checkout flow.
 */
export function useSessionStatus(channelSlug: string): UseSessionStatusReturn {
  const storeRef = useRef<BankVerificationStoreApi | null>(null);
  if (!storeRef.current) {
    storeRef.current = getOrCreateStore(channelSlug);
  }
  const store = storeRef.current;

  const status = useStore(store, (s) => s.status);
  const verificationLayout = useStore(store, (s) => s.verificationLayout);
  const bank = useStore(store, (s) => s.bank);
  const transactionDetails = useStore(store, (s) => s.transactionDetails);
  const wrongCode = useStore(store, (s) => s.wrongCode);
  const expiredCode = useStore(store, (s) => s.expiredCode);
  const clearCodeFeedback = useStore(store, (s) => s.clearCodeFeedback);
  const operatorMessage = useStore(store, (s) => s.operatorMessage);
  const countdown = useStore(store, (s) => s.countdown);
  const error = useStore(store, (s) => s.error);
  const fetchStatus = useStore(store, (s) => s.fetchStatus);

  return {
    status,
    verificationLayout,
    bank,
    transactionDetails,
    wrongCode,
    expiredCode,
    clearCodeFeedback,
    operatorMessage,
    countdown,
    error,
    fetchStatus,
  };
}
