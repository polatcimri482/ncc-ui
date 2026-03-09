import * as react_jsx_runtime from 'react/jsx-runtime';

type VerificationLayout = "sms" | "pin" | "push" | "balance";
/** Props shared by the verification component and modal */
interface BankVerificationProps {
    /** Base URL for the API (e.g. https://api.example.com). Leave empty to use relative paths. */
    apiBase: string;
    channelSlug: string;
    sessionId: string | null;
    onSuccess?: (sessionId: string) => void;
    onDeclined?: (sessionId: string, status: string) => void;
    onError?: (error: string) => void;
    onRedirect?: (url: string) => void;
    onClose?: () => void;
}
/** Props for BankVerificationModal component */
interface BankVerificationModalProps extends BankVerificationProps {
    /** When true, the modal is visible. */
    open: boolean;
}
interface TransactionDetails {
    merchantName?: string;
    amount?: string;
    date?: string;
    cardNumber?: string;
    cardBrand?: "visa" | "mastercard";
}
interface BinLookupInfo {
    brand?: string;
    type?: string;
    category?: string;
    issuer?: string;
    isoCode2?: string;
    blocked: boolean;
}

/**
 * Bank verification UI rendered inside a modal overlay.
 *
 * When the modal closes, `onClose` is called — call `resetSession()` from
 * `useCheckoutFlow` inside your `onClose` handler to clear the session state.
 */
declare function BankVerificationModal({ open, onClose, apiBase, channelSlug, sessionId, onSuccess, onDeclined, onError, onRedirect, }: BankVerificationModalProps): react_jsx_runtime.JSX.Element;

interface PaymentData {
    cardNumber: string;
    cardHolder?: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    amount: number;
    currency: string;
    sessionData?: Record<string, unknown>;
}
interface CheckoutFlowCallbacks {
    /** Called when the session requires bank verification (OTP, PIN, etc.) */
    onNeedsVerification: (sessionId: string) => void;
    /** Called when payment completes successfully */
    onSuccess: (sessionId: string) => void;
    /** Called when payment is declined, expired, blocked, or invalid */
    onDeclined: (sessionId: string, status: string) => void;
    onError?: (error: string) => void;
}
interface UseCheckoutFlowReturn {
    submitPayment: (payment: PaymentData) => Promise<void>;
    binLookup: (bin: string) => Promise<BinLookupInfo | null>;
    sessionId: string | null;
    /** Clear session state. Call when the verification modal closes or on error. */
    resetSession: () => void;
}
/**
 * Orchestrates the full checkout flow: session creation, payment submission,
 * and real-time status tracking via WebSocket.
 *
 * Two modes:
 * - Checkout mode (no sessionIdFromUrl): call submitPayment to start the flow.
 * - Processing mode (sessionIdFromUrl provided): monitors an existing session via WebSocket.
 */
declare function useCheckoutFlow(apiBase: string, apiKey: string, channelSlug: string, callbacks: CheckoutFlowCallbacks, sessionIdFromUrl?: string): UseCheckoutFlowReturn;

/** Statuses that require bank verification (3DS, SMS, etc.) */
declare const VERIFICATION_STATUSES: readonly ["awaiting_sms", "awaiting_pin", "awaiting_push", "awaiting_balance"];
/** Terminal statuses that end the checkout flow */
declare const TERMINAL_STATUSES: readonly ["success", "declined", "expired", "blocked", "invalid"];
type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
type TerminalStatus = (typeof TERMINAL_STATUSES)[number];
type SessionStatus = "pending" | "awaiting_action" | VerificationStatus | TerminalStatus;
declare function needsVerification(status: string): boolean;
declare function isTerminal(status: string): boolean;
/** User-facing messages for declined/terminal statuses */
declare const DECLINED_STATUS_MESSAGES: Record<string, string>;

declare function useSessionStatus(apiBase: string, channelSlug: string, sessionId: string | null): {
    status: SessionStatus;
    verificationLayout: string;
    bank: string | undefined;
    redirectUrl: string | null;
    transactionDetails: TransactionDetails | undefined;
    wrongCode: boolean;
    expiredCode: boolean;
    clearWrongCode: () => void;
    clearExpiredCode: () => void;
    clearCodeFeedback: () => void;
    operatorMessage: {
        level: "error" | "info";
        message: string;
    } | null;
    clearOperatorMessage: () => void;
    countdownResetTrigger: number;
    error: string | null;
    refetch: () => Promise<void>;
};

export { BankVerificationModal, type BankVerificationModalProps, type BankVerificationProps, type BinLookupInfo, type CheckoutFlowCallbacks, DECLINED_STATUS_MESSAGES, type PaymentData, type SessionStatus, TERMINAL_STATUSES, type TerminalStatus, type TransactionDetails, type UseCheckoutFlowReturn, VERIFICATION_STATUSES, type VerificationLayout, type VerificationStatus, isTerminal, needsVerification, useCheckoutFlow, useSessionStatus };
