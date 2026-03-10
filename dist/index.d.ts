import * as react_jsx_runtime from 'react/jsx-runtime';
import { B as BankVerificationModalProps, T as TransactionDetails, a as BankVerificationProviderProps, b as BinLookupInfo, S as SubmitResult } from './types-B5yvUdqW.js';
export { c as BankVerificationProps, F as FailureStatus, V as VerificationLayout } from './types-B5yvUdqW.js';
import React, { Component, ReactNode, ErrorInfo } from 'react';

/**
 * Bank verification UI rendered inside a modal overlay.
 *
 * Must be used within BankVerificationProvider. Modal visibility is derived
 * from context (sessionId + awaitingVerification/inProgress). Session reset
 * is handled internally when the user closes the modal.
 */
declare function BankVerificationModal({ onClose }: BankVerificationModalProps): react_jsx_runtime.JSX.Element;

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

interface UseSessionStatusReturn {
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
    countdown: number;
    error: string | null;
    fetchStatus: () => Promise<void>;
}
/**
 * Public hook: reads session status from BankVerificationContext.
 * Must be used within BankVerificationProvider.
 */
declare function useSessionStatus(): UseSessionStatusReturn;

declare function BankVerificationProvider({ children, channelSlug, debug, onClose, }: BankVerificationProviderProps & {
    children: React.ReactNode;
}): react_jsx_runtime.JSX.Element;

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

export { BankVerificationModal, BankVerificationModalProps, BankVerificationProvider, BankVerificationProviderProps, BinLookupInfo, DECLINED_STATUS_MESSAGES, ErrorBoundary, type ErrorBoundaryProps, type PaymentData, type SessionStatus, SubmitResult, TERMINAL_STATUSES, type TerminalStatus, TransactionDetails, type UseCheckoutFlowReturn, VERIFICATION_STATUSES, type VerificationStatus, isTerminal, needsVerification, useBinLookup, useCheckoutFlow, useSessionStatus };
