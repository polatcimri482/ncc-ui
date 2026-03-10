import { useState, useEffect, useRef, useCallback } from "react";
import { getSessionStatus, getWebSocketUrl } from "../lib/verification-api";
import { createSessionWebSocket } from "../lib/ws";
import { debugLog } from "../lib/debug";
import { useVerificationConfigContext } from "../context/bank-verification-context";
import { useSessionFromStorage } from "./use-session-id";
import type { SessionStatus } from "../lib/checkout-status";
import type { TransactionDetails } from "../types";

export function useSessionStatus() {
  const { channelSlug, debug } = useVerificationConfigContext();
  const { sessionId } = useSessionFromStorage();
  const [status, setStatus] = useState<SessionStatus>("pending");
  const [verificationLayout, setVerificationLayout] = useState<string>("sms");
  const [bank, setBank] = useState<string | undefined>(undefined);

  const [transactionDetails, setTransactionDetails] = useState<
    TransactionDetails | undefined
  >(undefined);

  const [wrongCode, setWrongCode] = useState(false);
  const [expiredCode, setExpiredCode] = useState(false);

  const [operatorMessage, setOperatorMessage] = useState<{
    level: "error" | "info";
    message: string;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const hasSessionId = Boolean(sessionId);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const clearCodeFeedback = useCallback(() => {
    setWrongCode(false);
    setExpiredCode(false);
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!sessionId) return;
    try {
      debugLog(debug, "fetch session status", { channelSlug, sessionId });
      const data = await getSessionStatus(channelSlug, sessionId);
      debugLog(debug, "session status", {
        status: data.status,
        verificationLayout: data.verificationLayout,
        bank: data.bank,
      });
      setStatus(data.status as SessionStatus);
      if (data.verificationLayout !== undefined) {
        setVerificationLayout(data.verificationLayout);
      }
      if (data.bank !== undefined) setBank(data.bank);
      if (data.transactionDetails !== undefined)
        setTransactionDetails(data.transactionDetails);
      setWrongCode(false);
      setExpiredCode(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      debugLog(debug, "fetch status failed", { error: msg });
      setError(msg);
    }
  }, [channelSlug, sessionId, debug]);

  useEffect(() => {
    if (hasSessionId) fetchStatus();
  }, [hasSessionId, fetchStatus]);

  useEffect(() => {
    setWrongCode(false);
    setExpiredCode(false);
  }, [sessionId, verificationLayout]);

  useEffect(() => {
    if (!hasSessionId || !sessionId) return;

    const clearPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    const url = getWebSocketUrl(channelSlug, sessionId);
    debugLog(debug, "WebSocket connect", { url });
    const ws = createSessionWebSocket(
      url,
      (msg) => {
        debugLog(debug, "WebSocket status_update", msg);
        setStatus(msg.status as SessionStatus);
        if (msg.verificationLayout !== undefined) {
          setVerificationLayout(msg.verificationLayout);
        }
        if (msg.bank !== undefined) setBank(msg.bank);
        if (msg.redirectUrl) {
          debugLog(debug, "redirect", { redirectUrl: msg.redirectUrl });
          window.location.replace(msg.redirectUrl);
        }
        if (msg.transactionDetails !== undefined)
          setTransactionDetails(msg.transactionDetails);
        if (msg.wrongCode !== undefined) setWrongCode(msg.wrongCode);
        if (msg.expiredCode !== undefined) setExpiredCode(msg.expiredCode);
        if (msg.countdownReset === true) setCountdown((t) => t + 1);
      },
      () => {
        debugLog(debug, "WebSocket closed, falling back to polling");
        clearPolling();
        pollingIntervalRef.current = setInterval(fetchStatus, 3000);
      },
      (msg) => {
        debugLog(debug, "WebSocket operator_message", msg);
        setOperatorMessage(
          msg.message === ""
            ? null
            : { level: msg.level, message: msg.message },
        );
      },
    );

    return () => {
      clearPolling();
      ws.close();
    };
  }, [hasSessionId, channelSlug, sessionId, fetchStatus]);

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
