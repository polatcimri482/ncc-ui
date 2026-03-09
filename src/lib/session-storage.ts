const storageKey = (channelSlug: string) => `ncc_checkout_${channelSlug}`;

export interface StoredSession {
  sessionId: string;
  status: string;
  submitted: boolean;
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

export function saveSession(
  channelSlug: string,
  session: StoredSession,
): void {
  try {
    localStorage.setItem(storageKey(channelSlug), JSON.stringify(session));
  } catch {
    // ignore quota / SSR errors
  }
}

export function clearSession(channelSlug: string): void {
  try {
    localStorage.removeItem(storageKey(channelSlug));
  } catch {
    // ignore
  }
}
