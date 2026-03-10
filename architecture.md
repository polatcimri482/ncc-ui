# @ncc/bank-verification-ui — Architecture & Logic

## High-Level Purpose

A React component library for bank card verification in checkout flows. Handles:
- Payment card submission and session creation
- Real-time bank verification status tracking (SMS, PIN, Push, Balance)
- WebSocket-based real-time updates with HTTP polling fallback
- Bank-specific UI layouts (lazy-loaded)
- Session persistence via localStorage
- Express router backend for same-origin proxying to upstream NCC servers

Distributed as dual ESM/CJS package via GitHub (not npm). Requires `react`/`react-dom` as peer deps.

---

## Two Core Flows

### 1. Checkout Mode
1. `useCheckoutFlow().submitPayment(PaymentData)` creates a session via POST `/ncc/v1/channels/{slug}/checkout/sessions`
2. Payment submitted to POST `.../sessions/{id}/payment`
3. Server responds with status — if verification needed, modal opens and WebSocket connects
4. Session stored in localStorage with `submitted: true`

### 2. Processing Mode
- No payment submission — monitors an existing session
- `useSessionStatus()` connects WebSocket, falls back to HTTP polling every 3 seconds

---

## Session Status State Machine

```
pending / awaiting_action          → in-progress (modal may show)
awaiting_sms / awaiting_pin        → verification modal open
awaiting_push / awaiting_balance   → verification modal open
success / declined / expired       → terminal → clearSession()
blocked / invalid                  → terminal → clearSession()
```

Server dictates UI via `verificationLayout` field: `"sms"`, `"pin"`, `"push"`, `"balance"`.

---

## Key Hooks

| Hook | Purpose |
|------|---------|
| `useCheckoutFlow()` | Orchestrates payment submission + session management |
| `useSessionStatus()` | Public hook — WebSocket polling, reads context |
| `useVerificationForm()` | OTP/PIN/balance input state and submission |
| `useBinLookup()` | Fetches card issuer info from BIN number |
| `useOtpResendCountdown()` | Timer for OTP resend throttling |
| `useSessionFromStorage()` | Syncs session to/from localStorage via `useSyncExternalStore` |

---

## Context: BankVerificationProvider

Wraps the checkout area. Provides:
- `channelSlug`, `debug`, `sessionId`, `setSession`, `clearSession`
- Status: `status`, `verificationLayout`, `bank`, `transactionDetails`, `countdown`
- Form: `otpValue`, `balance`, `wrongCode`, `expiredCode`, `canSubmit`, `submitting`
- OTP resend: `resendState { secondsLeft, canResend, onResend, resending }`
- Derived: `inProgress`, `awaitingVerification`, `error`, `operatorMessage`
- Callbacks: `onSubmit`, `onClose`, `fetchStatus`, `clearCodeFeedback`

---

## Session Storage

- **Key:** `ncc_checkout_{channelSlug}` in localStorage
- **Value:** `{ sessionId, status, submitted }`
- Active only if `submitted === true` AND status is not terminal
- Uses `useSyncExternalStore` for cross-tab sync

---

## WebSocket

- URL: `/ncc/v1/channels/{slug}/checkout/sessions/{id}/ws`
- Receives `StatusMessage` — `status`, `verificationLayout`, `bank`, `wrongCode`, `expiredCode`, `countdownReset`, `redirectUrl`, `transactionDetails`
- Receives `OperatorMessage` — `level` (`error`|`info`), `message`
- Falls back to HTTP polling every 3s on socket close

---

## Express Router (Backend BFF)

```ts
import { createBankVerificationRouter, createProxyHandlers } from "@ncc/bank-verification-ui/express";

const handlers = createProxyHandlers("https://upstream-ncc-server.com", { apiKey: "..." });
const { router, registerWebSocket } = createBankVerificationRouter(handlers);
app.use(router);          // mounts at /ncc/v1
registerWebSocket(app);   // requires express-ws
```

**Routes (relative to `/ncc/v1`):**

| Method | Path |
|--------|------|
| POST | `/channels/{slug}/checkout/sessions` |
| POST | `/channels/{slug}/checkout/sessions/{id}/payment` |
| GET  | `/channels/{slug}/checkout/sessions/{id}/status` |
| POST | `/channels/{slug}/checkout/sessions/{id}/otp` |
| POST | `/channels/{slug}/checkout/sessions/{id}/otp/resend` |
| POST | `/channels/{slug}/checkout/sessions/{id}/balance` |
| POST | `/bins/lookup` |
| WS   | `/channels/{slug}/checkout/sessions/{id}/ws` |

`createProxyHandlers` supports API key auth via `X-API-Key` header and WebSocket tunneling.

---

## Bank Layouts

- Live in `src/layouts/banks/`
- Lazy-loaded via `React.lazy` + `Suspense`
- Mapped by bank slug in `BANK_LAYOUT_MAP` in `src/layouts/banks/index.tsx`
- Currently: `nbd2` → `VerificationUi`

**Adding a bank:**
1. Place HTML in `html/`
2. `npm run html-to-tsx`
3. `npm run extract-base64-images` (if needed)
4. Register in `BANK_LAYOUT_MAP`

---

## Key File Paths

| File | Purpose |
|------|---------|
| `src/index.ts` | Public exports |
| `src/context/bank-verification-context.tsx` | Main context provider |
| `src/hooks/use-checkout-flow.ts` | Checkout mode |
| `src/hooks/use-session-status.ts` | Processing mode |
| `src/hooks/use-verification-form.ts` | Verification form logic |
| `src/hooks/use-session-id.ts` | localStorage session sync |
| `src/lib/ws.ts` | WebSocket logic |
| `src/lib/checkout-api.ts` | Checkout API calls |
| `src/lib/verification-api.ts` | Verification API calls |
| `src/lib/checkout-status.ts` | Status type definitions |
| `src/express-router.ts` | Express router + proxy handlers |
| `src/layouts/banks/index.tsx` | BANK_LAYOUT_MAP |
| `preview/main.tsx` | Manual test app |

---

## Build Pipeline

1. `scripts/generate-css-string.js` → `src/styles/bank-ui-css.ts`
2. `scripts/generate-bank-logos.js` → `src/assets/bank-logos.ts`
3. `tsup` → `dist/` (ESM + CJS + `.d.ts`)
4. Copy `src/styles/bank-ui.css` → `dist/index.css`

`dist/` is committed to git so consumers skip the build step.

---

## Dev Commands

```bash
npm run dev           # preview + NCC API proxy (localhost:5173)
npm run dev:mock      # offline mock mode
npm run build         # full build
npm run typecheck     # TypeScript check
npm run html-to-tsx   # convert bank HTML templates to TSX
npm run extract-base64-images  # extract embedded images from HTML
```
