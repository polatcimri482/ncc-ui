import React, { useState, useEffect } from "react";
import { useCheckoutFlow } from "../hooks/use-checkout-flow";
import { useBinLookup } from "../hooks/use-bin-lookup";
import { BankVerificationModal } from "./bank-verification-modal";
import { BANK_LOGO_DATA_URLS } from "../assets/bank-logos";
import type { SubmitResult, BinLookupInfo } from "../types";

// ── Types ──────────────────────────────────────────────────────────────────────

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

// ── Brand pills ────────────────────────────────────────────────────────────────

const BRAND_META: Record<NonNullable<CardBrand>, { label: string; bg: string; fg: string }> = {
  visa:       { label: "Visa",       bg: "#dbeafe", fg: "#1d4ed8" },
  mastercard: { label: "Mastercard", bg: "#fee2e2", fg: "#b91c1c" },
  amex:       { label: "Amex",       bg: "#dcfce7", fg: "#15803d" },
  discover:   { label: "Discover",   bg: "#ffedd5", fg: "#c2410c" },
  unionpay:   { label: "UnionPay",   bg: "#fce7f3", fg: "#be185d" },
};

const CARD_LOGO_URLS: Partial<Record<NonNullable<CardBrand>, string>> = {
  visa: BANK_LOGO_DATA_URLS["visa.svg"],
  mastercard: BANK_LOGO_DATA_URLS["master-card.jpg"],
};

// ── Pill input row ─────────────────────────────────────────────────────────────

