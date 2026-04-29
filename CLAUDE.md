# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@ncc/bank-verification-ui` is a React component library for bank verification UI in checkout flows. It is distributed as a dual ESM/CJS package hosted on GitHub (not npm).

## Required Dependency Versions (Consumer Projects)

All projects that use this package **must** match these versions exactly. Mismatches — especially Express 4 vs 5 — silently break WebSocket functionality.

| Dependency | Required version | Notes |
|------------|-----------------|-------|
| `express` | `^4.18.0` | **Express 5 is NOT supported.** Only required if using `/express` entry. |
| `express-ws` | `^5.0.0` | Only required if using `/express` entry. |
| `hono` | `^4.0.0` | Only required if using `/hono` entry. |
| `react` | `^18.0.0` | |
| `react-dom` | `^18.0.0` | |
| `vite` | `^5.4.0 \|\| ^6.0.0 \|\| ^7.0.0` | Any of these three. Vite 8 also works (peer warning only — package never imports vite at runtime). |
| `ws` | `^8.0.0` | Transitive via express-ws (Express entry only). |

## Common Commands

```bash
# Development (merged: preview + NCC API on http://localhost:5173)
npm run dev                    # proxy to upstream NCC (default)
NCC_UPSTREAM=<url> npm run dev # custom upstream

# Build the library (generates CSS strings, bank logos, bundles with tsup, copies CSS)
npm run build

# Type checking
npm run typecheck

# Convert HTML bank layouts to TSX components
npm run html-to-tsx

# Extract base64 images from HTML templates
npm run extract-base64-images
```

There are no automated tests — manual testing is done via the preview app at `preview/main.tsx`.

### Testing the Express Router

1. Run `npm run dev` — preview + NCC API on port 5173 (proxies to upstream by default)
2. Open http://localhost:5173/

Custom upstream: `NCC_UPSTREAM=https://your-server.com npm run dev`

## Architecture

### Dual API Modes

The library supports two usage modes:

1. **Checkout mode** — `useCheckoutFlow` handles full payment submission + verification. Accepts `PaymentData` and `CheckoutFlowCallbacks`.
2. **Processing mode** — `useSessionStatus` polls an existing session via WebSocket (`src/lib/ws.ts`) for real-time status updates.

### Express Router (Backend)

The package includes an Express router for backend use. Import from `@ncc/bank-verification-ui/express`.

**All consumer projects must follow the exact setup in `scripts/dev-server.js`.** Wrong ordering or wrong `expressWs`/Vite config silently breaks WebSocket (connection opens but no messages arrive → falls back to polling).

Required setup order:
1. `http.createServer(app)` + `expressWs(app, httpServer)` — both args required
2. NCC `router` + `registerWebSocket(app)` before Vite middleware
3. Vite with `server: { middlewareMode: { server: httpServer } }` — not `middlewareMode: true` + `hmr: { server }`

```ts
import http from "http";
import express from "express";
import expressWs from "express-ws";
import { createServer as createViteServer } from "vite";
import {
  createBankVerificationRouter,
  createProxyHandlers,
} from "@ncc/bank-verification-ui/express";

const app = express();
const httpServer = http.createServer(app);
expressWs(app, httpServer);
app.use(express.json());

// NCC routes BEFORE Vite
const handlers = createProxyHandlers("https://srv1462130.hstgr.cloud");
const { router, registerWebSocket } = createBankVerificationRouter(handlers);
app.use(router);         // basePath defaults to /ncc/v1
registerWebSocket(app);

// Vite: share httpServer via middlewareMode object
const vite = await createViteServer({
  server: { middlewareMode: { server: httpServer } },
});
app.use(vite.middlewares);

httpServer.listen(5173);
```

Routes are at `/v1/channels/...`, `/v1/bins/lookup`, plus WebSocket (same-origin only). Requires `express` and `express-ws` as peer dependencies.

> The proxy auto-converts binary WebSocket frames from upstream to UTF-8 text so the browser client can `JSON.parse` them.

### Hono Router (Backend)

For Hono + Bun backends (e.g. gift-card-marketplace), import from `@ncc/bank-verification-ui/hono`. Same routes, same upstream proxy logic, no `express` / `express-ws` / `ws` dependencies.

