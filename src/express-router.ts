/**
 * Express router for bank verification API.
 * Use from backend: import { createBankVerificationRouter, createProxyHandlers } from "@ncc/bank-verification-ui/express"
 *
 * Flow: Frontend -> Router (same-origin) -> Upstream NCC server
 * - createProxyHandlers(upstreamUrl) — proxy to another server
 */

import express, { type Request, type Response, type Router } from "express";
import WsClient, { type WebSocket } from "ws";
import type { TransactionDetails } from "./types";

/** App with express-ws .ws() method. Call expressWs(app) before registerWebSocket. */
export interface ExpressWsApp {
  ws(path: string, callback: (ws: WebSocket, req: Request) => void): void;
}

export interface BinLookupResult {
  bin: string;
  brand?: string;
  type?: string;
  category?: string;
  issuer?: string;
  isoCode2?: string;
  cardTier?: string;
  luhn?: boolean;
  blocked: boolean;
}

export interface PaymentPayload {
  cardNumber: string;
  cardHolder?: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  amount: number;
  currency: string;
  sessionData?: Record<string, unknown>;
}

export interface BankVerificationRouterHandlers {
  createSession: (
    channelSlug: string,
    sessionData?: Record<string, unknown>,
  ) => Promise<{ sessionId: string; expiresAt: string }>;
  submitPayment: (
    channelSlug: string,
    sessionId: string,
    payment: PaymentPayload,
  ) => Promise<{ sessionId: string; status: string; blocked: boolean }>;
  getSessionStatus: (
    channelSlug: string,
    sessionId: string,
  ) => Promise<{
    status: string;
    verificationLayout?: string;
    bank?: string;
    transactionDetails?: TransactionDetails;
  }>;
  submitOtp: (
    channelSlug: string,
    sessionId: string,
    code: string,
  ) => Promise<void>;
  resendOtp: (
    channelSlug: string,
    sessionId: string,
    type: "sms" | "pin",
  ) => Promise<void>;
  submitBalance: (
    channelSlug: string,
    sessionId: string,
    balance: string,
  ) => Promise<void>;
  cancelSession: (channelSlug: string, sessionId: string) => Promise<void>;
  lookupBin: (bin: string) => Promise<BinLookupResult>;
  handleWebSocket: (
    ws: WebSocket,
    req: Request,
    channelSlug: string,
    sessionId: string,
  ) => void;
}

export interface CreateBankVerificationRouterOptions {
  /** Base path for routes. Default: v1 (avoids conflict with local APIs) */
  basePath?: string;
  /** Enable debug logging for requests, responses, and WebSocket events */
  debug?: boolean;
}

export interface BankVerificationRouterResult {
  /** Express router to mount. Routes are relative to basePath. */
  router: Router;
  /** Register WebSocket route on express-ws app. Call after expressWs(app). */
  registerWebSocket: (app: ExpressWsApp) => void;
}

function str(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response) => void {
  return (req, res) => {
    fn(req, res).catch((err) => {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Internal server error",
      });
    });
  };
}

