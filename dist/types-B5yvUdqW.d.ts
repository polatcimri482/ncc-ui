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

export type { BankVerificationModalProps as B, FailureStatus as F, SubmitResult as S, TransactionDetails as T, VerificationLayout as V, BankVerificationProviderProps as a, BinLookupInfo as b, BankVerificationProps as c };
