import React, { Suspense, useState } from "react";
import { createRoot } from "react-dom/client";
import { BankLayout, BANK_LAYOUT_MAP } from "../src/layouts/banks";
import "../src/styles/bank-ui.css";

// Derive slugs from actual bank layouts (stays in sync with BANK_LAYOUT_MAP)
const BANK_SLUGS = Object.keys(BANK_LAYOUT_MAP) as readonly string[];

function LayoutFallback() {
  return (
    <div style={{ padding: 24, textAlign: "center", color: "#666" }}>
      Loading...
    </div>
  );
}

function App() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <aside
        style={{
          width: 220,
          borderRight: "1px solid #e0e0e0",
          padding: 16,
          background: "#fafafa",
        }}
      >
        <h2 style={{ margin: "0 0 16px", fontSize: 14, color: "#666" }}>
          Bank Layouts
        </h2>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {BANK_SLUGS.map((slug) => (
            <button
              key={slug}
              onClick={() => setSelected(slug)}
              style={{
                padding: "8px 12px",
                textAlign: "left",
                border: "none",
                borderRadius: 6,
                background: selected === slug ? "#e0e0e0" : "transparent",
                cursor: "pointer",
                fontWeight: selected === slug ? 600 : 400,
              }}
            >
              {slug}
            </button>
          ))}
        </nav>
      </aside>
      <main
        style={{
          flex: 1,
          padding: 24,
          overflow: "auto",
          background: "#fff",
        }}
      >
        {selected ? (
          <div
            style={{
              border: "1px solid #e0e0e0",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "8px 16px",
                background: "#f5f5f5",
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              {selected}
            </div>
            <Suspense fallback={<LayoutFallback />}>
              <BankLayout bank={selected} fallback={<LayoutFallback />} />
            </Suspense>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#999",
              fontSize: 14,
            }}
          >
            Select a bank layout from the sidebar
          </div>
        )}
      </main>
    </div>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