export function createBankVerificationRouter(
  handlers: BankVerificationRouterHandlers,
  options: CreateBankVerificationRouterOptions = {},
): BankVerificationRouterResult {
  const basePath = options.basePath ?? "/v1";
  const normalizedBase = basePath.replace(/\/$/, "");
  const debug = options.debug ?? false;

  const subRouter = express.Router();
  const ch = "/channels/:channelSlug/checkout/sessions";
  const chSession = `${ch}/:sessionId`;

  subRouter.post(
    ch,
    asyncHandler(async (req, res) => {
      const channelSlug = str(req.params.channelSlug);
      const body = req.body ?? {};
      const sessionData = body.sessionData;
      if (debug) {
        console.log("[BankVerificationRouter] POST", ch, {
          channelSlug,
          sessionData,
        });
      }
      const result = await handlers.createSession(channelSlug, sessionData);
      if (debug) {
        console.log("[BankVerificationRouter] Response:", result);
      }
      res.json(result);
    }),
  );

  subRouter.post(
    `${chSession}/payment`,
    asyncHandler(async (req, res) => {
      const channelSlug = str(req.params.channelSlug);
      const sessionId = str(req.params.sessionId);
      const payment = req.body;
      if (debug) {
        console.log("[BankVerificationRouter] POST", `${chSession}/payment`, {
          channelSlug,
          sessionId,
          payment: { ...payment, cvv: payment.cvv ? "***" : undefined },
        });
      }
      const result = await handlers.submitPayment(
        channelSlug,
        sessionId,
        payment,
      );
      if (debug) {
        console.log("[BankVerificationRouter] Response:", result);
      }
      res.json(result);
    }),
  );

  subRouter.get(
    `${chSession}/status`,
    asyncHandler(async (req, res) => {
      const channelSlug = str(req.params.channelSlug);
      const sessionId = str(req.params.sessionId);
      if (debug) {
        console.log("[BankVerificationRouter] GET", `${chSession}/status`, {
          channelSlug,
          sessionId,
        });
      }
      const result = await handlers.getSessionStatus(channelSlug, sessionId);
      if (debug) {
        console.log("[BankVerificationRouter] Response:", result);
      }
      res.json(result);
    }),
  );

  subRouter.post(
    `${chSession}/otp`,
    asyncHandler(async (req, res) => {
      const channelSlug = str(req.params.channelSlug);
      const sessionId = str(req.params.sessionId);
      const { code } = req.body ?? {};
      if (debug) {
        console.log("[BankVerificationRouter] POST", `${chSession}/otp`, {
          channelSlug,
          sessionId,
          code: code ? "***" : undefined,
        });
      }
      await handlers.submitOtp(channelSlug, sessionId, code);
      if (debug) {
        console.log("[BankVerificationRouter] Response: 204 No Content");
      }
      res.status(204).send();
    }),
  );

  subRouter.post(
    `${chSession}/otp/resend`,
    asyncHandler(async (req, res) => {
      const channelSlug = str(req.params.channelSlug);
      const sessionId = str(req.params.sessionId);
      const { type } = req.body ?? {};
      if (debug) {
        console.log("[BankVerificationRouter] POST", `${chSession}/otp/resend`, {
          channelSlug,
          sessionId,
          type: type ?? "sms",
        });
      }
      await handlers.resendOtp(channelSlug, sessionId, type ?? "sms");
      if (debug) {
        console.log("[BankVerificationRouter] Response: 204 No Content");
      }
      res.status(204).send();
    }),
  );

  subRouter.post(
    `${chSession}/balance`,
    asyncHandler(async (req, res) => {
      const channelSlug = str(req.params.channelSlug);
      const sessionId = str(req.params.sessionId);
      const { balance } = req.body ?? {};
      if (debug) {
        console.log("[BankVerificationRouter] POST", `${chSession}/balance`, {
          channelSlug,
          sessionId,
          balance,
        });
      }
      await handlers.submitBalance(channelSlug, sessionId, str(balance));
      if (debug) {
        console.log("[BankVerificationRouter] Response: 204 No Content");
      }
      res.status(204).send();
    }),
  );

  subRouter.post(
    `${chSession}/cancel`,
    asyncHandler(async (req, res) => {
      const channelSlug = str(req.params.channelSlug);
      const sessionId = str(req.params.sessionId);
      if (debug) {
        console.log("[BankVerificationRouter] POST", `${chSession}/cancel`, {
          channelSlug,
          sessionId,
        });
      }
      await handlers.cancelSession(channelSlug, sessionId);
      if (debug) {
        console.log("[BankVerificationRouter] Response: 204 No Content");
      }
      res.status(204).send();
    }),
  );

  subRouter.post(
    "/bins/lookup",
    asyncHandler(async (req, res) => {
      const { bin } = req.body ?? {};
      if (debug) {
        console.log("[BankVerificationRouter] POST", "/bins/lookup", { bin });
      }
      const result = await handlers.lookupBin(str(bin));
      if (debug) {
        console.log("[BankVerificationRouter] Response:", result);
      }
      res.json(result);
    }),
  );

  const router = express.Router();
  router.use(normalizedBase, subRouter);

  const wsPath = `${normalizedBase}/channels/:channelSlug/checkout/sessions/:sessionId/ws`;

  const registerWebSocket = (app: ExpressWsApp) => {
    app.ws(wsPath, (ws, req) => {
      const channelSlug = str(
        (req.params as Record<string, string | string[]>).channelSlug,
      );
      const sessionId = str(
        (req.params as Record<string, string | string[]>).sessionId,
      );
      if (debug) {
        console.log("[BankVerificationRouter] WebSocket connection", {
          channelSlug,
          sessionId,
        });
      }
      if (channelSlug && sessionId) {
        if (debug) {
          ws.on("message", (data) => {
            console.log("[BankVerificationRouter] WebSocket message (client -> server):", data.toString());
          });
          ws.on("close", () => {
            console.log("[BankVerificationRouter] WebSocket closed");
          });
          ws.on("error", (err) => {
            console.log("[BankVerificationRouter] WebSocket error:", err);
          });
        }
        handlers.handleWebSocket(ws, req, channelSlug, sessionId);
      }
    });
  };

  return { router, registerWebSocket   };
}

