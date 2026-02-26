import { apiRequest, apiUrl } from "./api";

export async function createSession(
  apiBase: string,
  channelSlug: string,
  apiKey: string,
  sessionData?: Record<string, unknown>
): Promise<{ sessionId: string; expiresAt: string }> {
  return apiRequest(
    apiUrl(`/v1/channels/${channelSlug}/checkout/sessions`, apiBase),
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      json: { sessionData: sessionData ?? {} },
    }
  );
}

export async function submitPayment(
  apiBase: string,
  channelSlug: string,
  sessionId: string,
  apiKey: string,
  payment: {
    cardNumber: string;
    cardHolder?: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    amount: number;
    currency: string;
    sessionData?: Record<string, unknown>;
  }
): Promise<{ sessionId: string; status: string; blocked: boolean }> {
  const year =
    payment.expiryYear.length === 2 ? `20${payment.expiryYear}` : payment.expiryYear;
  return apiRequest(
    apiUrl(`/v1/channels/${channelSlug}/checkout/sessions/${sessionId}/payment`, apiBase),
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      json: { ...payment, expiryYear: year },
    }
  );
}

export async function getSessionStatus(
  apiBase: string,
  channelSlug: string,
  sessionId: string,
  apiKey: string
): Promise<{ status: string; verificationLayout?: string }> {
  return apiRequest(
    apiUrl(`/v1/channels/${channelSlug}/checkout/sessions/${sessionId}/status`, apiBase),
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );
}

export interface BinLookupResult {
  bin: string;
  brand?: string;
  type?: string;
  category?: string;
  issuer?: string;
  isoCode2?: string;
  cardTier?: string;
  luhn?: boolean;
  blocked: boolean;
}

export async function lookupBin(
  apiBase: string,
  apiKey: string,
  bin: string
): Promise<BinLookupResult> {
  const normalizedBin = bin.replace(/\D/g, "").slice(0, 8);
  if (normalizedBin.length < 6) {
    throw new Error("BIN must be at least 6 digits");
  }
  return apiRequest(apiUrl("/v1/bins/lookup", apiBase), {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    json: { bin: normalizedBin },
  });
}
