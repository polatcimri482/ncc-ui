export interface DebugLastEvent {
  ts: string;
  message: string;
  data?: unknown;
}

export interface DebugWsPayload {
  ts: string;
  type: "status_update" | "operator_message";
  data: unknown;
}

const EVENT_HISTORY_SIZE = 12;
const WS_PAYLOAD_HISTORY_SIZE = 16;

let lastEvent: DebugLastEvent | null = null;
let eventHistory: DebugLastEvent[] = [];
let lastStatusApiPayload: unknown = null;
let wsPayloadHistory: DebugWsPayload[] = [];
let subscribers: Array<() => void> = [];

function notify() {
  subscribers.forEach((fn) => fn());
}

/** Updates the single "last event" shown in the debug panel. Used by debugLog when enabled. */
export function setDebugLastEvent(message: string, data?: unknown): void {
  const evt: DebugLastEvent = {
    ts: new Date().toISOString(),
    message,
    data,
  };
  lastEvent = evt;
  eventHistory = [evt, ...eventHistory].slice(0, EVENT_HISTORY_SIZE);
  notify();
}

/** Records raw response from status REST API. Call when debug is enabled. */
export function setDebugStatusApiPayload(enabled: boolean, data: unknown): void {
  if (!enabled) return;
  lastStatusApiPayload = data;
  notify();
}

/** Records raw WebSocket message (status_update or operator_message). Call when debug is enabled. */
export function setDebugWsPayload(
  enabled: boolean,
  type: "status_update" | "operator_message",
  data: unknown
): void {
  if (!enabled) return;
  const entry: DebugWsPayload = {
    ts: new Date().toISOString(),
    type,
    data,
  };
  wsPayloadHistory = [entry, ...wsPayloadHistory].slice(0, WS_PAYLOAD_HISTORY_SIZE);
  notify();
}

/** Returns the current last event for the debug panel. */
export function getDebugLastEvent(): DebugLastEvent | null {
  return lastEvent;
}

/** Returns recent event history (newest first). */
export function getDebugEventHistory(): DebugLastEvent[] {
  return eventHistory;
}

/** Returns last raw status API response. */
export function getDebugStatusApiPayload(): unknown {
  return lastStatusApiPayload;
}

/** Returns recent WebSocket payloads (newest first). */
export function getDebugWsPayloadHistory(): DebugWsPayload[] {
  return wsPayloadHistory;
}

/** Subscribe to last-event updates. Returns unsubscribe. */
export function subscribeDebugLastEvent(callback: () => void): () => void {
  subscribers.push(callback);
  return () => {
    subscribers = subscribers.filter((fn) => fn !== callback);
  };
}

/**
 * Debug logger for bank verification UI. Only logs when debug is enabled.
 * Updates the debug panel "last event" instead of console.log.
 * No-op in production when debug=false.
 */
export function debugLog(
  enabled: boolean,
  message: string,
  data?: Record<string, unknown> | unknown
): void {
  if (!enabled) return;
  setDebugLastEvent(message, data);
}
