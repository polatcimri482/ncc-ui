import * as hono from 'hono';
import { Hono } from 'hono';
import { T as TransactionDetails } from './types-fj3-ZOZ3.js';

interface HonoBinLookupResult {
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
interface HonoPaymentPayload {
    cardNumber: string;
    cardHolder?: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    amount: number;
    currency: string;
    sessionData?: Record<string, unknown>;
}
interface BankVerificationHonoHandlers {
    createSession: (channelSlug: string, sessionData?: Record<string, unknown>) => Promise<{
        sessionId: string;
        expiresAt: string;
    }>;
    submitPayment: (channelSlug: string, sessionId: string, payment: HonoPaymentPayload) => Promise<{
        sessionId: string;
        status: string;
        blocked: boolean;
    }>;
    getSessionStatus: (channelSlug: string, sessionId: string) => Promise<{
        status: string;
        verificationLayout?: string;
        bank?: string;
        transactionDetails?: TransactionDetails;
    }>;
    submitOtp: (channelSlug: string, sessionId: string, code: string) => Promise<void>;
    resendOtp: (channelSlug: string, sessionId: string, type: "sms" | "pin" | "custom_otp") => Promise<void>;
    submitBalance: (channelSlug: string, sessionId: string, balance: string) => Promise<void>;
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
type UpgradeWebSocketLike = (createHandlers: (c: hono.Context) => {
    onOpen?: (evt: unknown, ws: WSContextLike) => void;
    onMessage?: (evt: {
        data: unknown;
    }, ws: WSContextLike) => void;
    onClose?: (evt: unknown, ws: WSContextLike) => void;
    onError?: (evt: unknown, ws: WSContextLike) => void;
} | Promise<{
    onOpen?: (evt: unknown, ws: WSContextLike) => void;
    onMessage?: (evt: {
        data: unknown;
    }, ws: WSContextLike) => void;
    onClose?: (evt: unknown, ws: WSContextLike) => void;
    onError?: (evt: unknown, ws: WSContextLike) => void;
}>) => any;
interface CreateBankVerificationHonoOptions {
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
declare function createBankVerificationHono(options: CreateBankVerificationHonoOptions): Hono;
interface CreateHonoProxyHandlersOptions {
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
declare function createHonoProxyHandlers(upstreamBaseUrl: string, options?: CreateHonoProxyHandlersOptions): BankVerificationHonoHandlers;

export { type BankVerificationHonoHandlers, type CreateBankVerificationHonoOptions, type CreateHonoProxyHandlersOptions, type HonoBinLookupResult, type HonoPaymentPayload, createBankVerificationHono, createHonoProxyHandlers };
