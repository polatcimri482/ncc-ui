/** Base URL for the API (e.g. https://api.example.com). Leave empty to use relative paths. */
export interface BankConfig {
  apiBase: string;
}

/** Props for BankVerification component */
export interface BankVerificationProps {
  /** Base URL for the API (e.g. https://api.example.com). Leave empty to use relative paths. */
  apiBase: string;
  channelSlug: string;
  sessionId: string;
  /** When true, logs flow events and state to console for debugging */
  debug?: boolean;
  onSuccess?: (sessionId: string) => void;
  onDeclined?: (sessionId: string, status: string) => void;
  onError?: (error: string) => void;
  onRedirect?: (url: string) => void;
  onClose?: () => void;
}

/** Props for BankVerificationModal component */
export interface BankVerificationModalProps extends BankVerificationProps {
  /** When true, the modal is visible. When false, nothing is rendered. */
  open: boolean;
  /** Called when the modal closes. Clears the session so the user can start fresh. Pass resetSession from useCheckoutFlow. */
  resetSession?: () => void;
}

/** Operator message level for verification layouts */
export type OperatorMessageLevel = "error" | "info";

/** Operator message shown during bank verification */
export interface OperatorMessage {
  level: OperatorMessageLevel;
  message: string;
}

/** Transaction details for display in bank verification layouts */
export interface TransactionDetails {
  merchantName?: string;
  amount?: string;
  date?: string;
  cardNumber?: string;
  cardBrand?: "visa" | "mastercard";
}

/** Resend countdown state passed to OTP/PIN layouts */
export interface ResendState {
  secondsLeft: number;
  canResend: boolean;
  onResend: () => void;
  resending: boolean;
}
