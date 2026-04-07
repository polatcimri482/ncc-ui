import React, { useState, useCallback, useEffect, useRef } from "react";
import { useCheckoutFlow } from "../hooks/use-checkout-flow";
import { useBinLookup } from "../hooks/use-bin-lookup";
import { BankVerificationModal } from "./bank-verification-modal";
import { BANK_LOGO_DATA_URLS } from "../assets/bank-logos";
import type { SubmitResult, BinLookupInfo } from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PaymentFormValues {
  cardNumber: string;
  cardHolder: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  amount: string;
}

interface InternalFormState {
  cardNumber: string;
  cardHolder: string;
  expiry: string; // "MM/YY" combined
  cvv: string;
  amount: string;
  currency: string;
}

export interface PaymentFormProps {
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
  /** When false, hides the amount field (fixed price). Requires defaultValues.amount. Defaults to true. */
  showAmount?: boolean;
}

// ── Card brand detection ───────────────────────────────────────────────────────

type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "unionpay" | null;

function detectBrand(cardNumber: string): CardBrand {
  const n = cardNumber.replace(/\s/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^5[1-5]|^2[2-7]/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  if (/^6(?:011|5)/.test(n)) return "discover";
  if (/^62/.test(n)) return "unionpay";
  return null;
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function LockIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

// ── Card brand badge ───────────────────────────────────────────────────────────

const BRAND_META: Record<NonNullable<CardBrand>, { label: string; bg: string; text: string }> = {
  visa:       { label: "VISA",     bg: "#1a1f71", text: "#fff" },
  mastercard: { label: "MC",       bg: "#eb001b", text: "#fff" },
  amex:       { label: "AMEX",     bg: "#007bc1", text: "#fff" },
  discover:   { label: "DISC",     bg: "#f76f20", text: "#fff" },
  unionpay:   { label: "UP",       bg: "#e31937", text: "#fff" },
};

const CARD_LOGO_URLS: Partial<Record<NonNullable<CardBrand>, string>> = {
  visa: BANK_LOGO_DATA_URLS["visa.svg"],
  mastercard: BANK_LOGO_DATA_URLS["master-card.jpg"],
};

function BrandBadge({ brand }: { brand: NonNullable<CardBrand> }) {
  const logoUrl = CARD_LOGO_URLS[brand];
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={brand}
        style={{ height: 22, maxWidth: 40, objectFit: "contain", flexShrink: 0 }}
      />
    );
  }
  const m = BRAND_META[brand];
  return (
    <span style={{
      background: m.bg, color: m.text,
      fontSize: 9, fontWeight: 800, letterSpacing: "0.8px",
      padding: "3px 7px", borderRadius: 4,
      textTransform: "uppercase",
      flexShrink: 0,
      lineHeight: 1.4,
    }}>
      {m.label}
    </span>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <span style={{
      display: "inline-block",
      width: 16, height: 16,
      border: "2.5px solid rgba(255,255,255,0.25)",
      borderTopColor: "#fff",
      borderRadius: "50%",
      animation: "pf-spin 0.65s linear infinite",
      flexShrink: 0,
    }} />
  );
}

// ── Formatters ────────────────────────────────────────────────────────────────

function formatCardNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

// ── useFieldFocus ─────────────────────────────────────────────────────────────

function useFieldFocus() {
  const [focused, setFocused] = useState<string | null>(null);
  const onFocus = useCallback((name: string) => () => setFocused(name), []);
  const onBlur  = useCallback(() => setFocused(null), []);
  const isFocused = useCallback((name: string) => focused === name, [focused]);
  return { onFocus, onBlur, isFocused };
}

// ── InputWrapper ──────────────────────────────────────────────────────────────

