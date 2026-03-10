import { useCallback, useSyncExternalStore } from "react";
import { isTerminal } from "../lib/checkout-status";

const storageKey = (channelSlug: string) => `ncc_checkout_${channelSlug}`;

export interface StoredSession {
  sessionId: string;
  status: string;
  submitted: boolean;
}

const listeners = new Map<string, Set<() => void>>();

function notifyListeners(channelSlug: string): void {
  listeners.get(channelSlug)?.forEach((cb) => cb());
}

function subscribeToSession(
  channelSlug: string,
  callback: () => void,
): () => void {
  const set = listeners.get(channelSlug) ?? new Set();
  set.add(callback);
  listeners.set(channelSlug, set);
  return () => {
    const s = listeners.get(channelSlug);
    s?.delete(callback);
    if (s?.size === 0) listeners.delete(channelSlug);
  };
}

/** Cache getSnapshot result by channel+raw so useSyncExternalStore gets stable references. */
const snapshotCache = new Map<string, { raw: string; parsed: StoredSession }>();

function loadSession(channelSlug: string): StoredSession | null {
  try {
    const raw = localStorage.getItem(storageKey(channelSlug));
    if (!raw) {
      snapshotCache.delete(channelSlug);
      return null;
    }
    const cached = snapshotCache.get(channelSlug);
    if (cached && cached.raw === raw) return cached.parsed;
    const parsed = JSON.parse(raw) as StoredSession;
    snapshotCache.set(channelSlug, { raw, parsed });
    return parsed;
  } catch {
    snapshotCache.delete(channelSlug);
    return null;
  }
}

function saveSession(channelSlug: string, session: StoredSession): void {
  try {
    localStorage.setItem(storageKey(channelSlug), JSON.stringify(session));
    notifyListeners(channelSlug);
  } catch {
    // ignore quota / SSR errors
  }
}

function clearSession(channelSlug: string): void {
  try {
    localStorage.removeItem(storageKey(channelSlug));
    notifyListeners(channelSlug);
  } catch {
    // ignore
  }
}

/**
 * Returns the active sessionId when polling should be enabled (submitted and not terminal),
 * plus channel-bound setter and clearer. Re-renders when storage is updated for this channelSlug.
 */
export function useSessionFromStorage(channelSlug: string): {
  sessionId: string | null;
  setSession: (session: StoredSession) => void;
  clearSession: () => void;
} {
  const stored = useSyncExternalStore(
    (onStoreChange) => subscribeToSession(channelSlug, onStoreChange),
    () => loadSession(channelSlug),
    () => null,
  );
  const sessionId =
    stored?.submitted && stored?.sessionId && !isTerminal(stored.status)
      ? stored.sessionId
      : null;

  const setSession = useCallback(
    (session: StoredSession) => saveSession(channelSlug, session),
    [channelSlug],
  );
  const clearSessionBound = useCallback(
    () => clearSession(channelSlug),
    [channelSlug],
  );

  return { sessionId, setSession, clearSession: clearSessionBound };
}
