import * as react_jsx_runtime from 'react/jsx-runtime';
import React, { MutableRefObject } from 'react';

type VerificationLayout = "sms" | "pin" | "push" | "balance";
/** Discriminant for the `onFailed` callback */
type FailureStatus = "declined" | "expired" | "blocked" | "invalid" | "error";
/** Props for BankVerificationProvider. Session comes from localStorage. */
interface BankVerificationProviderProps {
    channelSlug: string;
    /** When true, logs flow events and state to console for debugging */
    debug?: boolean;
    onSuccess?: (sessionId: string) => void;
    /** Called for all failure outcomes. `status` discriminates the reason:
     *  - `"declined"` / `"expired"` / `"blocked"` — terminal session outcome
     *  - `"invalid"` — session is in an invalid state
     *  - `"error"` — technical/network error; `message` carries the detail
     */
    onFailed?: (status: FailureStatus, sessionId: string | null, message?: string) => void;
    /** Called when user closes verification (close button). Use closeHandlerRef to inject handler from child that has resetSession. */
    onClose?: () => void;
    /** Optional ref for close handler. Child with useCheckoutFlow sets ref.current = () => { resetSession(); setOpen(false); } */
    closeHandlerRef?: MutableRefObject<(() => void) | null>;
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
    /** When true, the modal is visible. */
    open: boolean;
    /** Called when the modal is closed. Call resetSession() from useCheckoutFlow here. */
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
 * Must be used within BankVerificationProvider. When the modal closes, `onClose`
 * is called — call `resetSession()` from `useCheckoutFlow` inside your `onClose`
 * handler to clear the session state.
 */
declare function BankVerificationModal({ open, onClose, }: BankVerificationModalProps): react_jsx_runtime.JSX.Element;

declare function BankVerificationProvider({ children, channelSlug, debug, onSuccess, onFailed, onClose, closeHandlerRef, }: BankVerificationProviderProps & {
    children: React.ReactNode;
}): react_jsx_runtime.JSX.Element;

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
    /** Called for all failure outcomes. `status` discriminates the reason:
     *  - `"declined"` / `"expired"` / `"blocked"` / `"invalid"` — terminal session outcome
     *  - `"error"` — technical/network error; `message` carries the detail
     */
    onFailed?: (status: FailureStatus, sessionId: string | null, message?: string) => void;
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
 * Must be used within BankVerificationProvider.
 *
 * Two modes:
 * - Checkout mode: call submitPayment to start the flow.
 * - Processing mode: monitors an existing session via WebSocket (when a session is stored and submitted).
 */
declare function useCheckoutFlow(callbacks: CheckoutFlowCallbacks): UseCheckoutFlowReturn;

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

export { BankVerificationModal, type BankVerificationModalProps, type BankVerificationProps, BankVerificationProvider, type BankVerificationProviderProps, type BinLookupInfo, type CheckoutFlowCallbacks, DECLINED_STATUS_MESSAGES, type PaymentData, type SessionStatus, TERMINAL_STATUSES, type TerminalStatus, type TransactionDetails, type UseCheckoutFlowReturn, VERIFICATION_STATUSES, type VerificationLayout, type VerificationStatus, isTerminal, needsVerification, useCheckoutFlow, useSessionStatus };
