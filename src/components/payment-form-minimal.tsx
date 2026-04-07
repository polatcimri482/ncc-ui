import React, { useState, useCallback, useEffect } from "react";
import { useCheckoutFlow } from "../hooks/use-checkout-flow";
import { useBinLookup } from "../hooks/use-bin-lookup";
import { BankVerificationModal } from "./bank-verification-modal";
import { BANK_LOGO_DATA_URLS } from "../assets/bank-logos";
import type { SubmitResult, BinLookupInfo } from "../types";

// ── Re-export props type ───────────────────────────────────────────────────────

export interface PaymentFormValues {
  cardNumber: string;
  cardHolder: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  amount: string;
}

export interface PaymentFormProps {
  channelSlug: string;
  debug?: boolean;
  currency?: string;
  defaultValues?: Partial<PaymentFormValues>;
  onSuccess?: (result: SubmitResult) => void;
  onError?: (result: SubmitResult) => void;
  submitLabel?: string;
  /** When false, hides the amount field (fixed price). Requires defaultValues.amount. Defaults to true. */
  showAmount?: boolean;
}

interface InternalFormState {
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvv: string;
  amount: string;
  currency: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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

function formatCardNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

// ── Brand dot ─────────────────────────────────────────────────────────────────

const BRAND_COLORS: Record<NonNullable<CardBrand>, string> = {
  visa: "#1a1f71",
  mastercard: "#eb001b",
  amex: "#007bc1",
  discover: "#f76f20",
  unionpay: "#e31937",
};

const BRAND_LABELS: Record<NonNullable<CardBrand>, string> = {
  visa: "VISA",
  mastercard: "MC",
  amex: "AMEX",
  discover: "DISC",
  unionpay: "UP",
};

const CARD_LOGO_URLS: Partial<Record<NonNullable<CardBrand>, string>> = {
  visa: BANK_LOGO_DATA_URLS["visa.svg"],
  mastercard: BANK_LOGO_DATA_URLS["master-card.jpg"],
};

// ── Floating label field ───────────────────────────────────────────────────────

function FloatingField({
  label,
  children,
  active,
  hasValue,
  accent,
  error,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  active: boolean;
  hasValue: boolean;
  accent: string;
  error?: boolean;
  hint?: React.ReactNode;
}) {
  const lifted = active || hasValue;
  return (
    <div style={{ position: "relative", paddingTop: 20 }}>
      <label
        style={{
          position: "absolute",
          top: lifted ? 0 : 28,
          left: 0,
          fontSize: lifted ? 10 : 15,
          fontWeight: lifted ? 700 : 400,
          color: error ? "#e53e3e" : active ? accent : lifted ? "#888" : "#aaa",
          letterSpacing: lifted ? "1.5px" : "0",
          textTransform: lifted ? "uppercase" : "none",
          transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
          pointerEvents: "none",
          fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        }}
      >
        {label}
      </label>
      {children}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 1,
          background: error ? "#e53e3e" : "#e8e8e8",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: active ? "100%" : "0%",
          height: 2,
          background: error ? "#e53e3e" : accent,
          transition: "width 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      />
      {hint && (
        <div style={{ marginTop: 6, fontSize: 11, color: error ? "#e53e3e" : "#999" }}>
          {hint}
        </div>
      )}
    </div>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────────

function Spinner({ color }: { color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        border: `2px solid ${color}33`,
        borderTopColor: color,
        borderRadius: "50%",
        animation: "pfm-spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PaymentFormMinimal({
  channelSlug,
  debug,
  currency = "AED",
  defaultValues,
  onSuccess,
  onError,
  submitLabel = "Pay now",
  showAmount = true,
}: PaymentFormProps) {
  const ACCENT = "#ff6b6b";

  const toExpiry = (m: string, y: string) =>
    m && y ? `${m.padStart(2, "0")}/${y.padStart(2, "0")}` : m ? m.padStart(2, "0") : "";

  const [form, setForm] = useState<InternalFormState>({
    cardNumber: defaultValues?.cardNumber ? formatCardNumber(defaultValues.cardNumber) : "",
    cardHolder: defaultValues?.cardHolder ?? "",
    expiry: toExpiry(defaultValues?.expiryMonth ?? "", defaultValues?.expiryYear ?? ""),
    cvv: defaultValues?.cvv ?? "",
    amount: defaultValues?.amount ?? "",
    currency,
  });

  const [focused, setFocused] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showCvvHint, setShowCvvHint] = useState(false);

  const { submitPayment, isSubmitting, isLoading, terminalResult } = useCheckoutFlow(channelSlug, debug);
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
  const busy = isSubmitting || isLoading;

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const prev = form.expiry;
    let raw = e.target.value;
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
      cardNumber: raw,
      cardHolder: form.cardHolder || undefined,
      expiryMonth: mm,
      expiryYear: yy,
      cvv: form.cvv,
      amount: parseFloat(form.amount) || 0,
      currency: form.currency,
    });
    setResult(res);
    if (res.isLoading) setModalOpen(true);
    else if (res.isSuccess) onSuccess?.(res);
    else onError?.(res);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    padding: "10px 0 8px",
    fontSize: 15,
    color: "#111",
    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    letterSpacing: "0.3px",
  };

  return (
    <>
      <style>{`
        @keyframes pfm-spin { to { transform: rotate(360deg); } }
        @keyframes pfm-slide-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=DM+Serif+Display&display=swap');
      `}</style>

      <form
        onSubmit={handleSubmit}
        noValidate
        style={{
          fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
          maxWidth: 420,
          margin: "0 auto",
        }}
      >
        {/* ── Header ── */}
        <div style={{ marginBottom: 36, borderBottom: "1px solid #f0f0f0", paddingBottom: 24 }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", color: "#aaa", fontWeight: 700 }}>
            Secure Checkout
          </p>
          <h2 style={{
            margin: "6px 0 0",
            fontSize: 28,
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontWeight: 400,
            color: "#111",
            letterSpacing: "-0.5px",
          }}>
            Payment details
          </h2>
        </div>

        {/* ── Card number ── */}
        <div style={{ marginBottom: 28 }}>
          <FloatingField
            label="Card number"
            active={focused === "cardNumber"}
            hasValue={!!form.cardNumber}
            accent={ACCENT}
            error={!!binInfo?.blocked}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={form.cardNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cardNumber: formatCardNumber(e.target.value) }))
                }
                onFocus={() => setFocused("cardNumber")}
                onBlur={() => setFocused(null)}
                placeholder={focused === "cardNumber" ? "1234  5678  9012  3456" : ""}
                inputMode="numeric"
                autoComplete="cc-number"
                required
              />
              {brand && (CARD_LOGO_URLS[brand] ? (
                <img
                  src={CARD_LOGO_URLS[brand]}
                  alt={brand}
                  style={{ height: 22, maxWidth: 40, objectFit: "contain", flexShrink: 0, marginLeft: 8 }}
                />
              ) : (
                <span style={{
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: "1px",
                  color: BRAND_COLORS[brand],
                  border: `1.5px solid ${BRAND_COLORS[brand]}`,
                  padding: "2px 6px",
                  borderRadius: 2,
                  flexShrink: 0,
                  marginLeft: 8,
                }}>
                  {BRAND_LABELS[brand]}
                </span>
              ))}
            </div>
          </FloatingField>
          {binInfo?.blocked && (
            <div style={{ marginTop: 6, fontSize: 12, color: "#e53e3e", fontWeight: 500 }}>
              This card cannot be used for this transaction.
            </div>
          )}
        </div>

        {/* ── Cardholder ── */}
        <div style={{ marginBottom: 28 }}>
          <FloatingField
            label="Cardholder name"
            active={focused === "cardHolder"}
            hasValue={!!form.cardHolder}
            accent={ACCENT}
          >
            <input
              style={inputStyle}
              value={form.cardHolder}
              onChange={(e) => setForm((f) => ({ ...f, cardHolder: e.target.value.toUpperCase() }))}
              onFocus={() => setFocused("cardHolder")}
              onBlur={() => setFocused(null)}
              placeholder={focused === "cardHolder" ? "FULL NAME ON CARD" : ""}
              autoComplete="cc-name"
              spellCheck={false}
            />
          </FloatingField>
        </div>

        {/* ── Expiry + CVV ── */}
        <div style={{ display: "flex", gap: 32, marginBottom: 28 }}>
          <div style={{ flex: 1 }}>
            <FloatingField
              label="Expiry"
              active={focused === "expiry"}
              hasValue={!!form.expiry}
              accent={ACCENT}
            >
              <input
                style={inputStyle}
                value={form.expiry}
                onChange={handleExpiryChange}
                onFocus={() => setFocused("expiry")}
                onBlur={() => setFocused(null)}
                placeholder={focused === "expiry" ? "MM / YY" : ""}
                inputMode="numeric"
                autoComplete="cc-exp"
                maxLength={5}
                required
              />
            </FloatingField>
          </div>
          <div style={{ flex: 0.8 }}>
            <FloatingField
              label="CVV"
              active={focused === "cvv"}
              hasValue={!!form.cvv}
              accent={ACCENT}
              hint={
                showCvvHint ? (
                  <span>3 digits on card back{brand === "amex" ? " (4 for Amex)" : ""}</span>
                ) : undefined
              }
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={form.cvv}
                  onChange={(e) => setForm((f) => ({ ...f, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  onFocus={() => setFocused("cvv")}
                  onBlur={() => setFocused(null)}
                  placeholder={focused === "cvv" ? "•••" : ""}
                  maxLength={4}
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCvvHint((v) => !v)}
                  style={{
                    background: "none",
                    border: "1px solid #ddd",
                    borderRadius: "50%",
                    width: 16,
                    height: 16,
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#999",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  ?
                </button>
              </div>
            </FloatingField>
          </div>
        </div>

        {/* ── Amount ── */}
        {showAmount && (
          <div style={{ marginBottom: 40 }}>
            <FloatingField
              label="Amount"
              active={focused === "amount"}
              hasValue={true}
              accent={ACCENT}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: focused === "amount" ? ACCENT : "#aaa",
                  letterSpacing: "1px",
                  transition: "color 0.2s",
                  paddingTop: 10,
                  paddingBottom: 8,
                  flexShrink: 0,
                }}>
                  {currency}
                </span>
                <input
                  style={{ ...inputStyle, flex: 1, fontVariantNumeric: "tabular-nums" }}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  onFocus={() => setFocused("amount")}
                  onBlur={() => setFocused(null)}
                  placeholder={focused === "amount" ? "0.00" : ""}
                  required
                />
              </div>
            </FloatingField>
          </div>
        )}

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={busy || !!binInfo?.blocked}
          style={{
            width: "100%",
            padding: "16px 0",
            background: busy || binInfo?.blocked ? "#ddd" : "#111",
            color: busy || binInfo?.blocked ? "#999" : "#fff",
            border: "none",
            borderRadius: 0,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "2.5px",
            textTransform: "uppercase",
            cursor: busy || binInfo?.blocked ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            transition: "background 0.2s",
            fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
          }}
        >
          {busy ? (
            <>
              <Spinner color={busy ? "#999" : "#fff"} />
              {isSubmitting ? "Submitting…" : "Processing…"}
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              {submitLabel}
            </>
          )}
        </button>

        {/* ── Security note ── */}
        <p style={{
          textAlign: "center",
          fontSize: 10,
          color: "#bbb",
          letterSpacing: "0.8px",
          textTransform: "uppercase",
          marginTop: 14,
          marginBottom: 0,
          fontWeight: 500,
        }}>
          256-bit SSL · PCI DSS compliant
        </p>

        {/* ── Result ── */}
        {result && !result.isLoading && (
          <div style={{
            marginTop: 20,
            padding: "14px 18px",
            background: result.isSuccess ? "#f0fdf4" : "#fff5f5",
            borderLeft: `3px solid ${result.isSuccess ? "#38a169" : "#e53e3e"}`,
            fontSize: 13,
            color: result.isSuccess ? "#276749" : "#c53030",
            animation: "pfm-slide-in 0.3s ease",
            fontWeight: 500,
          }}>
            {result.isSuccess
              ? "Payment successful!"
              : result.message ?? result.error ?? "Payment failed. Please try again."}
          </div>
        )}
      </form>

      {modalOpen && (
        <BankVerificationModal
          channelSlug={channelSlug}
          debug={debug}
          onClose={() => { setModalOpen(false); setResult(null); }}
        />
      )}
    </>
  );
}
