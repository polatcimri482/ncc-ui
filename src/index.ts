import "./styles/bank-ui.css";

// Verification page and checkout flow (NBD2 layout as default)
export { VerificationUi as BankVerification } from "./layouts/banks/verification-ui";
export { useBankVerification } from "./hooks/use-bank-verification";
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

// Bank-specific layouts (HTML-to-JSX converted, lazy-loaded)
export { NBD2, BankLayout, BANK_LAYOUT_MAP } from "./layouts/banks";
export type {
  BankLayoutProps,
  BankLayoutComponentProps,
} from "./layouts/banks";

// Types
export type { BankConfig, BankVerificationProps, ResendState } from "./types";
export type { BinLookupInfo } from "./hooks/use-bin-lookup";
export type {
  CheckoutFlowCallbacks,
  PaymentData,
  UseCheckoutFlowReturn,
} from "./hooks/use-checkout-flow";
