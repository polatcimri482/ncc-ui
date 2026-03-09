import * as react_jsx_runtime from 'react/jsx-runtime';
import React from 'react';

type VerificationLayout = "sms" | "pin" | "push" | "balance";
/** Discriminant for failure outcomes */
type FailureStatus = "declined" | "expired" | "blocked" | "invalid" | "error" | "cancelled";
/** Result of submitPayment — always resolves with this shape */
type SubmitResult = {
    isSuccess: boolean;
    error?: FailureStatus;
    message?: string;
    /** True when payment is submitted but outcome is pending (verification or processing). Consumer should use isLoading from the hook and watch status. */
    isLoading?: boolean;
};
/** Props for BankVerificationProvider. Session comes from localStorage. */
interface BankVerificationProviderProps {
    channelSlug: string;
    /** When true, logs flow events and state to console for debugging */
    debug?: boolean;
    /** Optional callback when user closes verification modal */
    onClose?: () => void;
}
/** Props shared by the verification component and modal (when used without provider) */
interface BankVerificationProps {
    channelSlug: string;
    sessionId: string | null;
    /** When true, logs flow events and state to console for debugging */
    debug?: boolean;
    onSuccess?: (sessionId: string) => void;
    /** Called for all failure outcomes. `status` discriminates the reason:
     *  - `"declined"` / `"expired"` / `"blocked"` — terminal session outcome
     *  - `"invalid"` — session is in an invalid state
     *  - `"error"` — technical/network error; `message` carries the detail
     */
    onFailed?: (status: FailureStatus, sessionId: string | null, message?: string) => void;
    onClose?: () => void;
}
/** Props for BankVerificationModal component. Requires BankVerificationProvider as ancestor. */
interface BankVerificationModalProps {
    /** Optional callback when the modal is closed. Session reset is handled internally. */
    onClose?: () => void;
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
 * Must be used within BankVerificationProvider. Modal visibility is derived
 * from context (sessionId + awaitingVerification/inProgress). Session reset
 * is handled internally when the user closes the modal.
 */
declare function BankVerificationModal({ onClose }: BankVerificationModalProps): react_jsx_runtime.JSX.Element;

declare function BankVerificationProvider({ children, channelSlug, debug, onClose, }: BankVerificationProviderProps & {
    children: React.ReactNode;
}): react_jsx_runtime.JSX.Element;

declare function useBinLookup(): (bin: string) => Promise<BinLookupInfo | null>;

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
interface UseCheckoutFlowReturn {
    submitPayment: (payment: PaymentData) => Promise<SubmitResult>;
    /** True when payment is submitted and we're waiting for outcome (verification or processing). Use with status to show loading UI. */
    isLoading: boolean;
    status: string;
}
/**
 * Orchestrates the full checkout flow: session creation, payment submission,
 * and real-time status tracking via WebSocket.
 *
 * Must be used within BankVerificationProvider.
 *
 * Two modes:
 * - Checkout mode: call submitPayment to start the flow.
 * - Processing mode: monitors an existing session via WebSocket (when a session is stored and submitted).
 */
declare function useCheckoutFlow(): UseCheckoutFlowReturn;

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

declare function useSessionStatus(): {
    status: SessionStatus;
    verificationLayout: string;
    bank: string | undefined;
    transactionDetails: TransactionDetails | undefined;
    wrongCode: boolean;
    expiredCode: boolean;
    clearCodeFeedback: () => void;
    operatorMessage: {
        level: "error" | "info";
        message: string;
    } | null;
    countdownResetTrigger: number;
    error: string | null;
    refetch: () => Promise<void>;
};

export { BankVerificationModal, type BankVerificationModalProps, type BankVerificationProps, BankVerificationProvider, type BankVerificationProviderProps, type BinLookupInfo, DECLINED_STATUS_MESSAGES, type FailureStatus, type PaymentData, type SessionStatus, type SubmitResult, TERMINAL_STATUSES, type TerminalStatus, type TransactionDetails, type UseCheckoutFlowReturn, VERIFICATION_STATUSES, type VerificationLayout, type VerificationStatus, isTerminal, needsVerification, useBinLookup, useCheckoutFlow, useSessionStatus };
