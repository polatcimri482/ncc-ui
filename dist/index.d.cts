import * as react_jsx_runtime from 'react/jsx-runtime';
import React from 'react';

/** Base URL for the API (e.g. https://api.example.com). Leave empty to use relative paths. */
interface BankConfig {
    apiBase: string;
}
/** Props for BankVerification component */
interface BankVerificationProps {
    /** Base URL for the API (e.g. https://api.example.com). Leave empty to use relative paths. */
    apiBase: string;
    channelSlug: string;
    sessionId: string;
    /** When true, logs flow events and state to console for debugging */
    debug?: boolean;
    onSuccess?: (sessionId: string) => void;
    onDeclined?: (sessionId: string, status: string) => void;
    onError?: (error: string) => void;
    onRedirect?: (url: string) => void;
    onClose?: () => void;
}
/** Props for BankVerificationModal component */
interface BankVerificationModalProps extends BankVerificationProps {
    /** When true, the modal is visible. When false, nothing is rendered. */
    open: boolean;
}
/** Transaction details for display in bank verification layouts */
interface TransactionDetails {
    merchantName?: string;
    amount?: string;
    date?: string;
    cardNumber?: string;
    cardBrand?: "visa" | "mastercard";
}
/** Resend countdown state passed to OTP/PIN layouts */
interface ResendState {
    secondsLeft: number;
    canResend: boolean;
    onResend: () => void;
    resending: boolean;
}

/**
 * Bank verification UI rendered inside a modal overlay.
 * Use when embedding verification in a page (e.g. checkout) and opening on demand.
 * For full-page/route usage, use BankVerification directly.
 */
declare function BankVerificationModal({ open, onClose, apiBase, channelSlug, sessionId, debug, onSuccess, onDeclined, onError, onRedirect, }: BankVerificationModalProps): react_jsx_runtime.JSX.Element;

interface UseBankVerificationReturn {
    missingParams: boolean;
    shouldRenderNull: boolean;
    inProgress: boolean;
    awaitingVerification: boolean;
    baseLayout: string;
    layoutProps: Record<string, unknown>;
    error: string | null;
}
declare function useBankVerification({ apiBase, channelSlug, sessionId, debug, onSuccess, onDeclined, onError, onRedirect, }: BankVerificationProps): UseBankVerificationReturn;

declare function useSessionStatus(apiBase: string, channelSlug: string, sessionId: string | null, debug?: boolean): {
    status: string;
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

declare function useResendCountdown(durationSeconds: number, countdownResetTrigger?: number, resendFn?: () => Promise<void>): {
    secondsLeft: number;
    canResend: boolean;
    onResend: () => Promise<void>;
    resending: boolean;
};

interface BinLookupInfo {
    brand?: string;
    type?: string;
    category?: string;
    issuer?: string;
    isoCode2?: string;
    blocked: boolean;
}

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
    onNeedsVerification: (channel: string, sessionId: string) => void;
    onSuccess: (channel: string, sessionId: string) => void;
    onDeclined: (channel: string, sessionId: string, status: string) => void;
    onInvalid: (channel: string) => void;
    onProcessing: (channel: string, sessionId: string) => void;
    onError?: (error: string) => void;
}
interface UseCheckoutFlowReturn {
    submitPayment: (payment: PaymentData) => Promise<void>;
    binLookup: (bin: string) => Promise<BinLookupInfo | null>;
    sessionId: string | null;
    channel: string;
}
/**
 * Wraps useCheckout with callback-based status routing. Handles two modes:
 * - Checkout mode (no sessionIdFromUrl): submitPayment creates session if needed, submits, then resolves status to callbacks.
 * - Processing mode (sessionIdFromUrl provided): uses WebSocket via useSessionStatus and invokes callbacks when status changes.
 */
declare function useCheckoutFlow(apiBase: string, apiKey: string, channelSlug: string, callbacks: CheckoutFlowCallbacks, sessionIdFromUrl?: string, debug?: boolean): UseCheckoutFlowReturn;

/** Statuses that require bank verification (3DS, SMS, etc.) */
declare const VERIFICATION_STATUSES: readonly ["awaiting_sms", "awaiting_pin", "awaiting_push", "awaiting_balance"];
/** Terminal statuses that end the checkout flow */
declare const TERMINAL_STATUSES: readonly ["success", "declined", "expired", "blocked", "invalid"];
type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
type TerminalStatus = (typeof TERMINAL_STATUSES)[number];
declare function needsVerification(status: string): boolean;
declare function isTerminal(status: string): boolean;
/** User-facing messages for declined/terminal statuses */
declare const DECLINED_STATUS_MESSAGES: Record<string, string>;

declare function VerificationUi(props: BankLayoutProps): react_jsx_runtime.JSX.Element | null;

/** Props for bank-specific layouts. Verification fields are optional. */
type BankLayoutProps = Partial<Pick<BankVerificationProps, "apiBase" | "channelSlug" | "sessionId" | "debug" | "onSuccess" | "onDeclined" | "onError" | "onRedirect" | "onClose">> & Record<string, unknown>;
declare const NBD2: React.LazyExoticComponent<typeof VerificationUi>;
/** Map bank slugs (lowercase) to lazy bank-specific layout components */
declare const BANK_LAYOUT_MAP: Record<string, React.LazyExoticComponent<React.ComponentType<BankLayoutProps>>>;

interface BankLayoutComponentProps extends BankLayoutProps {
    bank: string;
    fallback?: React.ReactNode;
}
/** Renders a bank layout by slug with Suspense. Use when consuming BANK_LAYOUT_MAP to avoid manual Suspense. */
declare function BankLayout({ bank, fallback, ...props }: BankLayoutComponentProps): react_jsx_runtime.JSX.Element | null;

export { BANK_LAYOUT_MAP, type BankConfig, BankLayout, type BankLayoutComponentProps, type BankLayoutProps, BankVerificationModal, type BankVerificationModalProps, type BankVerificationProps, type BinLookupInfo, type CheckoutFlowCallbacks, DECLINED_STATUS_MESSAGES, NBD2, type PaymentData, type ResendState, TERMINAL_STATUSES, type TerminalStatus, type TransactionDetails, type UseCheckoutFlowReturn, VERIFICATION_STATUSES, type VerificationStatus, isTerminal, needsVerification, useBankVerification, useCheckoutFlow, useResendCountdown, useSessionStatus };
