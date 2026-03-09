export type VerificationLayout = "sms" | "pin" | "push" | "balance";

/** Props shared by the verification component and modal */
export interface BankVerificationProps {
  /** Base URL for the API (e.g. https://api.example.com). Leave empty to use relative paths. */
  apiBase: string;
  channelSlug: string;
  sessionId: string | null;
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
