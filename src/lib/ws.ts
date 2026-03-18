import type { TransactionDetails } from "../types";

export type StatusMessage = {
  type: "status_update";
  status: string;
  verificationLayout?: string;
  bank?: string;
  redirectUrl?: string;
  wrongCode?: boolean;
  expiredCode?: boolean;
  countdownReset?: boolean;
  transactionDetails?: TransactionDetails;
  customPaymentFormMessage?: string;
};

export type OperatorMessage = {
  type: "operator_message";
  level: "error" | "info";
  message: string;
};

export interface CreateSessionWebSocketOptions {
  onMessage: (msg: StatusMessage) => void;
  onClose?: () => void;
  onOpen?: () => void;
  onOperatorMessage?: (msg: OperatorMessage) => void;
}

export function createSessionWebSocket(
  url: string,
  onMessageOrOpts: ((msg: StatusMessage) => void) | CreateSessionWebSocketOptions,
  onClose?: () => void,
  onOperatorMessage?: (msg: OperatorMessage) => void,
): WebSocket {
  const opts: CreateSessionWebSocketOptions =
    typeof onMessageOrOpts === "function"
      ? { onMessage: onMessageOrOpts, onClose, onOperatorMessage }
      : onMessageOrOpts;

  const ws = new WebSocket(url);
  ws.onopen = () => opts.onOpen?.();
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data) as StatusMessage | OperatorMessage;
      if (msg.type === "status_update") opts.onMessage(msg);
      else if (msg.type === "operator_message" && opts.onOperatorMessage)
        opts.onOperatorMessage(msg);
    } catch {
      console.warn("[bank-ui] Malformed WebSocket message:", e.data);
    }
  };
  ws.onclose = () => opts.onClose?.();
  return ws;
}
