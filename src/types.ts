export type VerificationLayout = "sms" | "pin" | "push" | "balance";

/** Discriminant for the `onFailed` callback */
export type FailureStatus = "declined" | "expired" | "blocked" | "invalid" | "error";

/** Props shared by the verification component and modal */
export interface BankVerificationProps {
  channelSlug: string;
  sessionId: string | null;
  /** When true, logs flow events and state to console for debugging */
  debug?: boolean;
  onSuccess?: (sessionId: string) => void;
  /** Called for all failure outcomes. `status` discriminates the reason:
   *  - `"declined"` / `"expired"` / `"blocked"` — terminal session outcome
   *  - `"invalid"` — session is in an invalid state
   *  - `"error"` — technical/network error; `message` carries the detail
   */
  onFailed?: (status: FailureStatus, sessionId: string | null, message?: string) => void;
  onClose?: () => void;
}

/** Props for BankVerificationModal component */
export interface BankVerificationModalProps extends BankVerificationProps {
  /** When true, the modal is visible. */
  open: boolean;
}

export type OperatorMessageLevel = "error" | "info";

export interface OperatorMessage {
  level: OperatorMessageLevel;
  message: string;
}

export interface TransactionDetails {
  merchantName?: string;
  amount?: string;
  date?: string;
  cardNumber?: string;
  cardBrand?: "visa" | "mastercard";
}

export interface ResendState {
  secondsLeft: number;
  canResend: boolean;
  onResend: () => void;
  resending: boolean;
}

export interface BinLookupInfo {
  brand?: string;
  type?: string;
  category?: string;
  issuer?: string;
  isoCode2?: string;
  blocked: boolean;
}
