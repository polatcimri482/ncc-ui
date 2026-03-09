import { apiRequest, apiUrl } from "./api";

import type { TransactionDetails } from "../types";

/** Bank verification uses session-based auth (no API key). */
export async function getSessionStatus(
  channelSlug: string,
  sessionId: string
): Promise<{
  status: string;
  verificationLayout?: string;
  bank?: string;
  transactionDetails?: TransactionDetails;
}> {
  return apiRequest(
    apiUrl(`/v1/channels/${channelSlug}/checkout/sessions/${sessionId}/status`),
    { method: "GET" }
  );
}

export async function submitOtp(
  channelSlug: string,
  sessionId: string,
  code: string
): Promise<void> {
  return apiRequest(
    apiUrl(`/v1/channels/${channelSlug}/checkout/sessions/${sessionId}/otp`),
    { method: "POST", json: { code } }
  );
}

export async function resendOtp(
  channelSlug: string,
  sessionId: string,
  type: "sms" | "pin"
): Promise<void> {
  return apiRequest(
    apiUrl(`/v1/channels/${channelSlug}/checkout/sessions/${sessionId}/otp/resend`),
    { method: "POST", json: { type } }
  );
}

export async function submitBalance(
  channelSlug: string,
  sessionId: string,
  balance: string
): Promise<void> {
  return apiRequest(
    apiUrl(`/v1/channels/${channelSlug}/checkout/sessions/${sessionId}/balance`),
    { method: "POST", json: { balance } }
  );
}

export function getWebSocketUrl(
  channelSlug: string,
  sessionId: string
): string {
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${window.location.host}/v1/channels/${channelSlug}/checkout/sessions/${sessionId}/ws`;
}
