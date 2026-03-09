import { useState, useEffect, useCallback } from "react";

export function useOtpResendCountdown(
  durationSeconds: number,
  countdownResetTrigger?: number,
  resendFn?: () => Promise<void>
) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const [resending, setResending] = useState(false);

  const resetCountdown = useCallback(() => {
    setSecondsLeft(durationSeconds);
  }, [durationSeconds]);

  // Decrement every second
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  // Pilot reset: when countdownResetTrigger changes, set countdown to 0
  useEffect(() => {
    if (countdownResetTrigger != null && countdownResetTrigger > 0) {
      setSecondsLeft(0);
    }
  }, [countdownResetTrigger]);

  const onResend = useCallback(async () => {
    if (!resendFn || secondsLeft > 0) return;
    setResending(true);
    try {
      await resendFn();
      resetCountdown();
    } finally {
      setResending(false);
    }
  }, [resendFn, secondsLeft, resetCountdown]);

  return {
    secondsLeft,
    canResend: secondsLeft <= 0,
    onResend,
    resending,
  };
}