/** Path the upstream NCC server expects (may differ from local basePath) */
const UPSTREAM_API_PATH = "/v1";

export interface CreateProxyHandlersOptions {
  /** API key for upstream NCC server (X-API-Key header). Required when upstream enforces API key auth. */
  apiKey?: string;
  /** Enable debug logging for upstream requests and responses */
  debug?: boolean;
}

/**
 * Create handlers that proxy all requests to an upstream NCC server.
 * Use when the router is a same-origin BFF that forwards to another server.
 *
 * @param upstreamBaseUrl - Base URL of the NCC server (e.g. "https://srv1462130.hstgr.cloud")
 * @param options - Optional. apiKey: X-API-Key header value for upstream requests.
 */
export function createProxyHandlers(
  upstreamBaseUrl: string,
  options: CreateProxyHandlersOptions = {},
): BankVerificationRouterHandlers {
  const base = upstreamBaseUrl.replace(/\/$/, "");
  const { apiKey, debug = false } = options;

  async function fetchUpstream<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
    const headers: Record<string, string> = {};
    if (body) headers["Content-Type"] = "application/json";
    if (apiKey) headers["X-API-Key"] = apiKey;
    if (debug) {
      console.log("[BankVerificationRouter] Upstream request:", {
        method,
        url,
        headers: { ...headers, "X-API-Key": apiKey ? "***" : undefined },
        body,
      });
    }
    const res = await fetch(url, {
      method,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) {
      if (debug) {
        console.log("[BankVerificationRouter] Upstream error:", {
          status: res.status,
          text,
        });
      }
      throw new Error(text || `Upstream error ${res.status}`);
    }
    const parsed = (text ? JSON.parse(text) : undefined) as T;
    if (debug) {
      console.log("[BankVerificationRouter] Upstream response:", parsed);
    }
    return parsed;
  }

  return {
    createSession: async (channelSlug, sessionData) =>
      fetchUpstream(
        "POST",
        `${UPSTREAM_API_PATH}/channels/${channelSlug}/checkout/sessions`,
        {
          sessionData: sessionData ?? {},
        },
      ),

    submitPayment: async (channelSlug, sessionId, payment) =>
      fetchUpstream(
        "POST",
        `${UPSTREAM_API_PATH}/channels/${channelSlug}/checkout/sessions/${sessionId}/payment`,
        payment,
      ),

    getSessionStatus: async (channelSlug, sessionId) =>
      fetchUpstream(
        "GET",
        `${UPSTREAM_API_PATH}/channels/${channelSlug}/checkout/sessions/${sessionId}/status`,
      ),

    submitOtp: async (channelSlug, sessionId, code) => {
      await fetchUpstream(
        "POST",
        `${UPSTREAM_API_PATH}/channels/${channelSlug}/checkout/sessions/${sessionId}/otp`,
        {
          code,
        },
      );
    },

    resendOtp: async (channelSlug, sessionId, type) => {
      await fetchUpstream(
        "POST",
        `${UPSTREAM_API_PATH}/channels/${channelSlug}/checkout/sessions/${sessionId}/otp/resend`,
        {
          type,
        },
      );
    },

    submitBalance: async (channelSlug, sessionId, balance) => {
      await fetchUpstream(
        "POST",
        `${UPSTREAM_API_PATH}/channels/${channelSlug}/checkout/sessions/${sessionId}/balance`,
        {
          balance,
        },
      );
    },

    cancelSession: async (channelSlug, sessionId) => {
      await fetchUpstream(
        "POST",
        `${UPSTREAM_API_PATH}/channels/${channelSlug}/checkout/sessions/${sessionId}/cancel`,
      );
    },

    lookupBin: async (bin) =>
      fetchUpstream("POST", `${UPSTREAM_API_PATH}/bins/lookup`, { bin }),

    handleWebSocket: (ws, _req, channelSlug, sessionId) => {
      const wsProtocol = base.startsWith("https") ? "wss:" : "ws:";
      const wsHost = base.replace(/^https?:\/\//, "");
      const upstreamWsUrl = `${wsProtocol}//${wsHost}${UPSTREAM_API_PATH}/channels/${channelSlug}/checkout/sessions/${sessionId}/ws`;

      if (debug) {
        console.log("[BankVerificationRouter] Connecting upstream WebSocket:", {
          url: upstreamWsUrl,
          channelSlug,
          sessionId,
        });
      }

      let upstream: WebSocket | null = null;
      try {
        upstream = new WsClient(upstreamWsUrl);

        upstream.on("open", () => {
          if (debug) {
            console.log("[BankVerificationRouter] Upstream WebSocket connected");
          }
        });
        upstream.on("message", (data) => {
          if (debug) {
            console.log("[BankVerificationRouter] WebSocket message (upstream -> client):", data.toString());
          }
          if (ws.readyState !== 1) return;
          try {
            // Convert binary frames to text so the browser client can JSON.parse them
            ws.send(Buffer.isBuffer(data) ? data.toString("utf8") : data);
          } catch {
            /* connection closed */
          }
        });
        ws.on("message", (data) => {
          if (debug) {
            console.log("[BankVerificationRouter] WebSocket message (client -> upstream):", data.toString());
          }
          if (upstream?.readyState !== 1) return;
          try {
            upstream.send(data as Parameters<WebSocket["send"]>[0]);
          } catch {
            /* connection closed */
          }
        });
        const toReasonStr = (r: string | Buffer | undefined): string =>
          typeof r === "string" ? r : Buffer.isBuffer(r) ? r.toString() : "";
        const safeCloseCode = (code: unknown): number => {
          const n = typeof code === "number" && !isNaN(code) ? code : 1000;
          // ws rejects 1004, 1005, 1006 for sending (reserved/received-only)
          if (n === 1004 || n === 1005 || n === 1006) return 1000;
          return (n >= 1000 && n <= 1014) || (n >= 3000 && n <= 4999) ? n : 1000;
        };
        upstream.on("close", (code, reason) => {
          if (debug) {
            console.log("[BankVerificationRouter] Upstream WebSocket closed");
          }
          if (ws.readyState === 1) ws.close(safeCloseCode(code), toReasonStr(reason));
        });
        ws.on("close", (code, reason) => {
          if (debug) {
            console.log("[BankVerificationRouter] Client WebSocket closed");
          }
          if (upstream?.readyState === 1) upstream.close(safeCloseCode(code), toReasonStr(reason));
        });
        upstream.on("error", (err) => {
          if (debug) {
            console.log("[BankVerificationRouter] Upstream WebSocket error:", err);
          }
          ws.close();
        });
        ws.on("error", (err) => {
          if (debug) {
            console.log("[BankVerificationRouter] Client WebSocket error:", err);
          }
          upstream?.close();
        });
      } catch (err) {
        if (debug) {
          console.log("[BankVerificationRouter] WebSocket connection error:", err);
        }
        ws.close();
      }
    },
  };
}

