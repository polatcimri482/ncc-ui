export interface DebugLastEvent {
  ts: string;
  message: string;
  data?: unknown;
}

const EVENT_HISTORY_SIZE = 12;

let lastEvent: DebugLastEvent | null = null;
let eventHistory: DebugLastEvent[] = [];
let lastStatusApiPayload: unknown = null;
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
