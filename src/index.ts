// Primary components
export { BankVerificationModal } from "./components/bank-verification-modal";
export { ErrorBoundary } from "./components/error-boundary";

// Hooks
export { useBinLookup } from "./hooks/use-bin-lookup";
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
  BankVerificationModalProps,
  TransactionDetails,
  VerificationLayout,
  BinLookupInfo,
  FailureStatus,
  SubmitResult,
} from "./types";
export type { ErrorBoundaryProps } from "./components/error-boundary";
export type {
  VerificationStatus,
  TerminalStatus,
  SessionStatus,
} from "./lib/checkout-status";
export type {
  PaymentData,
  UseCheckoutFlowReturn,
} from "./hooks/use-checkout-flow";
