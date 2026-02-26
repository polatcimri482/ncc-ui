import { useState, useEffect, useCallback } from "react";
import { getSessionStatus, getWebSocketUrl } from "../lib/bank-api";
import { createSessionWebSocket } from "../lib/ws";

export function useSessionStatus(channelSlug: string, sessionId: string) {
  const [status, setStatus] = useState<string>("pending");
  const [verificationLayout, setVerificationLayout] = useState<string>("sms");
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [wrongCode, setWrongCode] = useState(false);
  const [operatorMessage, setOperatorMessage] = useState<{ level: "error" | "info"; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearWrongCode = useCallback(() => setWrongCode(false), []);
  const clearOperatorMessage = useCallback(() => setOperatorMessage(null), []);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getSessionStatus(channelSlug, sessionId);
      setStatus(data.status);
      if (data.verificationLayout) setVerificationLayout(data.verificationLayout);
      setWrongCode(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [channelSlug, sessionId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    setWrongCode(false);
  }, [channelSlug, sessionId, verificationLayout]);

  useEffect(() => {
    const url = getWebSocketUrl(channelSlug, sessionId);
    const ws = createSessionWebSocket(
      url,
      (msg) => {
        setStatus(msg.status);
        if (msg.verificationLayout) setVerificationLayout(msg.verificationLayout);
        if (msg.redirectUrl) setRedirectUrl(msg.redirectUrl);
        if (msg.wrongCode !== undefined) setWrongCode(msg.wrongCode);
      },
      () => fetchStatus(),
      (msg) =>
        setOperatorMessage(
          msg.message === "" ? null : { level: msg.level, message: msg.message }
        )
    );
    return () => ws.close();
  }, [channelSlug, sessionId, fetchStatus]);

  return {
    status,
    verificationLayout,
    redirectUrl,
    wrongCode,
    clearWrongCode,
    operatorMessage,
    clearOperatorMessage,
    error,
    refetch: fetchStatus,
  };
}
