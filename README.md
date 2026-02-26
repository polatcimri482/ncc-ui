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

### `useSessionStatus`

Hook for custom UIs. Polls and subscribes via WebSocket for real-time status updates.

```ts
useSessionStatus(apiBase: string, channelSlug: string, sessionId: string)
```

**Returns:**

| Property            | Type                                               | Description |
|---------------------|----------------------------------------------------|-------------|
| `status`            | `string`                                           | Current session status (see [Status values](#status-values)). |
| `verificationLayout`| `string`                                           | Layout to render: `sms`, `pin`, `push`, `balance`, or channel-specific (`enbd-sms`, `adcb-sms`, etc.). |
| `redirectUrl`       | `string \| null`                                   | If set, redirect the user to this URL. |
| `wrongCode`         | `boolean`                                          | True when OTP/PIN was incorrect; show "try again" UI. |
| `clearWrongCode`    | `() => void`                                       | Call to reset `wrongCode` after user retries. |
| `operatorMessage`   | `{ level: "error" \| "info"; message: string } \| null` | Message from the backend to display. |
| `clearOperatorMessage` | `() => void`                                    | Call to clear the operator message. |
| `error`             | `string \| null`                                   | Error message if the initial status fetch failed. |
| `refetch`           | `() => Promise<void>`                              | Manually refetch status. |

### `useCheckout`

Single hook for the full checkout API. Pass `apiBase`, `apiKey`, and `channelSlug` once; returned methods use them automatically. Manages `channel` and `sessionId` internally.

```ts
useCheckout(apiBase: string, apiKey: string, channelSlug: string, sessionIdFromUrl?: string)
```

- **`channelSlug`** — Channel identifier from your route params.
- **`sessionIdFromUrl`** — Optional. Pass when you have a session ID from the URL (e.g. on the processing or verify page). When omitted, `createSession()` creates and stores it.

**Returns:**

| Property       | Type     | Description |
|----------------|----------|-------------|
| `channel`     | `string` | The channel slug (same as passed in). |
| `sessionId`   | `string \| null` | Current session ID. Set by `createSession()` or from `sessionIdFromUrl`. |
| `createSession` | `(sessionData?) => Promise<{ sessionId: string }>` | Creates a checkout session. Use before first `submitPayment`. |
| `submitPayment` | `(payment) => Promise<{ sessionId, status, blocked }>` | Submits card payment. Uses `channel` and `sessionId` automatically. |
| `getSessionStatus` | `() => Promise<{ status, verificationLayout? }>` | Polls session status. Requires `sessionId` (from URL or `createSession`). |
| `binLookup`    | `(bin: string) => Promise<BinLookupInfo \| null>` | BIN lookup for card form. Pass to `CardForm`'s `onBinLookup`. |

**Example (checkout form page):**

```tsx
const { channel, sessionId, createSession, submitPayment, binLookup } = useCheckout(
  config.apiBase,
  config.apiKey,
  channelSlug ?? "test"
);

const handleSubmit = async (paymentData) => {
  const sid = sessionId ?? (await createSession()).sessionId;
  const result = await submitPayment(paymentData);
  if (result.blocked || needsVerification(result.status)) {
    navigate(buildVerifyRoute(channel, sid));
  } else if (result.status === "success") {
    navigate(buildSuccessRoute(channel, sid));
  }
  // ...
};

<CardForm onBinLookup={binLookup} onSubmit={handleSubmit} />
```

**Example (processing page):**

```tsx
const { channel, sessionId, getSessionStatus } = useCheckout(
  config.apiBase,
  config.apiKey,
  channelSlug ?? "",
  sessionId  // from URL params
);

const status = await getSessionStatus();
```

### Raw checkout API (non-React)

For server-side or non-React usage, use the raw functions. All require `apiBase` and `apiKey` as arguments.

- **`createSession(apiBase, channelSlug, apiKey, sessionData?)`** — Creates a checkout session.
- **`submitPayment(apiBase, channelSlug, sessionId, apiKey, payment)`** — Submits payment.
- **`getSessionStatus(apiBase, channelSlug, sessionId, apiKey)`** — Gets session status.
- **`lookupBin(apiBase, apiKey, bin)`** — BIN lookup. Returns `BinLookupResult`.
- **`useBinLookup(apiBase, apiKey)`** — React hook that returns a BIN lookup handler (same as `useCheckout(…).binLookup`).

### Types

- **`BankConfig`** — `{ apiBase: string }`
- **`BankVerificationProps`** — Props interface for `BankVerification`
- **`UseCheckoutReturn`** — Return type of `useCheckout`
- **`BinLookupInfo`** — `{ brand?, type?, category?, issuer?, isoCode2?, blocked }` — Used by `onBinLookup`.
- **`BinLookupResult`** — Full BIN lookup response from the API.

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
| `/v1/channels/{channelSlug}/checkout/sessions/{sessionId}/status` | GET  | Session status + `verificationLayout`. |
| `/v1/channels/{channelSlug}/checkout/sessions/{sessionId}/otp`   | POST | Submit SMS OTP code. Body: `{ code: string }`. |
| `/v1/channels/{channelSlug}/checkout/sessions/{sessionId}/balance` | POST | Submit balance response. Body: `{ balance: string }`. |
| `/v1/channels/{channelSlug}/checkout/sessions/{sessionId}/ws`   | WebSocket | Real-time status, `redirectUrl`, `wrongCode`, `operatorMessage`. |

Bank verification uses session-based auth (no API key in requests); session is identified by cookies or similar.

### Checkout endpoints (Bearer API key)

For `useCheckout` and the raw checkout API, your backend must expose these paths (appended to `apiBase`). For direct API calls, the backend must allow CORS for your app origin.

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
    redirectUrl,
    wrongCode,
    clearWrongCode,
    operatorMessage,
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
      wrongCode={wrongCode}
      onTryAgain={clearWrongCode}
      operatorMessage={operatorMessage}
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