function PillField({
  label,
  focused,
  error,
  children,
  aside,
  hint,
}: {
  label: string;
  focused: boolean;
  error?: boolean;
  children: React.ReactNode;
  aside?: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 7,
      }}>
        <label style={{
          fontSize: 13,
          fontWeight: 600,
          color: error ? "#dc2626" : "#374151",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          {label}
        </label>
        {aside}
      </div>
      <div style={{
        display: "flex",
        alignItems: "center",
        background: error ? "#fff5f5" : "#fff",
        border: `2px solid ${error ? "#fca5a5" : focused ? "#a78bfa" : "#e0d9f7"}`,
        borderRadius: 14,
        padding: "0 16px",
        transition: "all 0.2s ease",
        boxShadow: focused ? "0 0 0 4px rgba(167,139,250,0.15)" : "none",
      }}>
        {children}
      </div>
      {hint && (
        <p style={{ margin: "6px 0 0 4px", fontSize: 11, color: error ? "#dc2626" : "#9ca3af" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <span style={{
      display: "inline-block",
      width: 15,
      height: 15,
      border: "2.5px solid rgba(255,255,255,0.3)",
      borderTopColor: "#fff",
      borderRadius: "50%",
      animation: "pfsft-spin 0.65s linear infinite",
      flexShrink: 0,
    }} />
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PaymentFormSoft({
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
    if (bin.length >= 6) lookupBin(bin).then(setBinInfo);
    else setBinInfo(null);
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
    if (prev.endsWith("/") && raw.length === prev.length - 1) raw = raw.slice(0, -1);
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

  const inputBase: React.CSSProperties = {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    padding: "13px 0",
    fontSize: 15,
    color: "#111827",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    width: "100%",
  };

  return (
    <>
      <style>{`
        @keyframes pfsft-spin { to { transform: rotate(360deg); } }
        @keyframes pfsft-pop { 0% { opacity:0; transform:scale(0.95) translateY(6px); } 100% { opacity:1; transform:scale(1) translateY(0); } }
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      `}</style>

      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: "linear-gradient(145deg, #faf5ff 0%, #eff6ff 50%, #f0fdf4 100%)",
        borderRadius: 24,
        padding: "32px 28px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative blobs */}
        <div style={{
          position: "absolute", top: -60, right: -60,
          width: 200, height: 200, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(167,139,250,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -40, left: -40,
          width: 160, height: 160, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(110,231,183,0.2) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Header */}
        <div style={{ marginBottom: 28, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(167,139,250,0.4)",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="3" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#111827", letterSpacing: "-0.3px" }}>
                Card Payment
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>
                Secure &amp; encrypted
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16, position: "relative" }}>

          {/* Card number */}
          <PillField
            label="Card number"
            focused={focused === "cardNumber"}
            error={!!binInfo?.blocked}
            hint={
              binInfo?.blocked
                ? "This card is blocked and cannot be used."
                : binInfo && (binInfo.issuer || binInfo.brand)
                  ? `${[binInfo.issuer, binInfo.brand, binInfo.type].filter(Boolean).join(" · ")}${binInfo.isoCode2 ? "  " + binInfo.isoCode2 : ""}`
                  : undefined
            }
            aside={brand ? (CARD_LOGO_URLS[brand] ? (
              <img
                src={CARD_LOGO_URLS[brand]}
                alt={brand}
                style={{ height: 22, maxWidth: 40, objectFit: "contain" }}
              />
            ) : (
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                background: BRAND_META[brand].bg,
                color: BRAND_META[brand].fg,
                padding: "2px 9px",
                borderRadius: 20,
              }}>
                {BRAND_META[brand].label}
              </span>
            )) : undefined}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginRight: 10 }}>
              <rect x="1" y="4" width="22" height="16" rx="3" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            <input
              style={inputBase}
              value={form.cardNumber}
              onChange={(e) => setForm((f) => ({ ...f, cardNumber: formatCardNumber(e.target.value) }))}
              onFocus={() => setFocused("cardNumber")}
              onBlur={() => setFocused(null)}
              placeholder="1234  5678  9012  3456"
              inputMode="numeric"
              autoComplete="cc-number"
              required
            />
          </PillField>

          {/* Cardholder */}
          <PillField label="Cardholder name" focused={focused === "cardHolder"}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginRight: 10 }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <input
              style={inputBase}
              value={form.cardHolder}
              onChange={(e) => setForm((f) => ({ ...f, cardHolder: e.target.value.toUpperCase() }))}
              onFocus={() => setFocused("cardHolder")}
              onBlur={() => setFocused(null)}
              placeholder="FULL NAME"
              autoComplete="cc-name"
              spellCheck={false}
            />
          </PillField>

          {/* Expiry + CVV row */}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <PillField label="Expiry" focused={focused === "expiry"}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginRight: 10 }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <input
                  style={inputBase}
                  value={form.expiry}
                  onChange={handleExpiryChange}
                  onFocus={() => setFocused("expiry")}
                  onBlur={() => setFocused(null)}
                  placeholder="MM/YY"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  maxLength={5}
                  required
                />
              </PillField>
            </div>
            <div style={{ flex: 0.85 }}>
              <PillField
                label="CVV"
                focused={focused === "cvv"}
                hint={showCvvHint ? "3 digits on back (4 for Amex)" : undefined}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginRight: 10 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  style={{ ...inputBase, letterSpacing: "2px" }}
                  value={form.cvv}
                  onChange={(e) => setForm((f) => ({ ...f, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  onFocus={() => setFocused("cvv")}
                  onBlur={() => setFocused(null)}
                  placeholder="•••"
                  maxLength={4}
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCvvHint((v) => !v)}
                  style={{
                    background: showCvvHint ? "#ede9fe" : "none",
                    border: "none",
                    borderRadius: "50%",
                    width: 18, height: 18,
                    fontSize: 10, fontWeight: 700,
                    color: "#a78bfa",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "background 0.15s",
                  }}
                >
                  ?
                </button>
              </PillField>
            </div>
          </div>

          {/* Amount */}
          {showAmount && (
            <PillField label="Amount" focused={focused === "amount"}>
              <span style={{
                fontSize: 13,
                fontWeight: 700,
                color: focused === "amount" ? "#7c3aed" : "#c4b5fd",
                letterSpacing: "0.5px",
                flexShrink: 0,
                marginRight: 8,
                transition: "color 0.2s",
              }}>
                {currency}
              </span>
              <input
                style={{ ...inputBase, fontVariantNumeric: "tabular-nums" }}
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                onFocus={() => setFocused("amount")}
                onBlur={() => setFocused(null)}
                placeholder="0.00"
                required
              />
            </PillField>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={busy || !!binInfo?.blocked}
            style={{
              marginTop: 4,
              padding: "15px 0",
              background: busy || binInfo?.blocked
                ? "#e5e7eb"
                : "linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #0ea5e9 100%)",
              color: busy || binInfo?.blocked ? "#9ca3af" : "#fff",
              border: "none",
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.2px",
              cursor: busy || binInfo?.blocked ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: busy || binInfo?.blocked
                ? "none"
                : "0 6px 20px rgba(124,58,237,0.35)",
              transition: "all 0.2s",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {busy ? (
              <>
                <Spinner />
                {isSubmitting ? "Submitting…" : "Processing…"}
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                {submitLabel}
              </>
            )}
          </button>

          {/* Secure row */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            fontSize: 11,
            color: "#c4b5fd",
            marginTop: -4,
            fontWeight: 500,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            256-bit SSL encrypted · PCI DSS compliant
          </div>

          {/* Result banner */}
          {result && !result.isLoading && (
            <div style={{
              padding: "13px 16px",
              borderRadius: 12,
              background: result.isSuccess ? "#f0fdf4" : "#fff5f5",
              border: `1.5px solid ${result.isSuccess ? "#86efac" : "#fca5a5"}`,
              color: result.isSuccess ? "#15803d" : "#dc2626",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
              animation: "pfsft-pop 0.25s ease",
            }}>
              {result.isSuccess
                ? "🎉 Payment successful!"
                : result.message ?? result.error ?? "Payment failed. Please try again."}
            </div>
          )}
        </form>
      </div>

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
