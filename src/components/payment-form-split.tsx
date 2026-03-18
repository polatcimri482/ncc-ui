import React, { useState, useEffect } from "react";
import { useCheckoutFlow } from "../hooks/use-checkout-flow";
import { useBinLookup } from "../hooks/use-bin-lookup";
import { BankVerificationModal } from "./bank-verification-modal";
import { getBankLogoUrl } from "../lib/bank-logos";
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

// ── Card brand gradients ───────────────────────────────────────────────────────

const BRAND_GRADIENTS: Record<NonNullable<CardBrand> | "default", string> = {
  visa:       "linear-gradient(135deg, #1a1f71 0%, #1565c0 60%, #1e88e5 100%)",
  mastercard: "linear-gradient(135deg, #1a0000 0%, #b71c1c 50%, #e53935 100%)",
  amex:       "linear-gradient(135deg, #004d40 0%, #00695c 50%, #00897b 100%)",
  discover:   "linear-gradient(135deg, #e65100 0%, #f57c00 60%, #ffa726 100%)",
  unionpay:   "linear-gradient(135deg, #880e4f 0%, #c62828 60%, #e53935 100%)",
  default:    "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
};

const BRAND_LABELS: Record<NonNullable<CardBrand>, string> = {
  visa: "VISA",
  mastercard: "MASTERCARD",
  amex: "AMERICAN EXPRESS",
  discover: "DISCOVER",
  unionpay: "UNIONPAY",
};

// ── Live card preview ─────────────────────────────────────────────────────────