```ts
import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import {
  createBankVerificationHono,
  createHonoProxyHandlers,
} from "@ncc/bank-verification-ui/hono";

const { upgradeWebSocket, websocket } = createBunWebSocket();

const handlers = createHonoProxyHandlers("https://srv1462130.hstgr.cloud", {
  apiKey: "test",
});
const ncc = createBankVerificationHono({
  handlers,
  upgradeWebSocket,        // omit to disable WS (clients fall back to polling)
  basePath: "/v1",
});

const app = new Hono().route("/", ncc);

export default { port: 3003, fetch: app.fetch, websocket };
```

For Node + Hono, swap `createBunWebSocket` for `createNodeWebSocket` from `@hono/node-ws` and pass its `upgradeWebSocket` instead. The package itself does not import either adapter — the consumer chooses the runtime.

The upstream WebSocket client uses the global `WebSocket` (Bun and Node ≥22 native). For older Node, polyfill or pin `node >= 22`.

> Vite + `@hono/vite-dev-server` does **not** forward WebSocket upgrades to the Hono app in dev. For dev WebSocket support, either run the Hono process standalone behind a Vite proxy, or hook `server.httpServer.on('upgrade', ...)` from a Vite plugin. Production (Bun.serve) handles it natively via the `websocket` config.

### Key Hooks & Provider

- `BankVerificationProvider` — Wraps the checkout area. Provides `channelSlug` and `debug` via context. Session comes from localStorage.
- `useCheckoutFlow(callbacks)` — Must be used within the provider. Combines checkout submission and session status tracking. Exposes `resetSession`; call it in the modal `onClose` handler.
- `useVerificationForm` — Manages verification state (OTP, balance, resend logic). Gets `channelSlug` and `sessionId` from context/localStorage.
- `useSessionStatus()` — WebSocket-based status subscription. Takes no params; reads `channelSlug` and `debug` from context, `sessionId` from localStorage.
- `useOtpResendCountdown` — Countdown timer for OTP resend throttling.
- `useBinLookup` — Fetches bank config from a BIN number.

### Bank Layouts

Bank-specific UIs live in `src/layouts/banks/`. They are:

- Converted from HTML templates in `html/` using `npm run html-to-tsx`
- **Lazy-loaded** via `React.lazy` + `Suspense` — `BANK_LAYOUT_MAP` maps bank identifiers to lazy components
- Base64-encoded images are stored in `src/assets/bank-logos.ts` (generated by `scripts/generate-bank-logos.js`)

### Style Isolation

CSS is bundled into `dist/index.css` and also available as a JS string (`src/styles/bank-ui-css.ts`, generated by `scripts/generate-css-string.js`). `StyleIsolationWrapper` injects styles into a shadow DOM or scoped container to avoid leaking into consumer apps.

### Build Pipeline

`npm run build` runs in sequence:

1. `scripts/generate-css-string.js` → `src/styles/bank-ui-css.ts`
2. `scripts/generate-bank-logos.js` → `src/assets/bank-logos.ts`
3. `tsup` bundles `src/index.ts` → `dist/` (ESM + CJS + `.d.ts`, `react`/`react-dom` external)
4. Copies `src/styles/bank-ui.css` → `dist/index.css`

The `dist/` directory is committed to git so consumers don't need a build step.

### Adding a New Bank Layout

1. Place the bank's HTML in `html/`
2. Run `npm run html-to-tsx` to convert it
3. Run `npm run extract-base64-images` if the HTML contains embedded images
4. Register the component in `src/layouts/banks/index.tsx` in `BANK_LAYOUT_MAP`

## Package Distribution

Consumers install via:

```json
"@ncc/bank-verification-ui": "github:polatcimri482/ncc-ui#main"
```

Or for a monorepo: `"file:../bank-verification-ui"`. Pin to a tag for production.

CSS must be imported separately: `import "@ncc/bank-verification-ui/styles.css"`.

## Debug Mode

Pass `debug={true}` to `BankVerificationProvider` to enable console logging of session status, WebSocket events, and OTP/balance submissions.
