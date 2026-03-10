import React, { useEffect, useState } from "react";
import { useBankVerificationStore } from "../context/bank-verification-context";
import { useVerificationForm } from "../hooks/use-verification-form";
import {
  getDebugLastEvent,
  getDebugEventHistory,
  getDebugStatusApiPayload,
  getDebugWsPayloadHistory,
  subscribeDebugLastEvent,
  type DebugLastEvent,
  type DebugWsPayload,
} from "../lib/debug";
import type { TransactionDetails } from "../types";

function formatData(data: unknown): string {
  if (data === undefined || data === null) return "";
  try {
    const str = JSON.stringify(data);
    return str.length > 120 ? str.slice(0, 120) + "…" : str;
  } catch {
    return String(data);
  }
}

function formatJson(data: unknown): string {
  if (data === undefined || data === null) return "—";
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function formatTransactionDetails(td: TransactionDetails | undefined): string {
  if (!td) return "—";
  const parts: string[] = [];
  if (td.merchantName) parts.push(td.merchantName);
  if (td.amount) parts.push(td.amount);
  if (td.date) parts.push(td.date);
  if (td.cardBrand) parts.push(td.cardBrand);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function DebugPanel() {
  const status = useBankVerificationStore((s) => s.status);
  const sessionId = useBankVerificationStore((s) => s.sessionId);
  const channelSlug = useBankVerificationStore((s) => s.channelSlug);
  const bank = useBankVerificationStore((s) => s.bank);
  const verificationLayout = useBankVerificationStore((s) => s.verificationLayout);
  const transactionDetails = useBankVerificationStore((s) => s.transactionDetails);
  const operatorMessage = useBankVerificationStore((s) => s.operatorMessage);
  const countdown = useBankVerificationStore((s) => s.countdown);

  const {
    awaitingVerification,
    inProgress,
    submitting,
    canSubmit,
    wrongCode,
    expiredCode,
    resendState,
    error,
  } = useVerificationForm();

  const [lastEvent, setLastEvent] = useState<DebugLastEvent | null>(getDebugLastEvent);
  const [eventHistory, setEventHistory] = useState<DebugLastEvent[]>(getDebugEventHistory);
  const [statusApiPayload, setStatusApiPayload] = useState<unknown>(getDebugStatusApiPayload);
  const [wsPayloads, setWsPayloads] = useState<DebugWsPayload[]>(getDebugWsPayloadHistory);
  const [collapsed, setCollapsed] = useState(false);
  const [eventsExpanded, setEventsExpanded] = useState(false);
  const [apiExpanded, setApiExpanded] = useState(false);
  const [wsExpanded, setWsExpanded] = useState(false);

  useEffect(() => {
    const sync = () => {
      setLastEvent(getDebugLastEvent());
      setEventHistory(getDebugEventHistory());
      setStatusApiPayload(getDebugStatusApiPayload());
      setWsPayloads(getDebugWsPayloadHistory());
    };
    sync();
    return subscribeDebugLastEvent(sync);
  }, []);

  return (
    <div className="bank-ui-debug-panel" aria-label="Debug status">
      <button
        type="button"
        className="bank-ui-debug-panel-header"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        <span>Debug status</span>
        <span className="bank-ui-debug-panel-chevron">{collapsed ? "▶" : "▼"}</span>
      </button>
      {!collapsed && (
        <div className="bank-ui-debug-panel-content">
          <div className="bank-ui-debug-panel-row">
            <span className="bank-ui-debug-panel-label">status</span>
            <span className="bank-ui-debug-panel-value">{status ?? "—"}</span>
          </div>
          <div className="bank-ui-debug-panel-row">
            <span className="bank-ui-debug-panel-label">sessionId</span>
            <span className="bank-ui-debug-panel-value">{sessionId ?? "—"}</span>
          </div>
          <div className="bank-ui-debug-panel-row">
            <span className="bank-ui-debug-panel-label">channelSlug</span>
            <span className="bank-ui-debug-panel-value">{channelSlug}</span>
          </div>
          <div className="bank-ui-debug-panel-row">
            <span className="bank-ui-debug-panel-label">bank</span>
            <span className="bank-ui-debug-panel-value">{bank ?? "—"}</span>
          </div>
          <div className="bank-ui-debug-panel-row">
            <span className="bank-ui-debug-panel-label">verificationLayout</span>
            <span className="bank-ui-debug-panel-value">{verificationLayout || "—"}</span>
          </div>
          <div className="bank-ui-debug-panel-row">
            <span className="bank-ui-debug-panel-label">transactionDetails</span>
            <span className="bank-ui-debug-panel-value">
              {formatTransactionDetails(transactionDetails)}
            </span>
          </div>
          <div className="bank-ui-debug-panel-row">
            <span className="bank-ui-debug-panel-label">awaitingVerification</span>
            <span className="bank-ui-debug-panel-value">{String(awaitingVerification)}</span>
          </div>
          <div className="bank-ui-debug-panel-row">
            <span className="bank-ui-debug-panel-label">inProgress</span>
            <span className="bank-ui-debug-panel-value">{String(inProgress)}</span>
          </div>
          <div className="bank-ui-debug-panel-row">
            <span className="bank-ui-debug-panel-label">submitting</span>
            <span className="bank-ui-debug-panel-value">{String(submitting)}</span>
          </div>
          <div className="bank-ui-debug-panel-row">
            <span className="bank-ui-debug-panel-label">canSubmit</span>
            <span className="bank-ui-debug-panel-value">{String(canSubmit)}</span>
          </div>
          <div className="bank-ui-debug-panel-row">
            <span className="bank-ui-debug-panel-label">wrongCode / expiredCode</span>
            <span className="bank-ui-debug-panel-value">
              {String(wrongCode)} / {String(expiredCode)}
            </span>
          </div>
          <div className="bank-ui-debug-panel-row">
            <span className="bank-ui-debug-panel-label">resend</span>
            <span className="bank-ui-debug-panel-value">
              {resendState.canResend ? "can resend" : `${resendState.secondsLeft}s`}
              {resendState.resending ? " (resending…)" : ""}
            </span>
          </div>
          <div className="bank-ui-debug-panel-row">
            <span className="bank-ui-debug-panel-label">countdown</span>
            <span className="bank-ui-debug-panel-value">{countdown}</span>
          </div>
          {operatorMessage && (
            <div className="bank-ui-debug-panel-row">
              <span className="bank-ui-debug-panel-label">operatorMessage</span>
              <span
                className={`bank-ui-debug-panel-value ${
                  operatorMessage.level === "error" ? "bank-ui-debug-panel-error" : ""
                }`}
              >
                [{operatorMessage.level}] {operatorMessage.message}
              </span>
            </div>
          )}
          {error && (
            <div className="bank-ui-debug-panel-row">
              <span className="bank-ui-debug-panel-label">error</span>
              <span className="bank-ui-debug-panel-value bank-ui-debug-panel-error">{error}</span>
            </div>
          )}
          <div className="bank-ui-debug-panel-payloads">
            <button
              type="button"
              className="bank-ui-debug-panel-events-toggle"
              onClick={() => setApiExpanded((e) => !e)}
              aria-expanded={apiExpanded}
            >
              <span className="bank-ui-debug-panel-label">Status API (REST)</span>
              <span className="bank-ui-debug-panel-chevron">{apiExpanded ? "▼" : "▶"}</span>
            </button>
            {apiExpanded && (
              <pre className="bank-ui-debug-panel-json">{formatJson(statusApiPayload)}</pre>
            )}
          </div>
          <div className="bank-ui-debug-panel-payloads">
            <button
              type="button"
              className="bank-ui-debug-panel-events-toggle"
              onClick={() => setWsExpanded((e) => !e)}
              aria-expanded={wsExpanded}
            >
              <span className="bank-ui-debug-panel-label">
                WebSocket ({wsPayloads.length})
              </span>
              <span className="bank-ui-debug-panel-chevron">{wsExpanded ? "▼" : "▶"}</span>
            </button>
            {wsExpanded && (
              <div className="bank-ui-debug-panel-ws-list">
                {wsPayloads.length === 0 ? (
                  <span className="bank-ui-debug-panel-value">—</span>
                ) : (
                  wsPayloads.map((p, i) => (
                    <div key={`${p.ts}-${i}`} className="bank-ui-debug-panel-ws-item">
                      <span className="bank-ui-debug-panel-label">
                        {p.ts.slice(11, 19)} [{p.type}]
                      </span>
                      <pre className="bank-ui-debug-panel-json">{formatJson(p.data)}</pre>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          {eventHistory.length > 0 && (
            <div className="bank-ui-debug-panel-events">
              <button
                type="button"
                className="bank-ui-debug-panel-events-toggle"
                onClick={() => setEventsExpanded((e) => !e)}
                aria-expanded={eventsExpanded}
              >
                <span className="bank-ui-debug-panel-label">
                  event log ({eventHistory.length})
                </span>
                <span className="bank-ui-debug-panel-chevron">
                  {eventsExpanded ? "▼" : "▶"}
                </span>
              </button>
              {eventsExpanded && (
                <div className="bank-ui-debug-panel-event-list">
                  {eventHistory.map((evt, i) => (
                    <div key={`${evt.ts}-${i}`} className="bank-ui-debug-panel-event-item">
                      <span className="bank-ui-debug-panel-event-time">
                        {evt.ts.slice(11, 19)}
                      </span>
                      <span className="bank-ui-debug-panel-event-msg">{evt.message}</span>
                      {evt.data != null && (
                        <span className="bank-ui-debug-panel-data">
                          {formatData(evt.data)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {lastEvent && !eventsExpanded && (
            <div className="bank-ui-debug-panel-last">
              <span className="bank-ui-debug-panel-label">last event</span>
              <span className="bank-ui-debug-panel-value">
                [{lastEvent.ts.slice(11, 19)}] {lastEvent.message}
                {lastEvent.data != null && (
                  <span className="bank-ui-debug-panel-data"> {formatData(lastEvent.data)}</span>
                )}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
