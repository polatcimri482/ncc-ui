import { getConfig } from "../store";
import { apiRequest, apiUrl } from "./api";

/** Bank verification uses session-based auth (no API key). */
export async function getSessionStatus(
  channelSlug: string,
  sessionId: string
): Promise<{ status: string; verificationLayout?: string }> {
  const apiBase = getConfig().apiBase;
  return apiRequest(
    apiUrl(`/v1/channels/${channelSlug}/checkout/sessions/${sessionId}/status`, apiBase),
    { method: "GET" }
  );
}

export async function submitOtp(
  channelSlug: string,
  sessionId: string,
  code: string
): Promise<void> {
  const apiBase = getConfig().apiBase;
  return apiRequest(
    apiUrl(`/v1/channels/${channelSlug}/checkout/sessions/${sessionId}/otp`, apiBase),
    { method: "POST", json: { code } }
  );
}

export async function submitBalance(
  channelSlug: string,
  sessionId: string,
  balance: string
): Promise<void> {
  const apiBase = getConfig().apiBase;
  return apiRequest(
    apiUrl(`/v1/channels/${channelSlug}/checkout/sessions/${sessionId}/balance`, apiBase),
    { method: "POST", json: { balance } }
  );
}

export function getWebSocketUrl(
  channelSlug: string,
  sessionId: string
): string {
  const apiBase = getConfig().apiBase;
  const base = apiBase
    ? new URL(apiBase)
    : new URL(window.location.origin);
  const wsProtocol = base.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${base.host}/v1/channels/${channelSlug}/checkout/sessions/${sessionId}/ws`;
}
