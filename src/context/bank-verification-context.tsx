import React, { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { useStore } from "zustand";
import {
  createBankVerificationStore,
  type BankVerificationStore,
  type BankVerificationStoreApi,
} from "../store/bank-verification-store";
import { debugLog, setDebugWsPayload } from "../lib/debug";
import { DebugPanel } from "../components/debug-panel";
import { getWebSocketUrl } from "../lib/verification-api";
import { createSessionWebSocket } from "../lib/ws";
import type { BankVerificationProviderProps } from "../types";

const BankVerificationStoreContext = createContext<BankVerificationStoreApi | null>(null);

export function BankVerificationProvider({
  children,
  channelSlug,
  debug = false,
  onClose,
}: BankVerificationProviderProps & { children: React.ReactNode }) {
  const storeRef = useRef<BankVerificationStoreApi | null>(null);
  if (!storeRef.current) {
    storeRef.current = createBankVerificationStore(channelSlug, debug, onClose);
  }
  const store = storeRef.current;

  // Sync debug prop changes to store
  useEffect(() => {
    store.setState({ debug });
  }, [debug, store]);

  // Sync onClose prop — wrapped to also clear session
  const effectiveOnClose = useCallback(() => {
    debugLog(debug, "onClose called");
    store.getState().clearSession();
    onClose?.();
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
        setDebugWsPayload(debug, "status_update", msg);
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
        setDebugWsPayload(debug, "operator_message", msg);
        debugLog(debug, "WebSocket operator_message", msg);
        store.getState().applyOperatorMessage(msg);
      },
    });

    return () => {
      clearPolling();
      ws.close();
    };
  }, [sessionId, store]);

  return (
    <BankVerificationStoreContext.Provider value={store}>
      {children}
      {debug && <DebugPanel />}
    </BankVerificationStoreContext.Provider>
  );
}

export function useBankVerificationStoreApi(): BankVerificationStoreApi {
  const store = useContext(BankVerificationStoreContext);
  if (!store) {
    throw new Error(
      "useBankVerificationStoreApi must be used within a BankVerificationProvider",
    );
  }
  return store;
}

export function useBankVerificationStore<T>(
  selector: (state: BankVerificationStore) => T,
): T {
  const store = useBankVerificationStoreApi();
  return useStore(store, selector);
}
