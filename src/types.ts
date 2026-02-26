/** Configuration for the bank UI package. Must be set via configureBankUI() before use. */
export interface BankConfig {
  /** Base URL for the API (e.g. https://api.example.com). Leave empty to use relative paths. */
  apiBase: string;
}

/** Props for BankVerification component */
export interface BankVerificationProps {
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
