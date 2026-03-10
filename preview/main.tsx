import React, { useState, useCallback, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BankVerificationModal, useCheckoutFlow, useBinLookup } from "../src/index";
import type { SubmitResult, BinLookupInfo } from "../src/index";
import "../src/styles/bank-ui.css";

// ── Config ────────────────────────────────────────────────────────────────────

const DEFAULT_CHANNEL = "test";

// ── Root ──────────────────────────────────────────────────────────────────────

function App() {
  const [channelSlug, setChannelSlug] = useState(DEFAULT_CHANNEL);
  const [debug, setDebug] = useState(true);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Bank Verification — Test Harness</h1>
        <div style={styles.headerControls}>
          <label style={styles.label}>
            Channel slug
            <input
              style={styles.input}
              value={channelSlug}
              onChange={(e) => setChannelSlug(e.target.value)}
              placeholder="e.g. test"
            />
          </label>
          <label style={styles.checkLabel}>
            <input
              type="checkbox"
              checked={debug}
              onChange={(e) => setDebug(e.target.checked)}
            />
            Debug mode
          </label>
        </div>
      </header>

      <main style={styles.main}>
        <CheckoutCard channelSlug={channelSlug} debug={debug} />
      </main>
    </div>
  );
}

// ── Checkout card ─────────────────────────────────────────────────────────────

interface FormState {
  cardNumber: string;
  cardHolder: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  amount: string;
  currency: string;
}

const INITIAL_FORM: FormState = {
  cardNumber: "",
  cardHolder: "",
  expiryMonth: "",
  expiryYear: "",
  cvv: "",
  amount: "100",
  currency: "AED",
};

function CheckoutCard({
  channelSlug,
  debug,
}: {
  channelSlug: string;
  debug: boolean;
}) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { submitPayment, isLoading, status } = useCheckoutFlow(
    channelSlug,
    debug,
  );

  // BIN lookup: fires when card number reaches 6+ digits
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
    (field: keyof FormState) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [field]: e.target.value })),
    [],
  );

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
    }
  };

  const handleClose = () => {
    setModalOpen(false);
    setResult(null);
  };

  // Format card number with spaces every 4 digits
  const formatCard = (value: string) =>
    value
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>Payment Form</h2>

      {/* BIN info banner */}
      {binInfo && !binInfo.blocked && (
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

        {/* Amount + currency */}
        <div style={styles.row}>
          <div style={{ ...styles.field, flex: 2 }}>
            <label style={styles.fieldLabel}>Amount</label>
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
          <div style={{ ...styles.field, flex: 1 }}>
            <label style={styles.fieldLabel}>Currency</label>
            <select style={styles.input} value={form.currency} onChange={set("currency")}>
              <option>AED</option>
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
              <option>SAR</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          style={{
            ...styles.submitBtn,
            ...(isLoading ? styles.submitBtnDisabled : {}),
          }}
          disabled={isLoading}
        >
          {isLoading ? "Processing…" : "Pay now"}
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
          {result.isSuccess ? "✅ Payment successful!" : `❌ ${result.message ?? result.error ?? "Payment failed"}`}
        </div>
      )}

      {/* Status badge */}
      {status && (
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
  page: {
    minHeight: "100vh",
    background: "#f0f2f5",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    background: "#1a1a2e",
    color: "#fff",
    padding: "20px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    letterSpacing: "-0.3px",
  },
  headerControls: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#cbd5e1",
  },
  checkLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#cbd5e1",
    cursor: "pointer",
  },
  main: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "40px 16px",
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
    padding: "32px 36px",
    width: "100%",
    maxWidth: 480,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 20,
    color: "#1a1a2e",
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

// ── Mount ─────────────────────────────────────────────────────────────────────

createRoot(document.getElementById("root")!).render(<App />);
