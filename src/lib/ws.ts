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
};

export type OperatorMessage = {
  type: "operator_message";
  level: "error" | "info";
  message: string;
};

export function createSessionWebSocket(
  url: string,
  onMessage: (msg: StatusMessage) => void,
  onClose?: () => void,
  onOperatorMessage?: (msg: OperatorMessage) => void
): WebSocket {
  const ws = new WebSocket(url);
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data) as StatusMessage | OperatorMessage;
      if (msg.type === "status_update") onMessage(msg);
      else if (msg.type === "operator_message" && onOperatorMessage) onOperatorMessage(msg);
    } catch {
      console.warn("[bank-ui] Malformed WebSocket message:", e.data);
    }
  };
  ws.onclose = () => onClose?.();
  return ws;
}
