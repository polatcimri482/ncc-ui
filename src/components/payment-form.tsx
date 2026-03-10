import React, { useState, useCallback, useEffect } from "react";
import { useCheckoutFlow } from "../hooks/use-checkout-flow";
import { useBinLookup } from "../hooks/use-bin-lookup";
import { BankVerificationModal } from "./bank-verification-modal";
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

interface InternalFormState extends PaymentFormValues {
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
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const EMPTY_FORM: InternalFormState = {
  cardNumber: "",
  cardHolder: "",
  expiryMonth: "",
  expiryYear: "",
  cvv: "",
  amount: "",
  currency: "AED",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function PaymentForm({
  channelSlug,
  debug,
  currency = "AED",
  defaultValues,
  onSuccess,
  onError,
  submitLabel = "Pay now",
}: PaymentFormProps) {
  const [form, setForm] = useState<InternalFormState>({
    ...EMPTY_FORM,
    currency,
    ...defaultValues,
  });
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { submitPayment, isSubmitting, isLoading, status } = useCheckoutFlow(
    channelSlug,
    debug,
  );

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

  const set = useCallback(
    (field: keyof InternalFormState) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [field]: e.target.value })),
    [],
  );

  const formatCard = (value: string) =>
    value
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    const raw = form.cardNumber.replace(/\s/g, "");
    const res = await submitPayment({
      cardNumber: raw,
      cardHolder: form.cardHolder || undefined,
      expiryMonth: form.expiryMonth,
      expiryYear: form.expiryYear,
      cvv: form.cvv,
      amount: parseFloat(form.amount) || 0,
      currency: form.currency,
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

  return (
    <div style={styles.wrapper}>
      {/* BIN info banner — debug only */}
      {debug && binInfo && !binInfo.blocked && (
        <div style={styles.binBanner}>
          <span style={styles.binTag}>
            {[binInfo.brand, binInfo.type, binInfo.issuer]
              .filter(Boolean)
              .join(" · ")}
          </span>
          {binInfo.isoCode2 && (
            <span style={styles.binCountry}>🌍 {binInfo.isoCode2}</span>
          )}
        </div>
      )}
      {binInfo?.blocked && (
        <div style={{ ...styles.binBanner, background: "#fee2e2", color: "#b91c1c" }}>
          ⛔ This BIN is blocked
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Card number */}
        <div style={styles.field}>
          <label style={styles.fieldLabel}>Card number</label>
          <input
            style={styles.input}
            value={form.cardNumber}
            onChange={(e) =>
              setForm((f) => ({ ...f, cardNumber: formatCard(e.target.value) }))
            }
            placeholder="1234 5678 9012 3456"
            inputMode="numeric"
            required
          />
        </div>

        {/* Card holder */}
        <div style={styles.field}>
          <label style={styles.fieldLabel}>Card holder (optional)</label>
          <input
            style={styles.input}
            value={form.cardHolder}
            onChange={set("cardHolder")}
            placeholder="JOHN DOE"
          />
        </div>

        {/* Expiry + CVV */}
        <div style={styles.row}>
          <div style={{ ...styles.field, flex: 1 }}>
            <label style={styles.fieldLabel}>Expiry month</label>
            <input
              style={styles.input}
              value={form.expiryMonth}
              onChange={set("expiryMonth")}
              placeholder="MM"
              maxLength={2}
              inputMode="numeric"
              required
            />
          </div>
          <div style={{ ...styles.field, flex: 1 }}>
            <label style={styles.fieldLabel}>Expiry year</label>
            <input
              style={styles.input}
              value={form.expiryYear}
              onChange={set("expiryYear")}
              placeholder="YY"
              maxLength={2}
              inputMode="numeric"
              required
            />
          </div>
          <div style={{ ...styles.field, flex: 1 }}>
            <label style={styles.fieldLabel}>CVV</label>
            <input
              style={styles.input}
              value={form.cvv}
              onChange={set("cvv")}
              placeholder="123"
              maxLength={4}
              inputMode="numeric"
              required
            />
          </div>
        </div>

        {/* Amount */}
        <div style={styles.field}>
          <label style={styles.fieldLabel}>Amount ({currency})</label>
          <input
            style={styles.input}
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={set("amount")}
            required
          />
        </div>

        <button
          type="submit"
          style={{
            ...styles.submitBtn,
            ...((isSubmitting || isLoading) ? styles.submitBtnDisabled : {}),
          }}
          disabled={isSubmitting || isLoading}
        >
          {isSubmitting ? "Submitting…" : isLoading ? "Processing…" : submitLabel}
        </button>
      </form>

      {/* Result banner */}
      {result && !result.isLoading && (
        <div
          style={{
            ...styles.resultBanner,
            background: result.isSuccess ? "#dcfce7" : "#fee2e2",
            color: result.isSuccess ? "#166534" : "#b91c1c",
          }}
        >
          {result.isSuccess
            ? "Payment successful!"
            : result.message ?? result.error ?? "Payment failed"}
        </div>
      )}

      {/* Status badge — debug only */}
      {debug && status && (
        <div style={styles.statusRow}>
          <span style={styles.statusLabel}>Session status:</span>
          <code style={styles.statusValue}>{status}</code>
        </div>
      )}

      {/* Bank verification modal */}
      {modalOpen && (
        <BankVerificationModal
          channelSlug={channelSlug}
          debug={debug}
          onClose={handleClose}
        />
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
  },
  binBanner: {
    background: "#eff6ff",
    color: "#1e40af",
    borderRadius: 8,
    padding: "8px 14px",
    marginBottom: 16,
    fontSize: 13,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  binTag: { fontWeight: 500 },
  binCountry: { opacity: 0.7 },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  input: {
    border: "1.5px solid #e2e8f0",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 15,
    outline: "none",
    transition: "border-color 0.15s",
    background: "#fff",
    width: "100%",
  },
  row: {
    display: "flex",
    gap: 12,
    alignItems: "flex-end",
  },
  submitBtn: {
    marginTop: 8,
    background: "#1a1a2e",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "13px 0",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "opacity 0.15s",
  },
  submitBtnDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
  resultBanner: {
    marginTop: 20,
    borderRadius: 8,
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 500,
  },
  statusRow: {
    marginTop: 12,
    display: "flex",
    gap: 8,
    alignItems: "center",
    fontSize: 13,
  },
  statusLabel: { color: "#94a3b8" },
  statusValue: {
    background: "#f1f5f9",
    borderRadius: 4,
    padding: "2px 6px",
    fontFamily: "monospace",
    fontSize: 12,
    color: "#475569",
  },
};
