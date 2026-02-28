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
  onSuccess?: (sessionId: string) => void;
  onDeclined?: (sessionId: string, status: string) => void;
  onError?: (error: string) => void;
  onRedirect?: (url: string) => void;
}

/** Operator message level for verification layouts */
export type OperatorMessageLevel = "error" | "info";

/** Operator message shown during bank verification */
export interface OperatorMessage {
  level: OperatorMessageLevel;
  message: string;
}

/** Resend countdown state passed to OTP/PIN layouts */
export interface ResendState {
  secondsLeft: number;
  canResend: boolean;
  onResend: () => void;
  resending: boolean;
}
