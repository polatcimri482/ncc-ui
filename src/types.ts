import type { MutableRefObject } from "react";

export type VerificationLayout = "sms" | "pin" | "push" | "balance";

/** Discriminant for the `onFailed` callback */
export type FailureStatus = "declined" | "expired" | "blocked" | "invalid" | "error";

/** Props for BankVerificationProvider. Session comes from localStorage. */
export interface BankVerificationProviderProps {
  channelSlug: string;
  /** When true, logs flow events and state to console for debugging */
  debug?: boolean;
  onSuccess?: (sessionId: string) => void;
  /** Called for all failure outcomes. `status` discriminates the reason:
   *  - `"declined"` / `"expired"` / `"blocked"` — terminal session outcome
   *  - `"invalid"` — session is in an invalid state
   *  - `"error"` — technical/network error; `message` carries the detail
   */
  onFailed?: (status: FailureStatus, sessionId: string | null, message?: string) => void;
  /** Called when user closes verification (close button). Use closeHandlerRef to inject handler from child that has resetSession. */
  onClose?: () => void;
  /** Optional ref for close handler. Child with useCheckoutFlow sets ref.current = () => { resetSession(); setOpen(false); } */
  closeHandlerRef?: MutableRefObject<(() => void) | null>;
}

/** Props shared by the verification component and modal (when used without provider) */
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

/** Props for BankVerificationModal component. Requires BankVerificationProvider as ancestor. */
export interface BankVerificationModalProps {
  /** When true, the modal is visible. */
  open: boolean;
  /** Called when the modal is closed. Call resetSession() from useCheckoutFlow here. */
  onClose?: () => void;
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
