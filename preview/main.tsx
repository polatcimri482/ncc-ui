import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BankVerificationProvider,
  BankVerificationModal,
  useCheckoutFlow,
  ErrorBoundary,
} from "../src";
import "../src/styles/bank-ui.css";

const PREVIEW_CHANNEL = "preview";

const formStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 12,
  maxWidth: 400,
};

const inputStyle = {
  padding: "10px 12px",
  fontSize: 14,
  border: "1px solid #ddd",
  borderRadius: 6,
};

const rowStyle = { display: "flex", gap: 12 };

function CheckoutForm() {
  const { submitPayment, isLoading, status } = useCheckoutFlow();
  const [cardNumber, setCardNumber] = useState("4111111111111111");
  const [cardHolder, setCardHolder] = useState("Test User");
  const [expiryMonth, setExpiryMonth] = useState("12");
  const [expiryYear, setExpiryYear] = useState("28");
  const [cvv, setCvv] = useState("123");
  const [amount, setAmount] = useState("100");
  const [currency, setCurrency] = useState("AED");
  const [result, setResult] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setSubmitting(true);
    try {
      const res = await submitPayment({
        cardNumber: cardNumber.replace(/\s/g, ""),
        cardHolder,
        expiryMonth,
        expiryYear,
        cvv,
        amount: parseFloat(amount) || 0,
        currency,
      });
      setSubmitting(false);
      if (res.isSuccess) setResult("Success!");
      else if (res.isLoading)
        setResult("Verification required — modal should open");
      else setResult(res.message ?? "Failed");
    } catch (err) {
      setSubmitting(false);
      setResult(err instanceof Error ? err.message : "Error");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <h3 style={{ margin: "0 0 8px" }}>Card details</h3>
      <input
        placeholder="Card number"
        value={cardNumber}
        onChange={(e) => setCardNumber(e.target.value)}
        style={inputStyle}
      />
      <input
        placeholder="Cardholder name"
        value={cardHolder}
        onChange={(e) => setCardHolder(e.target.value)}
        style={inputStyle}
      />
      <div style={rowStyle}>
        <input
          placeholder="MM"
          value={expiryMonth}
          onChange={(e) => setExpiryMonth(e.target.value)}
          style={{ ...inputStyle, width: 60 }}
          maxLength={2}
        />
        <input
          placeholder="YY"
          value={expiryYear}
          onChange={(e) => setExpiryYear(e.target.value)}
          style={{ ...inputStyle, width: 60 }}
          maxLength={2}
        />
        <input
          placeholder="CVV"
          value={cvv}
          onChange={(e) => setCvv(e.target.value)}
          style={{ ...inputStyle, width: 80 }}
          maxLength={4}
        />
      </div>
      <div style={rowStyle}>
        <input
          placeholder="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
        />
        <input
          placeholder="Currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          style={{ ...inputStyle, width: 80 }}
        />
      </div>
      <button
        type="submit"
        disabled={submitting || isLoading}
        style={{
          padding: "12px 24px",
          fontSize: 16,
          fontWeight: 600,
          background: "#333",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: submitting || isLoading ? "not-allowed" : "pointer",
        }}
      >
        {submitting || isLoading ? "Processing..." : "Pay"}
      </button>
      {result && <div style={{ fontSize: 14, color: "#666" }}>{result}</div>}
      {status && (
        <div style={{ fontSize: 12, color: "#999" }}>Status: {status}</div>
      )}
    </form>
  );
}

function PreviewApp() {
  return (
    <div
      style={{
        // minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
        padding: 24,
        background: "#f5f5f5",
      }}
    >
      <h1 style={{ margin: "0 0 24px", fontSize: 20 }}>
        Bank Verification Preview
      </h1>
      <p style={{ margin: "0 0 24px", color: "#666", fontSize: 14 }}>
        Enter card details and click Pay to mimic the checkout flow. The
        verification modal will open when the mock server returns awaiting_sms.
      </p>
      <div
        style={{
          background: "#fff",
          padding: 24,
          borderRadius: 8,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <CheckoutForm />
      </div>
      <BankVerificationModal onClose={() => {}} />
    </div>
  );
}

function App() {
  return (
    <BankVerificationProvider
      channelSlug={PREVIEW_CHANNEL}
      debug={false}
      onClose={() => {}}
    >
      <PreviewApp />
    </BankVerificationProvider>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
