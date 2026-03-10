import React, { useState, useCallback, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { BankVerificationModal, useCheckoutFlow, useBinLookup } from "../src/index";
import type { SubmitResult, BinLookupInfo } from "../src/index";
import { createSessionWebSocket } from "../src/lib/ws";
import type { StatusMessage, OperatorMessage } from "../src/lib/ws";
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
      <WsDebugPanel channelSlug={channelSlug} />
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
  cardNumber: "4111 1111 1111 1111",
  cardHolder: "JOHN DOE",
  expiryMonth: "12",
  expiryYear: "26",
  cvv: "123",
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

// ── WS Debug Panel ────────────────────────────────────────────────────────────

type WsConnStatus = "idle" | "connecting" | "open" | "closed" | "error";

type WsLogEntry = {
  id: number;
  ts: string;
  kind: "info" | "in" | "error" | "open" | "close";
  text: string;
};

let _logId = 0;
function makeEntry(kind: WsLogEntry["kind"], text: string): WsLogEntry {
  return { id: _logId++, ts: new Date().toISOString(), kind, text };
}

const WS_BLUE = {
  bg: "#071428",
  border: "#1d4ed8",
  headerBg: "#0f2a5c",
  headerHover: "#1d4ed8",
  text: "#bfdbfe",
  label: "#93c5fd",
  shadow: "0 4px 12px rgba(29,78,216,0.45)",
  divider: "rgba(29,78,216,0.4)",
  jsonBg: "rgba(0,0,0,0.35)",
};

const WS_KIND_COLORS: Record<WsLogEntry["kind"], string> = {
  info: "#64748b",
  open: "#4ade80",
  close: "#94a3b8",
  in: "#93c5fd",
  error: "#f87171",
};

const WS_CONN_COLORS: Record<WsConnStatus, string> = {
  idle: "#475569",
  connecting: "#fbbf24",
  open: "#4ade80",
  closed: "#64748b",
  error: "#f87171",
};

function WsDebugPanel({ channelSlug }: { channelSlug: string }) {
  const [sessionId, setSessionId] = useState("");
  const [connStatus, setConnStatus] = useState<WsConnStatus>("idle");
  const [log, setLog] = useState<WsLogEntry[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [logExpanded, setLogExpanded] = useState(true);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const logListRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; elLeft: number; elTop: number } | null>(null);
  const didDragRef = useRef(false);

  const push = (kind: WsLogEntry["kind"], text: string) =>
    setLog((prev) => [...prev.slice(-199), makeEntry(kind, text)]);

  const connect = () => {
    if (wsRef.current) wsRef.current.close();
    if (!sessionId.trim()) { push("error", "Session ID is required"); return; }
    setConnStatus("connecting");
    push("info", `Connecting… channel="${channelSlug}" session="${sessionId}"`);
    wsRef.current = createSessionWebSocket(
      `ws://${window.location.host}/ncc/v1/channels/${channelSlug}/checkout/sessions/${sessionId}/ws`,
      {
        onOpen: () => { setConnStatus("open"); push("open", "Connected"); },
        onClose: () => { setConnStatus("closed"); push("close", "Connection closed"); },
        onMessage: (msg: StatusMessage) => push("in", JSON.stringify(msg, null, 2)),
        onOperatorMessage: (msg: OperatorMessage) =>
          push("in", `[operator:${msg.level}] ${msg.message}`),
      },
    );
  };

  const disconnect = () => { wsRef.current?.close(); wsRef.current = null; };

  // auto-scroll log
  useEffect(() => {
    if (logListRef.current && logExpanded)
      logListRef.current.scrollTop = logListRef.current.scrollHeight;
  }, [log, logExpanded]);

  useEffect(() => () => { wsRef.current?.close(); }, []);

  // drag
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragStartRef.current || !panelRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) { didDragRef.current = true; setIsDragging(true); }
      const rect = panelRef.current.getBoundingClientRect();
      setPosition({
        x: Math.max(0, Math.min(dragStartRef.current.elLeft + dx, window.innerWidth - rect.width)),
        y: Math.max(0, Math.min(dragStartRef.current.elTop + dy, window.innerHeight - rect.height)),
      });
    };
    const onUp = () => { dragStartRef.current = null; setIsDragging(false); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, []);

  const onHeaderMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    didDragRef.current = false;
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pos = position ?? { x: rect.left, y: rect.top };
    dragStartRef.current = { x: e.clientX, y: e.clientY, elLeft: pos.x, elTop: pos.y };
  };

  const onHeaderClick = () => {
    if (didDragRef.current) { didDragRef.current = false; return; }
    setCollapsed((c) => !c);
  };

  const panelPos: React.CSSProperties = position
    ? { left: position.x, top: position.y, right: "auto", bottom: "auto" }
    : {};

  const dot: React.CSSProperties = {
    display: "inline-block", width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
    background: WS_CONN_COLORS[connStatus],
  };

  const inputStyle: React.CSSProperties = {
    background: "rgba(0,0,0,0.3)", border: `1px solid ${WS_BLUE.border}`,
    borderRadius: 4, color: WS_BLUE.text, fontFamily: "inherit", fontSize: 11,
    padding: "4px 7px", outline: "none", width: "100%",
  };

  const btnStyle = (active: boolean, activeColor: string): React.CSSProperties => ({
    border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 11, fontWeight: 600,
    cursor: active ? "pointer" : "not-allowed", fontFamily: "inherit",
    background: active ? activeColor : "rgba(255,255,255,0.06)",
    color: active ? "#fff" : "#475569",
  });

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed", bottom: 16, left: 16, zIndex: 2147483647,
        width: 360, background: WS_BLUE.bg, color: WS_BLUE.text,
        fontFamily: "ui-monospace, monospace", fontSize: 12,
        borderRadius: 8, boxShadow: WS_BLUE.shadow,
        border: `1px solid ${WS_BLUE.border}`, overflow: "hidden",
        ...panelPos,
      }}
    >
      {/* Header */}
      <button
        type="button"
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 12px", background: WS_BLUE.headerBg, border: "none",
          color: WS_BLUE.text, cursor: isDragging ? "grabbing" : "grab",
          fontSize: 12, fontWeight: 500, fontFamily: "inherit",
        }}
        onMouseDown={onHeaderMouseDown}
        onClick={onHeaderClick}
        aria-expanded={!collapsed}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={dot} />
          WS Debugger
          <span style={{ color: WS_CONN_COLORS[connStatus], fontSize: 11 }}>
            {connStatus}
          </span>
        </span>
        <span style={{ opacity: 0.7, fontSize: 10 }}>{collapsed ? "▶" : "▼"}</span>
      </button>

      {!collapsed && (
        <div style={{ padding: 12, maxHeight: 480, overflowY: "auto" }}>

          {/* Session ID + buttons */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: WS_BLUE.label, fontSize: 11, marginBottom: 4 }}>session id</div>
            <input
              style={inputStyle}
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="paste session id…"
              onKeyDown={(e) => e.key === "Enter" && connect()}
            />
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <button style={btnStyle(connStatus !== "open", WS_BLUE.border)} onClick={connect} disabled={connStatus === "open"}>
              Connect
            </button>
            <button style={btnStyle(connStatus === "open", "#dc2626")} onClick={disconnect} disabled={connStatus !== "open"}>
              Disconnect
            </button>
            <button style={btnStyle(true, "#1e3a5f")} onClick={() => setLog([])}>
              Clear
            </button>
          </div>

          {/* URL row */}
          {connStatus === "open" && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ color: WS_BLUE.label, fontSize: 11 }}>url</div>
              <div style={{ wordBreak: "break-all", fontSize: 11 }}>
                ws://{window.location.host}/ncc/v1/channels/{channelSlug}/checkout/sessions/{sessionId}/ws
              </div>
            </div>
          )}

          {/* Log section */}
          <div style={{ borderTop: `1px solid ${WS_BLUE.border}`, paddingTop: 8 }}>
            <button
              type="button"
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "4px 0", background: "none", border: "none",
                color: WS_BLUE.text, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              }}
              onClick={() => setLogExpanded((v) => !v)}
            >
              <span style={{ color: WS_BLUE.label, fontSize: 11 }}>messages ({log.length})</span>
              <span style={{ opacity: 0.7, fontSize: 10 }}>{logExpanded ? "▼" : "▶"}</span>
            </button>
            {logExpanded && (
              <div
                ref={logListRef}
                style={{
                  marginTop: 6, maxHeight: 260, overflowY: "auto",
                  background: WS_BLUE.jsonBg, borderRadius: 4, padding: "8px 10px",
                  display: "flex", flexDirection: "column", gap: 8,
                }}
              >
                {log.length === 0 ? (
                  <span style={{ color: "#475569", fontSize: 11 }}>no messages yet…</span>
                ) : (
                  log.map((entry) => (
                    <div key={entry.id} style={{ borderBottom: `1px solid ${WS_BLUE.divider}`, paddingBottom: 6 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                        <span style={{ color: WS_BLUE.label, fontSize: 10 }}>{entry.ts.slice(11, 19)}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: "0.4px",
                          textTransform: "uppercase", color: WS_KIND_COLORS[entry.kind],
                        }}>
                          {entry.kind}
                        </span>
                      </div>
                      <pre style={{
                        margin: 0, fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-all",
                        color: WS_KIND_COLORS[entry.kind],
                      }}>
                        {entry.text}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
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