function CardPreview({
  cardNumber,
  cardHolder,
  expiry,
  cvv,
  brand,
  cvvFocused,
}: {
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvv: string;
  brand: CardBrand;
  cvvFocused: boolean;
}) {
  const gradient = brand ? BRAND_GRADIENTS[brand] : BRAND_GRADIENTS.default;

  // Display: mask all but last 4 digits
  const raw = cardNumber.replace(/\s/g, "");
  const displayNumber = raw.length > 0
    ? raw.padEnd(16, "•").replace(/(.{4})/g, "$1 ").trim()
    : "•••• •••• •••• ••••";

  const displayHolder = cardHolder || "FULL NAME";
  const displayExpiry = expiry || "MM/YY";

  return (
    <div style={{ perspective: "1000px", width: "100%", overflow: "hidden", borderRadius: 16 }}>
      <div style={{
        width: "100%",
        maxWidth: 320,
        aspectRatio: "1.586 / 1",
        borderRadius: 16,
        boxShadow: "0 20px 60px rgba(0,0,0,0.3), 0 6px 20px rgba(0,0,0,0.2)",
        position: "relative",
        transform: cvvFocused ? "rotateY(180deg)" : "rotateY(0deg)",
        transformStyle: "preserve-3d",
        transition: "transform 0.5s ease",
      }}>
        {/* Front face */}
        <div style={{
          position: "absolute",
          inset: 0,
          transform: "rotateY(0deg)",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          background: gradient,
          borderRadius: 16,
          padding: "22px 24px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          overflow: "hidden",
          transition: "background 0.6s ease",
        }}>
          {/* Decorative circles */}
          <div style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
          }} />
          <div style={{
            position: "absolute",
            top: 20,
            right: 20,
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
          }} />

          {/* Top row: chip + brand */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
            {/* EMV chip */}
            <div style={{
              width: 38,
              height: 28,
              borderRadius: 5,
              background: "linear-gradient(135deg, #d4a843, #f0c060)",
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gridTemplateRows: "1fr 1fr 1fr",
              gap: 1,
              padding: 3,
              overflow: "hidden",
            }}>
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} style={{
                  background: i === 4 ? "transparent" : "rgba(0,0,0,0.15)",
                  borderRadius: 1,
                }} />
              ))}
            </div>
            {brand && (
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "1.5px",
                color: "rgba(255,255,255,0.9)",
                textShadow: "0 1px 3px rgba(0,0,0,0.4)",
              }}>
                {BRAND_LABELS[brand]}
              </span>
            )}
          </div>

          {/* Card number */}
          <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <div style={{
              fontFamily: "'Courier New', 'Lucida Console', monospace",
              fontSize: 15,
              fontWeight: 700,
              color: "rgba(255,255,255,0.95)",
              letterSpacing: "2px",
              textShadow: "0 1px 4px rgba(0,0,0,0.4)",
              position: "relative",
              whiteSpace: "nowrap",
            }}>
              {displayNumber}
            </div>
          </div>

          {/* Bottom row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", position: "relative" }}>
            <div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 2 }}>
                Cardholder
              </div>
              <div style={{
                fontFamily: "'Courier New', monospace",
                fontSize: 12,
                fontWeight: 700,
                color: "rgba(255,255,255,0.9)",
                letterSpacing: "1px",
                textTransform: "uppercase",
                maxWidth: 160,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {displayHolder}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 2 }}>
                Expires
              </div>
              <div style={{
                fontFamily: "'Courier New', monospace",
                fontSize: 13,
                fontWeight: 700,
                color: "rgba(255,255,255,0.9)",
                letterSpacing: "1px",
              }}>
                {displayExpiry}
              </div>
            </div>
          </div>
        </div>

        {/* Back face (CVV) */}
        <div style={{
          position: "absolute",
          inset: 0,
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          background: gradient,
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          transition: "background 0.6s ease",
        }}>
          <div style={{
            height: 44,
            background: "rgba(0,0,0,0.6)",
            margin: "0 0 20px",
          }} />
          <div style={{ padding: "0 24px" }}>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>
              CVV / CVC
            </div>
            <div style={{
              background: "rgba(255,255,255,0.15)",
              borderRadius: 4,
              padding: "8px 12px",
              textAlign: "right",
              fontFamily: "'Courier New', monospace",
              fontSize: 14,
              fontWeight: 700,
              color: "rgba(255,255,255,0.9)",
              letterSpacing: "4px",
            }}>
              {cvv ? cvv.replace(/./g, "•") : "•••"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Compact input ─────────────────────────────────────────────────────────────

function CompactInput({
  label,
  focused,
  error,
  children,
  hint,
}: {
  label: string;
  focused: boolean;
  error?: boolean;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.5px",
        color: error ? "#dc2626" : focused ? "#111" : "#6b7280",
        transition: "color 0.15s",
        fontFamily: "'Outfit', 'Helvetica Neue', sans-serif",
      }}>
        {label}
      </label>
      <div style={{
        border: `1.5px solid ${error ? "#fca5a5" : focused ? "#111" : "#e5e7eb"}`,
        borderRadius: 8,
        background: "#fff",
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: focused ? "0 0 0 3px rgba(17,17,17,0.08)" : "none",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
      }}>
        {children}
      </div>
      {hint && <div style={{ fontSize: 10, color: error ? "#dc2626" : "#9ca3af" }}>{hint}</div>}
    </div>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <span style={{
      display: "inline-block",
      width: 14,
      height: 14,
      border: "2px solid rgba(255,255,255,0.3)",
      borderTopColor: "#fff",
      borderRadius: "50%",
      animation: "pfs-spin 0.65s linear infinite",
      flexShrink: 0,
    }} />
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PaymentFormSplit({
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

  const inputCss: React.CSSProperties = {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    padding: "10px 12px",
    fontSize: 14,
    color: "#111",
    fontFamily: "'Outfit', 'Helvetica Neue', sans-serif",
    width: "100%",
  };

  return (
    <>
      <style>{`
        @keyframes pfs-spin { to { transform: rotate(360deg); } }
        @keyframes pfs-in { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

        @media (max-width: 640px) {
          .pfs-root {
            flex-direction: column !important;
            min-width: unset !important;
            border-radius: 16px !important;
          }
          .pfs-left {
            width: 100% !important;
            padding: 20px 16px !important;
            gap: 16px !important;
          }
          .pfs-left .pfs-card-wrap {
            max-width: 100% !important;
            justify-content: center;
          }
          .pfs-left .pfs-card-wrap > div > div {
            max-width: 280px !important;
          }
          .pfs-right {
            padding: 20px 16px !important;
          }
          .pfs-form-title {
            margin-bottom: 16px !important;
            font-size: 15px !important;
          }
          .pfs-form-row {
            flex-direction: column !important;
            gap: 14px !important;
          }
          .pfs-form-row > div {
            flex: 1 1 auto !important;
          }
        }
      `}</style>

      <div
        className="pfs-root"
        style={{
          fontFamily: "'Outfit', 'Helvetica Neue', sans-serif",
          display: "flex",
          flexDirection: "row",
          minWidth: 580,
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
          background: "#fff",
        }}
      >

        {/* ── Left column: card preview ── */}
        <div
          className="pfs-left"
          style={{
            width: 280,
            flexShrink: 0,
            background: "linear-gradient(160deg, #0f172a 0%, #1e293b 100%)",
            padding: "32px 24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          {/* Top */}
          <div>
            <p style={{
              margin: "0 0 4px",
              fontSize: 10,
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.35)",
              fontWeight: 600,
            }}>
              Payment Method
            </p>
            <h3 style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 600,
              color: "rgba(255,255,255,0.9)",
            }}>
              Credit / Debit Card
            </h3>
          </div>

          {/* Live card */}
          <div className="pfs-card-wrap" style={{ display: "flex", justifyContent: "flex-start" }}>
          <CardPreview
            cardNumber={form.cardNumber}
            cardHolder={form.cardHolder}
            expiry={form.expiry}
            cvv={form.cvv}
            brand={brand}
            cvvFocused={focused === "cvv"}
          />
          </div>

          {/* Bottom info */}
          <div>
            {binInfo && !binInfo.blocked && (binInfo.issuer || binInfo.brand) && (
              <div style={{
                background: "rgba(255,255,255,0.07)",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 11,
                color: "rgba(255,255,255,0.6)",
                animation: "pfs-in 0.25s ease",
              }}>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                  Issuer
                </span>
                <div style={{ display: "flex",flexDirection: "column", gap: 10 }}>
                  {(() => {
                    const logoUrl = getBankLogoUrl(binInfo.issuer, { useDefaultFallback: false });
                    return logoUrl ? (
                      <img
                        src={logoUrl}
                        alt=""
                        style={{ height: 24, maxWidth: 80, objectFit: "contain", flexShrink: 0 }}
                      />
                    ) : null;
                  })()}
                  <div>
                    {[binInfo.issuer, binInfo.brand, binInfo.type].filter(Boolean).join("  ·  ")}
                    {binInfo.isoCode2 && <span style={{ marginLeft: 6, opacity: 0.5 }}>{binInfo.isoCode2}</span>}
                  </div>
                </div>
              </div>
            )}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 10,
              color: "rgba(255,255,255,0.25)",
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              marginTop: 16,
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Secured by 256-bit SSL
            </div>
          </div>
        </div>

        {/* ── Right column: form ── */}
        <div className="pfs-right" style={{ flex: 1, padding: "32px 28px", display: "flex", flexDirection: "column" }}>
          <h3 className="pfs-form-title" style={{
            margin: "0 0 24px",
            fontSize: 16,
            fontWeight: 600,
            color: "#111",
            letterSpacing: "-0.2px",
          }}>
            Enter card details
          </h3>

          <form
            onSubmit={handleSubmit}
            noValidate
            style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}
          >
            {/* Card number */}
            <CompactInput
              label="Card number"
              focused={focused === "cardNumber"}
              error={!!binInfo?.blocked}
              hint={binInfo?.blocked ? "This card is blocked and cannot be used." : undefined}
            >
              <input
                style={{ ...inputCss }}
                value={form.cardNumber}
                onChange={(e) => setForm((f) => ({ ...f, cardNumber: formatCardNumber(e.target.value) }))}
                onFocus={() => setFocused("cardNumber")}
                onBlur={() => setFocused(null)}
                placeholder="1234  5678  9012  3456"
                inputMode="numeric"
                autoComplete="cc-number"
                required
              />
              {brand && (
                <span style={{
                  padding: "0 10px",
                  fontSize: 8,
                  fontWeight: 800,
                  letterSpacing: "0.8px",
                  color: "#fff",
                  background: brand === "visa" ? "#1a1f71" :
                              brand === "mastercard" ? "#eb001b" :
                              brand === "amex" ? "#007bc1" :
                              brand === "discover" ? "#f76f20" : "#e31937",
                  alignSelf: "stretch",
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 0,
                }}>
                  {brand.toUpperCase().slice(0, 4)}
                </span>
              )}
            </CompactInput>

            {/* Cardholder */}
            <CompactInput label="Cardholder name" focused={focused === "cardHolder"}>
              <input
                style={inputCss}
                value={form.cardHolder}
                onChange={(e) => setForm((f) => ({ ...f, cardHolder: e.target.value.toUpperCase() }))}
                onFocus={() => setFocused("cardHolder")}
                onBlur={() => setFocused(null)}
                placeholder="FULL NAME"
                autoComplete="cc-name"
                spellCheck={false}
              />
            </CompactInput>

            {/* Expiry + CVV */}
            <div className="pfs-form-row" style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <CompactInput label="Expiry date" focused={focused === "expiry"}>
                  <input
                    style={inputCss}
                    value={form.expiry}
                    onChange={handleExpiryChange}
                    onFocus={() => setFocused("expiry")}
                    onBlur={() => setFocused(null)}
                    placeholder="MM / YY"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    maxLength={5}
                    required
                  />
                </CompactInput>
              </div>
              <div style={{ flex: 0.85 }}>
                <CompactInput
                  label="CVV"
                  focused={focused === "cvv"}
                  hint={showCvvHint ? "Flip the card to see it →" : undefined}
                >
                  <input
                    style={{ ...inputCss, letterSpacing: "3px" }}
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
                      background: "none",
                      border: "none",
                      borderLeft: "1px solid #e5e7eb",
                      padding: "0 10px",
                      alignSelf: "stretch",
                      color: "#9ca3af",
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    ?
                  </button>
                </CompactInput>
              </div>
            </div>

            {/* Amount */}
            {showAmount && (
              <CompactInput label="Amount" focused={focused === "amount"}>
                <span style={{
                  padding: "0 0 0 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  color: focused === "amount" ? "#111" : "#9ca3af",
                  flexShrink: 0,
                  transition: "color 0.15s",
                  letterSpacing: "0.5px",
                }}>
                  {currency}
                </span>
                <input
                  style={{ ...inputCss, paddingLeft: 8, fontVariantNumeric: "tabular-nums" }}
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
              </CompactInput>
            )}

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Submit */}
            <button
              type="submit"
              disabled={busy || !!binInfo?.blocked}
              style={{
                marginTop: 8,
                padding: "14px 0",
                background: busy || binInfo?.blocked
                  ? "#f3f4f6"
                  : "linear-gradient(135deg, #111 0%, #374151 100%)",
                color: busy || binInfo?.blocked ? "#9ca3af" : "#fff",
                border: "none",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "0.5px",
                cursor: busy || binInfo?.blocked ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: busy || binInfo?.blocked ? "none" : "0 4px 14px rgba(0,0,0,0.2)",
                transition: "all 0.15s",
                fontFamily: "'Outfit', 'Helvetica Neue', sans-serif",
              }}
            >
              {busy ? (
                <>
                  <Spinner />
                  {isSubmitting ? "Submitting…" : "Processing…"}
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  {submitLabel}
                </>
              )}
            </button>

            {/* Result */}
            {result && !result.isLoading && (
              <div style={{
                padding: "11px 14px",
                borderRadius: 8,
                background: result.isSuccess ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${result.isSuccess ? "#bbf7d0" : "#fecaca"}`,
                color: result.isSuccess ? "#166534" : "#991b1b",
                fontSize: 13,
                fontWeight: 500,
                animation: "pfs-in 0.25s ease",
              }}>
                {result.isSuccess
                  ? "Payment successful!"
                  : result.message ?? result.error ?? "Payment failed. Please try again."}
              </div>
            )}
          </form>
        </div>
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
