import { useCallback, useSyncExternalStore } from "react";
import { isTerminal } from "./checkout-status";

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

export function subscribeToSession(
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

export function loadSession(channelSlug: string): StoredSession | null {
  try {
    const raw = localStorage.getItem(storageKey(channelSlug));
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function saveSession(channelSlug: string, session: StoredSession): void {
  try {
    localStorage.setItem(storageKey(channelSlug), JSON.stringify(session));
    notifyListeners(channelSlug);
  } catch {
    // ignore quota / SSR errors
  }
}

export function clearSession(channelSlug: string): void {
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
