import { useState, useEffect, useCallback } from "react";
import { getSessionStatus, getWebSocketUrl } from "../lib/bank-api";
import { createSessionWebSocket } from "../lib/ws";

export function useSessionStatus(apiBase: string, channelSlug: string, sessionId: string | null) {
  const [status, setStatus] = useState<string>("pending");
  const [verificationLayout, setVerificationLayout] = useState<string>("sms");
  const [bank, setBank] = useState<string | undefined>(undefined);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [wrongCode, setWrongCode] = useState(false);
  const [operatorMessage, setOperatorMessage] = useState<{ level: "error" | "info"; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enabled = Boolean(sessionId);

  const clearWrongCode = useCallback(() => setWrongCode(false), []);
  const clearOperatorMessage = useCallback(() => setOperatorMessage(null), []);

  const fetchStatus = useCallback(async () => {
    if (!sessionId) return;
    try {
      const data = await getSessionStatus(apiBase, channelSlug, sessionId);
      setStatus(data.status);
      if (data.verificationLayout) setVerificationLayout(data.verificationLayout);
      if (data.bank !== undefined) setBank(data.bank);
      setWrongCode(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [apiBase, channelSlug, sessionId]);

  useEffect(() => {
    if (enabled) fetchStatus();
  }, [enabled, fetchStatus]);

  useEffect(() => {
    setWrongCode(false);
  }, [channelSlug, sessionId, verificationLayout]);

  useEffect(() => {
    if (!enabled || !sessionId) return;
    const url = getWebSocketUrl(apiBase, channelSlug, sessionId);
    const ws = createSessionWebSocket(
      url,
      (msg) => {
        setStatus(msg.status);
        if (msg.verificationLayout) setVerificationLayout(msg.verificationLayout);
        if (msg.bank !== undefined) setBank(msg.bank);
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
  }, [enabled, apiBase, channelSlug, sessionId, fetchStatus]);

  return {
    status,
    verificationLayout,
    bank,
    redirectUrl,
    wrongCode,
    clearWrongCode,
    operatorMessage,
    clearOperatorMessage,
    error,
    refetch: fetchStatus,
  };
}
