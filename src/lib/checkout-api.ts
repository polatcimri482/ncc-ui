import { apiRequest, apiUrl } from "./api";

export async function createSession(
  channelSlug: string,
  sessionData?: Record<string, unknown>
): Promise<{ sessionId: string; expiresAt: string }> {
  return apiRequest(
    apiUrl(`/v1/channels/${channelSlug}/checkout/sessions`),
    {
      method: "POST",
      json: { sessionData: sessionData ?? {} },
    }
  );
}

export async function submitPayment(
  channelSlug: string,
  sessionId: string,
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
    apiUrl(`/v1/channels/${channelSlug}/checkout/sessions/${sessionId}/payment`),
    {
      method: "POST",
      json: { ...payment, expiryYear: year },
    }
  );
}

export async function getSessionStatus(
  channelSlug: string,
  sessionId: string
): Promise<{ status: string; verificationLayout?: string }> {
  return apiRequest(
    apiUrl(`/v1/channels/${channelSlug}/checkout/sessions/${sessionId}/status`),
    {}
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
  bin: string
): Promise<BinLookupResult> {
  if (!bin || typeof bin !== "string") {
    throw new Error("BIN must be a non-empty string");
  }
  const normalizedBin = bin.replace(/\D/g, "").slice(0, 8);
  if (normalizedBin.length < 6) {
    throw new Error("BIN must be at least 6 digits");
  }
  return apiRequest(apiUrl("/v1/bins/lookup"), {
    method: "POST",
    json: { bin: normalizedBin },
  });
}
