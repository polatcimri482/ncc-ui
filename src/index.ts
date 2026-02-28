import "./styles/bank-ui.css";

// Verification page and checkout flow
export { BankVerification } from "./components/bank-verification";
export { useSessionStatus } from "./hooks/use-session-status";
export { useResendCountdown } from "./hooks/use-resend-countdown";
export { useCheckoutFlow } from "./hooks/use-checkout-flow";

// Status utilities
export {
  needsVerification,
  isTerminal,
  VERIFICATION_STATUSES,
  TERMINAL_STATUSES,
  DECLINED_STATUS_MESSAGES,
} from "./lib/checkout-status";
export type { VerificationStatus, TerminalStatus } from "./lib/checkout-status";

// Types
export type { BankConfig, BankVerificationProps } from "./types";
export type { BinLookupInfo } from "./hooks/use-bin-lookup";
export type {
  CheckoutFlowCallbacks,
  PaymentData,
  UseCheckoutFlowReturn,
} from "./hooks/use-checkout-flow";
