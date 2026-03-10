import { useState, useEffect, useRef, useCallback } from "react";
import { getSessionStatus, getWebSocketUrl } from "../lib/verification-api";
import { createSessionWebSocket } from "../lib/ws";
import { debugLog, setDebugStatusApiPayload, setDebugWsPayload } from "../lib/debug";
import type { SessionStatus } from "../lib/checkout-status";
import type { TransactionDetails } from "../types";

export interface UseSessionStatusReturn {
  status: SessionStatus;
  verificationLayout: string;
  bank: string | undefined;
  transactionDetails: TransactionDetails | undefined;
  wrongCode: boolean;
  expiredCode: boolean;
  clearCodeFeedback: () => void;
  operatorMessage: {
    level: "error" | "info";
    message: string;
  } | null;
  countdown: number;
  error: string | null;
  fetchStatus: () => Promise<void>;
}

/**
 * Internal logic hook for session status. Used by BankVerificationProvider.
 * Takes params directly — does not read from context.
 */
export function useSessionStatusLogic(
  channelSlug: string,
  debug: boolean,
  sessionId: string | null,
): UseSessionStatusReturn {
  const [status, setStatus] = useState<SessionStatus>("idle");
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
      setDebugStatusApiPayload(debug, data);
      debugLog(debug, "session status (REST)", data);
      setStatus(data.status as SessionStatus);
      if (data.verificationLayout !== undefined) {
        setVerificationLayout(data.verificationLayout);
      }
      if (data.bank !== undefined) setBank(data.bank);
      if (data.transactionDetails !== undefined)
        setTransactionDetails(data.transactionDetails);
      if (data.wrongCode !== undefined) setWrongCode(data.wrongCode);
      if (data.expiredCode !== undefined) setExpiredCode(data.expiredCode);
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
    debugLog(debug, "WebSocket connecting", { url, channelSlug, sessionId });
    const ws = createSessionWebSocket(url, {
      onOpen: () =>
        debugLog(debug, "WebSocket connected", { url, channelSlug, sessionId }),
      onMessage: (msg) => {
        setDebugWsPayload(debug, "status_update", msg);
        debugLog(debug, "WebSocket status_update", msg);
        if (msg.wrongCode === true) debugLog(debug, "wrongCode received", msg);
        if (msg.expiredCode === true) debugLog(debug, "expiredCode received", msg);
        if (msg.countdownReset === true) debugLog(debug, "countdownReset received");
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
      onClose: () => {
        debugLog(debug, "WebSocket closed, falling back to polling every 3s", {
          channelSlug,
          sessionId,
        });
        clearPolling();
        pollingIntervalRef.current = setInterval(fetchStatus, 3000);
      },
      onOperatorMessage: (msg) => {
        setDebugWsPayload(debug, "operator_message", msg);
        debugLog(debug, "WebSocket operator_message", msg);
        setOperatorMessage(
          msg.message === ""
            ? null
            : { level: msg.level, message: msg.message },
        );
      },
    });

    return () => {
      clearPolling();
      ws.close();
    };
  }, [hasSessionId, channelSlug, sessionId, fetchStatus, debug]);

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

import { useBankVerificationContext } from "../context/bank-verification-context";

/**
 * Public hook: reads session status from BankVerificationContext.
 * Must be used within BankVerificationProvider.
 */
export function useSessionStatus(): UseSessionStatusReturn {
  const { status, verificationLayout, bank, transactionDetails, wrongCode, expiredCode, clearCodeFeedback, operatorMessage, countdown, error, fetchStatus } = useBankVerificationContext();
  return { status, verificationLayout, bank, transactionDetails, wrongCode, expiredCode, clearCodeFeedback, operatorMessage, countdown, error, fetchStatus };
}
