import "./styles/bank-ui.css";

// Verification page and hook for checkout
export { BankVerification } from "./components/bank-verification";
export { useSessionStatus } from "./hooks/use-session-status";
export { useCheckout } from "./hooks/use-checkout";

// Checkout API (raw functions for non-React usage)
export { createSession, submitPayment, getSessionStatus, lookupBin } from "./lib/checkout-api";
export { useBinLookup } from "./hooks/use-bin-lookup";

// Types
export type { BankConfig, BankVerificationProps } from "./types";
export type { BinLookupResult } from "./lib/checkout-api";
export type { BinLookupInfo } from "./hooks/use-bin-lookup";
export type { UseCheckoutReturn } from "./hooks/use-checkout";
