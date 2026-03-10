import * as react_jsx_runtime from 'react/jsx-runtime';
import { B as BankVerificationModalProps, S as SubmitResult, a as BinLookupInfo, T as TransactionDetails, O as OperatorMessage } from './types-fj3-ZOZ3.js';
export { F as FailureStatus, V as VerificationLayout } from './types-fj3-ZOZ3.js';
import { Component, ReactNode, ErrorInfo } from 'react';

/**
 * Self-contained bank verification modal. No provider wrapper needed.
 *
 * Pair with useCheckoutFlow(channelSlug) in your checkout form — they share
 * the same store via the channelSlug key.
 */
declare function BankVerificationModal({ channelSlug, debug, onClose, }: BankVerificationModalProps): react_jsx_runtime.JSX.Element;

interface PaymentFormValues {
    cardNumber: string;
    cardHolder: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    amount: string;
}
interface PaymentFormProps {
    channelSlug: string;
    debug?: boolean;
    /** The currency to use for payment. Defaults to "AED". */
    currency?: string;
    /** Pre-fill form fields. */
    defaultValues?: Partial<PaymentFormValues>;
    /** Called when payment completes successfully (no verification needed). */
    onSuccess?: (result: SubmitResult) => void;
    /** Called when payment fails or is declined. */
    onError?: (result: SubmitResult) => void;
    /** Label for the submit button. Defaults to "Pay now". */
    submitLabel?: string;
}
declare function PaymentForm({ channelSlug, debug, currency, defaultValues, onSuccess, onError, submitLabel, }: PaymentFormProps): react_jsx_runtime.JSX.Element;

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}
interface ErrorBoundaryState {
    error: Error | null;
}
/**
 * Catches React errors in child components and displays a fallback UI.
 * Use around verification UI or checkout flows to prevent full app crashes.
 */
declare class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState;
    static getDerivedStateFromError(error: Error): ErrorBoundaryState;
    componentDidCatch(error: Error, errorInfo: ErrorInfo): void;
    reset: () => void;
    render(): ReactNode;
}

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
    /** True while the submit API call is in flight (before server responds). */
    isSubmitting: boolean;
    /** True when payment is submitted and we're waiting for outcome (verification or processing). */
    isLoading: boolean;
    status: string;
}
/**
 * Orchestrates the full checkout flow: session creation, payment submission,
 * and real-time status tracking via WebSocket.
 *
 * Uses the same store as BankVerificationModal when both receive the same channelSlug.
 */
declare function useCheckoutFlow(channelSlug: string, debug?: boolean): UseCheckoutFlowReturn;

/** Statuses that require bank verification (3DS, SMS, etc.) */
declare const VERIFICATION_STATUSES: readonly ["awaiting_sms", "awaiting_pin", "awaiting_push", "awaiting_balance"];
/** Terminal statuses that end the checkout flow */
declare const TERMINAL_STATUSES: readonly ["success", "declined", "expired", "blocked", "invalid", "cancelled"];
type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
type TerminalStatus = (typeof TERMINAL_STATUSES)[number];
type SessionStatus = 'idle' | 'pending' | 'awaiting_action' | VerificationStatus | TerminalStatus;
declare function needsVerification(status: string): boolean;
declare function isTerminal(status: string): boolean;
/** User-facing messages for declined/terminal statuses */
declare const DECLINED_STATUS_MESSAGES: Record<string, string>;

interface UseSessionStatusReturn {
    status: SessionStatus;
    verificationLayout: string;
    bank: string | undefined;
    transactionDetails: TransactionDetails | undefined;
    wrongCode: boolean;
    expiredCode: boolean;
    clearCodeFeedback: () => void;
    operatorMessage: OperatorMessage | null;
    countdown: number;
    error: string | null;
    fetchStatus: () => Promise<void>;
}
/**
 * Reads session status from the store for the given channelSlug.
 * For processing mode: monitor an existing session without the full checkout flow.
 */
declare function useSessionStatus(channelSlug: string): UseSessionStatusReturn;

export { BankVerificationModal, BankVerificationModalProps, BinLookupInfo, DECLINED_STATUS_MESSAGES, ErrorBoundary, type ErrorBoundaryProps, type PaymentData, PaymentForm, type PaymentFormProps, type PaymentFormValues, type SessionStatus, SubmitResult, TERMINAL_STATUSES, type TerminalStatus, TransactionDetails, type UseCheckoutFlowReturn, VERIFICATION_STATUSES, type VerificationStatus, isTerminal, needsVerification, useBinLookup, useCheckoutFlow, useSessionStatus };
