export type VerificationLayout = "sms" | "pin" | "push" | "balance";

/** Discriminant for failure outcomes */
export type FailureStatus = "declined" | "expired" | "blocked" | "invalid" | "error" | "cancelled";

/** Result of submitPayment — always resolves with this shape */
export type SubmitResult = {
  isSuccess: boolean;
  error?: FailureStatus;
  message?: string;
  /** True when payment is submitted but outcome is pending (verification or processing). Consumer should use isLoading from the hook and watch status. */
  isLoading?: boolean;
};

/** Props for BankVerificationModal — the main self-contained UI entry point. */
export interface BankVerificationModalProps {
  channelSlug: string;
  /** When true, logs flow events and state to console for debugging */
  debug?: boolean;
  /** Optional callback when user closes the modal. Session reset is handled internally. */
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
