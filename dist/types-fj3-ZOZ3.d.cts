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
/** Props for BankVerificationModal — the main self-contained UI entry point. */
interface BankVerificationModalProps {
    channelSlug: string;
    /** When true, logs flow events and state to console for debugging */
    debug?: boolean;
    /** Optional callback when user closes the modal. Session reset is handled internally. */
    onClose?: () => void;
}
type OperatorMessageLevel = "error" | "info";
interface OperatorMessage {
    level: OperatorMessageLevel;
    message: string;
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

export type { BankVerificationModalProps as B, FailureStatus as F, OperatorMessage as O, SubmitResult as S, TransactionDetails as T, VerificationLayout as V, BinLookupInfo as a };
