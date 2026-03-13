import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { PaymentForm } from "../src/index";
import { PaymentFormMinimal } from "../src/components/payment-form-minimal";
import { PaymentFormSoft } from "../src/components/payment-form-soft";
import { PaymentFormSplit } from "../src/components/payment-form-split";
import "../src/styles/bank-ui.css";

// ── Config ────────────────────────────────────────────────────────────────────

const DEFAULT_CHANNEL = "test";

const DEFAULT_VALUES = {
  cardNumber: "5331910100857589",
  cardHolder: "JOHN DOE",
  expiryMonth: "12",
  expiryYear: "26",
  cvv: "123",
};

// ── Tabs ──────────────────────────────────────────────────────────────────────

type TabId = "default" | "minimal" | "dark" | "split";

const TABS: { id: TabId; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "minimal", label: "Minimal" },
  { id: "dark",    label: "Soft" },
  { id: "split",   label: "Split" },
];

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [channelSlug, setChannelSlug] = useState(DEFAULT_CHANNEL);
  const [debug, setDebug] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("default");

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

      {/* Tab bar */}
      <nav style={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.tabBtn,
              ...(activeTab === tab.id ? styles.tabBtnActive : {}),
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main style={{
        ...styles.main,
        background: "#f0f2f5",
      }}>
        {activeTab === "default" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Default</h2>
            <PaymentForm
              defaultValues={DEFAULT_VALUES}
              channelSlug={channelSlug}
              debug={debug}
              currency="AED"
            />
          </div>
        )}

        {activeTab === "minimal" && (
          <div style={{ ...styles.card, maxWidth: 460 }}>
            <PaymentFormMinimal
              defaultValues={DEFAULT_VALUES}
              channelSlug={channelSlug}
              debug={debug}
              currency="AED"
            />
          </div>
        )}

        {activeTab === "dark" && (
          <div style={{ width: "100%", maxWidth: 460 }}>
            <PaymentFormSoft
              defaultValues={DEFAULT_VALUES}
              channelSlug={channelSlug}
              debug={debug}
              currency="AED"
            />
          </div>
        )}

        {activeTab === "split" && (
          <div style={{ width: "100%", maxWidth: 760 }}>
            <PaymentFormSplit
              defaultValues={DEFAULT_VALUES}
              channelSlug={channelSlug}
              debug={debug}
              currency="AED"
            />
          </div>
        )}
      </main>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
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
    margin: 0,
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
  input: {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 6,
    color: "#fff",
    padding: "5px 10px",
    fontSize: 13,
    outline: "none",
    width: 120,
  },
  tabBar: {
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    padding: "0 32px",
    gap: 0,
  },
  tabBtn: {
    background: "none",
    border: "none",
    borderBottom: "2.5px solid transparent",
    padding: "14px 20px",
    fontSize: 13,
    fontWeight: 500,
    color: "#6b7280",
    cursor: "pointer",
    transition: "color 0.15s, border-color 0.15s",
    fontFamily: "inherit",
  },
  tabBtnActive: {
    color: "#111",
    borderBottomColor: "#111",
    fontWeight: 600,
  },
  main: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "48px 16px",
    transition: "background 0.3s",
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
    marginTop: 0,
    marginBottom: 20,
    color: "#1a1a2e",
  },
};

// ── Mount ─────────────────────────────────────────────────────────────────────

createRoot(document.getElementById("root")!).render(<App />);
