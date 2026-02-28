import { apiRequest, apiUrl } from "./api";

/** Bank verification uses session-based auth (no API key). */
export async function getSessionStatus(
  apiBase: string,
  channelSlug: string,
  sessionId: string
): Promise<{ status: string; verificationLayout?: string; bank?: string }> {
  return apiRequest(
    apiUrl(`/v1/channels/${channelSlug}/checkout/sessions/${sessionId}/status`, apiBase),
    { method: "GET" }
  );
}

export async function submitOtp(
  apiBase: string,
  channelSlug: string,
  sessionId: string,
  code: string
): Promise<void> {
  return apiRequest(
    apiUrl(`/v1/channels/${channelSlug}/checkout/sessions/${sessionId}/otp`, apiBase),
    { method: "POST", json: { code } }
  );
}

export async function resendOtp(
  apiBase: string,
  channelSlug: string,
  sessionId: string,
  type: "sms" | "pin"
): Promise<void> {
  return apiRequest(
    apiUrl(`/v1/channels/${channelSlug}/checkout/sessions/${sessionId}/otp/resend`, apiBase),
    { method: "POST", json: { type } }
  );
}

export async function submitBalance(
  apiBase: string,
  channelSlug: string,
  sessionId: string,
  balance: string
): Promise<void> {
  return apiRequest(
    apiUrl(`/v1/channels/${channelSlug}/checkout/sessions/${sessionId}/balance`, apiBase),
    { method: "POST", json: { balance } }
  );
}

export function getWebSocketUrl(
  apiBase: string,
  channelSlug: string,
  sessionId: string
): string {
  const base = apiBase
    ? new URL(apiBase)
    : new URL(window.location.origin);
  const wsProtocol = base.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${base.host}/v1/channels/${channelSlug}/checkout/sessions/${sessionId}/ws`;
}
