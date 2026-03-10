import { useOtpResendCountdown } from "./use-otp-resend-countdown";
import { useBankVerificationStore } from "../store/bank-verification-store";
import type { OperatorMessage, ResendState, TransactionDetails } from "../types";

const RESEND_COOLDOWN = 60;
const PIN_LENGTH = 4;
const OTP_MIN_LENGTH = 6;

export interface UseVerificationFormReturn {
  bank?: string;
  transactionDetails?: TransactionDetails;
  inProgress: boolean;
  awaitingVerification: boolean;
  error: string | null;
  onSubmit: () => void;
  submitting: boolean;
  canSubmit: boolean;
  operatorMessage: OperatorMessage | null;
  balance: string;
  setBalance: (v: string) => void;
  otpValue: string;
  setOtpValue: (v: string) => void;
  wrongCode: boolean;
  expiredCode: boolean;
  resendState: ResendState;
  pinMasked: boolean;
  onPinMaskToggle: () => void;
}

/**
 * Verification form state. Must be used within BankVerificationProvider.
 * Reads shared state from the zustand store; keeps OTP countdown timer local.
 */
export function useVerificationForm(): UseVerificationFormReturn {
  const status = useBankVerificationStore((s) => s.status);
  const verificationLayout = useBankVerificationStore((s) => s.verificationLayout);
  const bank = useBankVerificationStore((s) => s.bank);
  const transactionDetails = useBankVerificationStore((s) => s.transactionDetails);
  const wrongCode = useBankVerificationStore((s) => s.wrongCode);
  const expiredCode = useBankVerificationStore((s) => s.expiredCode);
  const operatorMessage = useBankVerificationStore((s) => s.operatorMessage);
  const countdown = useBankVerificationStore((s) => s.countdown);
  const fetchError = useBankVerificationStore((s) => s.error);
  const submitting = useBankVerificationStore((s) => s.submitting);
  const submitError = useBankVerificationStore((s) => s.submitError);
  const otpValue = useBankVerificationStore((s) => s.otpValue);
  const balance = useBankVerificationStore((s) => s.balance);
  const pinMasked = useBankVerificationStore((s) => s.pinMasked);
  const setOtpValue = useBankVerificationStore((s) => s.setOtpValue);
  const setBalance = useBankVerificationStore((s) => s.setBalance);
  const onPinMaskToggle = useBankVerificationStore((s) => s.togglePinMasked);
  const resendOtpAction = useBankVerificationStore((s) => s.resendOtpAction);
  const onSubmit = useBankVerificationStore((s) => s.onSubmit);

  // OTP countdown timer — kept local since only the form UI needs it
  const resendState = useOtpResendCountdown(RESEND_COOLDOWN, countdown, resendOtpAction);

  const inProgress = status === "pending" || status === "awaiting_action";
  const awaitingVerification =
    status === "awaiting_sms" ||
    status === "awaiting_pin" ||
    status === "awaiting_push" ||
    status === "awaiting_balance";

  const canSubmit =
    verificationLayout === "balance"
      ? balance.trim().length > 0
      : verificationLayout === "pin"
        ? otpValue.replace(/\D/g, "").length === PIN_LENGTH
        : otpValue.replace(/\D/g, "").length >= OTP_MIN_LENGTH;

  return {
    bank,
    transactionDetails,
    inProgress,
    awaitingVerification,
    error: submitError ?? fetchError,
    onSubmit,
    submitting,
    canSubmit,
    operatorMessage: operatorMessage ?? null,
    balance,
    setBalance,
    otpValue,
    setOtpValue,
    wrongCode,
    expiredCode,
    resendState,
    pinMasked,
    onPinMaskToggle,
  };
}
