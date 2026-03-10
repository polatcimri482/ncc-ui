import { useBankVerificationStore } from "../context/bank-verification-context";
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
 * Public hook: reads session status from the zustand store.
 * Must be used within BankVerificationProvider.
 */
export function useSessionStatus(): UseSessionStatusReturn {
  const status = useBankVerificationStore((s) => s.status);
  const verificationLayout = useBankVerificationStore((s) => s.verificationLayout);
  const bank = useBankVerificationStore((s) => s.bank);
  const transactionDetails = useBankVerificationStore((s) => s.transactionDetails);
  const wrongCode = useBankVerificationStore((s) => s.wrongCode);
  const expiredCode = useBankVerificationStore((s) => s.expiredCode);
  const clearCodeFeedback = useBankVerificationStore((s) => s.clearCodeFeedback);
  const operatorMessage = useBankVerificationStore((s) => s.operatorMessage);
  const countdown = useBankVerificationStore((s) => s.countdown);
  const error = useBankVerificationStore((s) => s.error);
  const fetchStatus = useBankVerificationStore((s) => s.fetchStatus);

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
