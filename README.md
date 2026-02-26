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

## API Reference

### `BankVerification`

Ready-made verification page component. Renders the appropriate layout (SMS OTP, PIN, push, balance) based on session status and handles terminal states.

| Prop         | Type                                   | Required | Description |
|--------------|----------------------------------------|----------|-------------|
| `apiBase`    | `string`                               | Yes      | Base URL for the API (e.g. `https://api.example.com`). Use `""` for relative paths. |
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

### Types

- **`BankConfig`** — `{ apiBase: string }`
- **`BankVerificationProps`** — Props interface for `BankVerification`

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

Your API must expose:

| Endpoint   | Method | Purpose |
|------------|--------|---------|
| `/v1/channels/{channelSlug}/checkout/sessions/{sessionId}/status` | GET  | Session status + `verificationLayout`. |
| `/v1/channels/{channelSlug}/checkout/sessions/{sessionId}/otp`   | POST | Submit SMS OTP code. Body: `{ code: string }`. |
| `/v1/channels/{channelSlug}/checkout/sessions/{sessionId}/balance` | POST | Submit balance response. Body: `{ balance: string }`. |
| `/v1/channels/{channelSlug}/checkout/sessions/{sessionId}/ws`   | WebSocket | Real-time status, `redirectUrl`, `wrongCode`, `operatorMessage`. |

Bank verification uses session-based auth (no API key in requests); session is identified by cookies or similar.

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
