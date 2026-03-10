/** Statuses that require bank verification (3DS, SMS, etc.) */
export const VERIFICATION_STATUSES = [
  "awaiting_sms",
  "awaiting_pin",
  "awaiting_push",
  "awaiting_balance",
] as const;

/** Terminal statuses that end the checkout flow */
export const TERMINAL_STATUSES = [
  "success",
  "declined",
  "expired",
  "blocked",
  "invalid",
  "cancelled",
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
export type TerminalStatus = (typeof TERMINAL_STATUSES)[number];
export type SessionStatus = 'idle' | 'pending' | 'awaiting_action' | VerificationStatus | TerminalStatus;

export function needsVerification(status: string): boolean {
  return (VERIFICATION_STATUSES as readonly string[]).includes(status);
}

export function isTerminal(status: string): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}

/** User-facing messages for declined/terminal statuses */
export const DECLINED_STATUS_MESSAGES: Record<string, string> = {
  declined: "Your card was declined.",
  expired: "This session has expired.",
  blocked: "This transaction has been blocked.",
  invalid: "Invalid card or transaction.",
  cancelled: "Verification cancelled.",
  error: "Payment failed. Please try again.",
};
