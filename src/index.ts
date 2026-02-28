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

// Bank-specific layouts (HTML-to-JSX converted, lazy-loaded)
export {
  BANK_LAYOUT_MAP,
  BankLayout,
  Aafaq,
  ADCB,
  Citi,
  CMB,
  DIB,
  Emoney,
  EmiratesIslamic,
  HSBC,
  NBD,
  NBD2,
  PSC,
  RAKBANK1,
  RAKBANK2,
  SIB,
} from "./layouts/banks";
export type { BankLayoutProps, BankLayoutComponentProps } from "./layouts/banks";

// Types
export type { BankConfig, BankVerificationProps, ResendState } from "./types";
export type { BinLookupInfo } from "./hooks/use-bin-lookup";
export type {
  CheckoutFlowCallbacks,
  PaymentData,
  UseCheckoutFlowReturn,
} from "./hooks/use-checkout-flow";
