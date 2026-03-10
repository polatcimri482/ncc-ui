import React, { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { PaymentForm } from "../src/index";
import { createSessionWebSocket } from "../src/lib/ws";
import type { StatusMessage, OperatorMessage } from "../src/lib/ws";
import "../src/styles/bank-ui.css";

// ── Config ────────────────────────────────────────────────────────────────────

const DEFAULT_CHANNEL = "test-2";

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
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Payment Form</h2>
          <PaymentForm defaultValues={{
            cardNumber: "4111 1111 1111 1111",
            cardHolder: "JOHN DOE",
            expiryMonth: "12",
            expiryYear: "26",
            cvv: "123",
          }} channelSlug={channelSlug} debug={debug} currency="AED" />
        </div>
      </main>
      <WsDebugPanel channelSlug={channelSlug} />
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
};

// ── Mount ─────────────────────────────────────────────────────────────────────

createRoot(document.getElementById("root")!).render(<App />);
