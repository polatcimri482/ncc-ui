import { useCallback, useEffect, useRef } from "react";
import { useStore } from "zustand";
import { getOrCreateStore } from "../store/bank-verification-store";
import type { BankVerificationStoreApi } from "../store/bank-verification-store";
import { debugLog } from "../lib/debug";
import { getWebSocketUrl } from "../lib/verification-api";
import { createSessionWebSocket } from "../lib/ws";

/**
 * Internal hook: gets/creates the store for a channelSlug, syncs config props,
 * and manages the WebSocket connection lifecycle.
 *
 * Used by BankVerificationModal (and any other self-contained entry-point components).
 */
export function useStoreSetup(
  channelSlug: string,
  debug: boolean,
  onClose: (() => void) | undefined,
): BankVerificationStoreApi {
  const storeRef = useRef<BankVerificationStoreApi | null>(null);
  if (!storeRef.current) {
    storeRef.current = getOrCreateStore(channelSlug, debug, onClose);
  }
  const store = storeRef.current;

  // Sync debug prop changes
  useEffect(() => {
    store.setState({ debug });
  }, [debug, store]);

  // Sync onClose — wrapped to cancel session on server then clear local state
  const effectiveOnClose = useCallback(() => {
    debugLog(debug, "onClose called");
    store.getState().cancelSessionAction().then(() => onClose?.());
  }, [debug, store, onClose]);

  useEffect(() => {
    store.setState({ onClose: effectiveOnClose });
  }, [effectiveOnClose, store]);

  const sessionId = useStore(store, (s) => s.sessionId);

  // WebSocket connection + polling fallback — requires cleanup so stays as an effect
  useEffect(() => {
    if (!sessionId) return;

    let pollingInterval: ReturnType<typeof setInterval> | null = null;
    const clearPolling = () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    };

    const { channelSlug, fetchStatus } = store.getState();
    const url = getWebSocketUrl(channelSlug, sessionId);
    debugLog(store.getState().debug, "WebSocket connecting", { url, channelSlug, sessionId });

    const ws = createSessionWebSocket(url, {
      onOpen: () =>
        debugLog(store.getState().debug, "WebSocket connected", { url, channelSlug, sessionId }),
      onMessage: (msg) => {
        const { debug } = store.getState();
        debugLog(debug, "WebSocket status_update", msg);
        if (msg.wrongCode) debugLog(debug, "wrongCode received", msg);
        if (msg.expiredCode) debugLog(debug, "expiredCode received", msg);
        if (msg.countdownReset) debugLog(debug, "countdownReset received");
        store.getState().applyStatusUpdate(msg);
      },
      onClose: () => {
        const { debug } = store.getState();
        debugLog(debug, "WebSocket closed, falling back to polling every 3s", {
          channelSlug,
          sessionId,
        });
        clearPolling();
        pollingInterval = setInterval(fetchStatus, 3000);
      },
      onOperatorMessage: (msg) => {
        const { debug } = store.getState();
        debugLog(debug, "WebSocket operator_message", msg);
        store.getState().applyOperatorMessage(msg);
      },
    });

    return () => {
      clearPolling();
      ws.close();
    };
  }, [sessionId, store]);

  return store;
}
