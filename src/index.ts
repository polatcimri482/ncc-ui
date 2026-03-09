// Primary component
export { BankVerificationModal } from "./components/bank-verification-modal";

// Hooks
export { useCheckoutFlow } from "./hooks/use-checkout-flow";
export { useSessionStatus } from "./hooks/use-session-status";

// Status utilities
export {
  needsVerification,
  isTerminal,
  VERIFICATION_STATUSES,
  TERMINAL_STATUSES,
  DECLINED_STATUS_MESSAGES,
} from "./lib/checkout-status";

// Types
export type {
  BankVerificationProps,
  BankVerificationModalProps,
  TransactionDetails,
  VerificationLayout,
  BinLookupInfo,
} from "./types";
export type { VerificationStatus, TerminalStatus, SessionStatus } from "./lib/checkout-status";
export type {
  CheckoutFlowCallbacks,
  PaymentData,
  UseCheckoutFlowReturn,
} from "./hooks/use-checkout-flow";