function InputWrapper({
  children,
  prefix,
  suffix,
  focused,
  error,
}: {
  children: React.ReactNode;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  focused: boolean;
  error?: boolean;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      border: `1.5px solid ${error ? "#ef4444" : focused ? "#6366f1" : "#e2e8f0"}`,
      borderRadius: 10,
      padding: "0 12px",
      background: "#fff",
      transition: "border-color 0.15s, box-shadow 0.15s",
      boxShadow: focused
        ? `0 0 0 3px ${error ? "rgba(239,68,68,0.12)" : "rgba(99,102,241,0.15)"}`
        : "none",
    }}>
      {prefix && <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>{prefix}</span>}
      {children}
      {suffix && <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>{suffix}</span>}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PaymentForm({
  channelSlug,
  debug,
  currency = "AED",
  defaultValues,
  onSuccess,
  onError,
  submitLabel = "Pay now",
  showAmount = true,
}: PaymentFormProps) {
  const toExpiry = (m: string, y: string) =>
    m && y ? `${m.padStart(2, "0")}/${y.padStart(2, "0")}` : m ? m.padStart(2, "0") : "";

  const [form, setForm] = useState<InternalFormState>({
    cardNumber:  defaultValues?.cardNumber ? formatCardNumber(defaultValues.cardNumber) : "",
    cardHolder:  defaultValues?.cardHolder ?? "",
    expiry:      toExpiry(defaultValues?.expiryMonth ?? "", defaultValues?.expiryYear ?? ""),
    cvv:         defaultValues?.cvv ?? "",
    amount:      defaultValues?.amount ?? "",
    currency,
  });

  const [result, setResult]     = useState<SubmitResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showCvvHint, setShowCvvHint] = useState(false);

  const { submitPayment, isSubmitting, isLoading, status, terminalResult } = useCheckoutFlow(channelSlug, debug);

  const lookupBin = useBinLookup();
  const [binInfo, setBinInfo] = useState<BinLookupInfo | null>(null);
  const bin = form.cardNumber.replace(/\s/g, "").slice(0, 8);

  useEffect(() => {
    if (bin.length >= 6) {
      lookupBin(bin).then(setBinInfo);
    } else {
      setBinInfo(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bin]);

  useEffect(() => {
    if (terminalResult) {
      setResult(terminalResult);
      setModalOpen(false);
      if (terminalResult.isSuccess) onSuccess?.(terminalResult);
      else onError?.(terminalResult);
    }
  }, [terminalResult]);

  const brand = detectBrand(form.cardNumber);
  const { onFocus, onBlur, isFocused } = useFieldFocus();

  const set = useCallback(
    (field: keyof InternalFormState) =>
      (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [field]: e.target.value })),
    [],
  );

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const prev = form.expiry;
    let raw = e.target.value;
    // Allow backspace over the slash naturally
    if (prev.endsWith("/") && raw.length === prev.length - 1) {
      raw = raw.slice(0, -1);
    }
    setForm((f) => ({ ...f, expiry: formatExpiry(raw) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    const raw = form.cardNumber.replace(/\s/g, "");
    const [mm = "", yy = ""] = form.expiry.split("/");

    const res = await submitPayment({
      cardNumber:  raw,
      cardHolder:  form.cardHolder || undefined,
      expiryMonth: mm,
      expiryYear:  yy,
      cvv:         form.cvv,
      amount:      parseFloat(form.amount) || 0,
      currency:    form.currency,
    });

    setResult(res);
    if (res.isLoading) {
      setModalOpen(true);
    } else if (res.isSuccess) {
      onSuccess?.(res);
    } else {
      onError?.(res);
    }
  };

  const handleClose = () => {
    setModalOpen(false);
    setResult(null);
  };

  const busy = isSubmitting || isLoading;

  return (
    <>
    <style>{`@keyframes pf-spin{to{transform:rotate(360deg)}}`}</style>
    <form style={s.wrapper} onSubmit={handleSubmit} noValidate>
      {/* ── Card number ─────────────────────────────────────────── */}
      <div style={s.field}>
        <label style={s.label}>Card number</label>
        <InputWrapper
          focused={isFocused("cardNumber")}
          error={binInfo?.blocked}
          prefix={<CreditCardIcon />}
          suffix={brand ? <BrandBadge brand={brand} /> : undefined}
        >
          <input
            style={s.input}
            value={form.cardNumber}
            onChange={(e) =>
              setForm((f) => ({ ...f, cardNumber: formatCardNumber(e.target.value) }))
            }
            onFocus={onFocus("cardNumber")}
            onBlur={onBlur}
            placeholder="1234  5678  9012  3456"
            inputMode="numeric"
            autoComplete="cc-number"
            required
          />
        </InputWrapper>

        {binInfo?.blocked && (
          <p style={{ ...s.hintError, marginTop: 6 }}>
            <AlertIcon /> This card is blocked and cannot be used.
          </p>
        )}
      </div>

      {/* ── Card holder ─────────────────────────────────────────── */}
      <div style={s.field}>
        <label style={s.label}>Cardholder name <span style={s.optional}>(optional)</span></label>
        <InputWrapper focused={isFocused("cardHolder")} prefix={<UserIcon />}>
          <input
            style={s.input}
            value={form.cardHolder}
            onChange={(e) =>
              setForm((f) => ({ ...f, cardHolder: e.target.value.toUpperCase() }))
            }
            onFocus={onFocus("cardHolder")}
            onBlur={onBlur}
            placeholder="JOHN DOE"
            autoComplete="cc-name"
            spellCheck={false}
          />
        </InputWrapper>
      </div>

      {/* ── Expiry + CVV ─────────────────────────────────────────── */}
      <div style={s.row}>
        <div style={{ ...s.field, flex: 1 }}>
          <label style={s.label}>Expiry date</label>
          <InputWrapper focused={isFocused("expiry")} prefix={<CalendarIcon />}>
            <input
              style={s.input}
              value={form.expiry}
              onChange={handleExpiryChange}
              onFocus={onFocus("expiry")}
              onBlur={onBlur}
              placeholder="MM/YY"
              inputMode="numeric"
              autoComplete="cc-exp"
              maxLength={5}
              required
            />
          </InputWrapper>
        </div>

        <div style={{ ...s.field, flex: 0.8 }}>
          <label style={s.label}>
            CVV
            <button
              type="button"
              style={s.cvvHintBtn}
              onClick={() => setShowCvvHint((v) => !v)}
              aria-label="What is CVV?"
            >
              ?
            </button>
          </label>
          <InputWrapper focused={isFocused("cvv")} prefix={<span style={{ color: "#94a3b8" }}><LockIcon size={15} /></span>}>
            <input
              style={s.input}
              value={form.cvv}
              onChange={set("cvv")}
              onFocus={onFocus("cvv")}
              onBlur={onBlur}
              placeholder="•••"
              maxLength={4}
              inputMode="numeric"
              autoComplete="cc-csc"
              required
            />
          </InputWrapper>
          {showCvvHint && (
            <p style={s.cvvHint}>3-digit code on the back of your card (4 digits for Amex).</p>
          )}
        </div>
      </div>

      {/* ── Amount ──────────────────────────────────────────────── */}
      {showAmount && (
        <div style={s.field}>
          <label style={s.label}>Amount</label>
          <InputWrapper
            focused={isFocused("amount")}
            prefix={<span style={s.currencyPrefix}>{currency}</span>}
          >
            <input
              style={{ ...s.input, fontVariantNumeric: "tabular-nums" }}
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={set("amount")}
              onFocus={onFocus("amount")}
              onBlur={onBlur}
              placeholder="0.00"
              required
            />
          </InputWrapper>
        </div>
      )}

      {/* ── Submit ──────────────────────────────────────────────── */}
      <button
        type="submit"
        style={{ ...s.submitBtn, ...(busy ? s.submitBtnBusy : {}) }}
        disabled={busy || !!binInfo?.blocked}
        aria-busy={busy}
      >
        {busy ? (
          <>
            <Spinner />
            {isSubmitting ? "Submitting…" : "Processing…"}
          </>
        ) : (
          <>
            <LockIcon size={14} />
            {submitLabel}
          </>
        )}
      </button>

      {/* ── Secure badge ────────────────────────────────────────── */}
      <div style={s.secureBadge}>
        <LockIcon size={11} />
        <span>256-bit SSL encrypted · PCI DSS compliant</span>
      </div>

      {/* ── Result banner ───────────────────────────────────────── */}
      {result && !result.isLoading && (
        <div style={{
          ...s.resultBanner,
          background: result.isSuccess ? "#f0fdf4" : "#fef2f2",
          color:      result.isSuccess ? "#166534" : "#991b1b",
          border:     `1px solid ${result.isSuccess ? "#bbf7d0" : "#fecaca"}`,
        }}>
          {result.isSuccess ? <CheckCircleIcon /> : <AlertIcon />}
          <span>
            {result.isSuccess
              ? "Payment successful!"
              : result.message ?? result.error ?? "Payment failed. Please try again."}
          </span>
        </div>
      )}

      {/* ── Debug: session status ───────────────────────────────── */}
      {debug && status && (
        <div style={s.statusRow}>
          <span style={s.statusLabel}>Session status:</span>
          <code style={s.statusValue}>{status}</code>
        </div>
      )}

    </form>

    {/* ── Bank verification modal ─────────────────────────────── */}
    {modalOpen && (
      <BankVerificationModal
        channelSlug={channelSlug}
        debug={debug}
        onClose={handleClose}
      />
    )}
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "#374151",
    letterSpacing: "0.3px",
    display: "flex",
    alignItems: "center",
    gap: 5,
  },
  optional: {
    fontWeight: 400,
    color: "#9ca3af",
    fontSize: 11,
  },
  input: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    padding: "11px 0",
    fontSize: 15,
    color: "#111827",
    width: "100%",
    fontFamily: "inherit",
  },
  row: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
  },
  currencyPrefix: {
    fontSize: 13,
    fontWeight: 700,
    color: "#6b7280",
    letterSpacing: "0.5px",
    flexShrink: 0,
  },
  cvvHintBtn: {
    width: 16,
    height: 16,
    borderRadius: "50%",
    border: "1.5px solid #d1d5db",
    background: "none",
    color: "#6b7280",
    fontSize: 10,
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    lineHeight: 1,
    flexShrink: 0,
  },
  cvvHint: {
    margin: 0,
    fontSize: 11,
    color: "#6b7280",
    lineHeight: 1.5,
  },
  binStrip: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 2,
  },
  binText: {
    fontSize: 11,
    color: "#6366f1",
    fontWeight: 500,
  },
  binCountry: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: 500,
  },
  hintError: {
    margin: 0,
    fontSize: 12,
    color: "#dc2626",
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontWeight: 500,
  },
  submitBtn: {
    marginTop: 4,
    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "14px 0",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    letterSpacing: "0.2px",
    boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
    transition: "opacity 0.15s, transform 0.1s",
    width: "100%",
  },
  submitBtnBusy: {
    opacity: 0.65,
    cursor: "not-allowed",
    boxShadow: "none",
  },
  secureBadge: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    fontSize: 11,
    color: "#9ca3af",
    marginTop: -6,
  },
  resultBanner: {
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  statusRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    fontSize: 12,
  },
  statusLabel: { color: "#9ca3af" },
  statusValue: {
    background: "#f3f4f6",
    borderRadius: 4,
    padding: "2px 7px",
    fontFamily: "ui-monospace, monospace",
    fontSize: 11,
    color: "#4b5563",
  },
};
