# @ncc/bank-verification-ui — Integration Guide

A React component library for bank card verification in checkout flows. Supports full checkout orchestration, real-time status tracking via WebSocket, and an optional Express backend proxy.

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [CSS Setup](#css-setup)
4. [Components](#components)
   - [PaymentForm](#paymentform) — default card form
   - [PaymentFormMinimal](#paymentformminimal) — minimalist editorial style
   - [PaymentFormSoft](#paymentformsoft) — soft gradient / pastel theme
   - [PaymentFormSplit](#paymentformsplit) — two-column with live card preview
   - [BankVerificationModal](#bankverificationmodal)
   - [ErrorBoundary](#errorboundary)
5. [Hooks](#hooks)
   - [useCheckoutFlow](#usecheckoutflow)
   - [useBinLookup](#usbinlookup)
   - [useSessionStatus](#usesessionstatus)
6. [Types](#types)
7. [Status Constants & Helpers](#status-constants--helpers)
8. [Express Backend Router](#express-backend-router)
9. [Debug Mode](#debug-mode)
10. [Complete Integration Example](#complete-integration-example)

---

## Installation

Install directly from GitHub:

```bash
npm install https://github.com/polatcimri482/ncc-ui.git
```

Or add to your `package.json`:

```json
{
  "dependencies": {
    "@ncc/bank-verification-ui": "github:polatcimri482/ncc-ui#main"
  }
}
```

For a monorepo with the package checked out locally:

```json
{
  "dependencies": {
    "@ncc/bank-verification-ui": "file:../bank-verification-ui"
  }
}
```

**Peer dependencies** — install these yourself if not already present:

```bash
npm install react react-dom
```

For backend use, also install:

```bash
npm install express express-ws
```

---

## Quick Start

```tsx
import { PaymentForm } from "@ncc/bank-verification-ui";
import "@ncc/bank-verification-ui/styles.css";

export default function CheckoutPage() {
  return (
    <PaymentForm
      channelSlug="your-channel-slug"
      currency="AED"
      onSuccess={(result) => {
        console.log("Payment successful:", result);
      }}
      onError={(result) => {
        console.error("Payment failed:", result.message);
      }}
    />
  );
}
```

That's it. All four form variants (`PaymentForm`, `PaymentFormMinimal`, `PaymentFormSoft`, `PaymentFormSplit`) share the same props and handle everything internally: card input, BIN lookup, payment submission, and bank verification (OTP, PIN, balance check) in a built-in modal. Swap them freely — no other code changes needed.

---

## CSS Setup

Always import the stylesheet once, at the top level of your app:

```ts
import "@ncc/bank-verification-ui/styles.css";
```

If styles are conflicting with your app's CSS, wrap the component in a style-isolated container (uses shadow DOM internally):

```tsx
import { StyleIsolationWrapper } from "@ncc/bank-verification-ui";

<StyleIsolationWrapper>
  <PaymentForm channelSlug="..." />
</StyleIsolationWrapper>
```

---

## Components

### PaymentForm

The all-in-one payment component. Renders a card input form, performs a BIN lookup, submits the payment, and opens a bank verification modal automatically when needed.

```tsx
import { PaymentForm } from "@ncc/bank-verification-ui";

<PaymentForm
  channelSlug="test-2"
  currency="AED"
  submitLabel="Pay now"
  defaultValues={{
    cardNumber: "4111 1111 1111 1111",
    cardHolder: "JOHN DOE",
    expiryMonth: "12",
    expiryYear: "26",
    cvv: "123",
    amount: "250.00",
  }}
  onSuccess={(result) => alert("Payment approved!")}
  onError={(result) => alert(result.message ?? "Payment failed")}
  debug={false}
/>
```

Fixed price (amount hidden, not editable):

```tsx
<PaymentForm
  channelSlug="test-2"
  showAmount={false}
  defaultValues={{ amount: "250.00", cardNumber: "...", ... }}
/>
```

**Props**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `channelSlug` | `string` | required | Channel identifier used for API routing |
| `currency` | `string` | `"AED"` | Currency code displayed in the form |
| `defaultValues` | `Partial<PaymentFormValues>` | — | Pre-fill form fields |
| `onSuccess` | `(result: SubmitResult) => void` | — | Called when payment is approved |
| `onError` | `(result: SubmitResult) => void` | — | Called when payment is declined or fails |
| `submitLabel` | `string` | `"Pay now"` | Text on the submit button |
| `showAmount` | `boolean` | `true` | When false, hides the amount field (fixed price). Requires `defaultValues.amount`. |
| `debug` | `boolean` | `false` | Enables verbose console logging |

**PaymentFormValues**

```ts
interface PaymentFormValues {
  cardNumber: string;   // e.g. "4111 1111 1111 1111"
  cardHolder: string;   // e.g. "JOHN DOE"
  expiryMonth: string;  // e.g. "12"
  expiryYear: string;   // e.g. "26"
  cvv: string;          // e.g. "123"
  amount: string;       // e.g. "250.00"
}
```

**SubmitResult**

```ts
interface SubmitResult {
  isSuccess: boolean;
  isLoading?: boolean;   // true while awaiting bank verification
  error?: FailureStatus;
  message?: string;
}

type FailureStatus = "declined" | "expired" | "blocked" | "invalid" | "error" | "cancelled";
```

**Built-in features:**
- Card number auto-formatting (spaces every 4 digits)
- Card brand detection (Visa, Mastercard, Amex, Discover, UnionPay)
- Real-time BIN lookup — shows issuer name and card type
- Blocked card detection before submission
- Expiry auto-formatting (MM/YY)
- Embedded `BankVerificationModal` — opens automatically for OTP / PIN / balance verification

---

### PaymentFormMinimal

A minimalist, editorial-style form. Uses floating underline labels (no border boxes), a serif display heading, and a stark black submit button. Best for luxury or fashion-adjacent checkout pages.

**Accent color:** coral red (`#ff6b6b`)
**Font:** DM Sans + DM Serif Display

```tsx
import { PaymentFormMinimal } from "@ncc/bank-verification-ui";

<PaymentFormMinimal
  channelSlug="your-channel-slug"
  currency="AED"
  submitLabel="Complete order"
  onSuccess={(result) => console.log("Approved")}
  onError={(result) => console.error(result.message)}
/>
```

**Props** — identical to `PaymentForm`:

| Prop | Type | Default |
|------|------|---------|
| `channelSlug` | `string` | required |
| `currency` | `string` | `"AED"` |
| `defaultValues` | `Partial<PaymentFormValues>` | — |
| `onSuccess` | `(result: SubmitResult) => void` | — |
| `onError` | `(result: SubmitResult) => void` | — |
| `submitLabel` | `string` | `"Pay now"` |
| `debug` | `boolean` | `false` |

**Visual features:**
- Floating labels that animate up on focus
- Animated underline accent on active field
- Brand badge shown as a colored bordered tag (e.g. `VISA`)
- Inline BIN issuer info below card number field
- Full-width uppercase button with lock icon

---

### PaymentFormSoft

A soft, friendly form with a pastel gradient background, rounded pill-shaped input fields, and a purple-to-blue gradient submit button. Suitable for consumer apps and fintech dashboards.

**Accent color:** purple (`#a78bfa` / `#7c3aed`)
**Font:** Plus Jakarta Sans

```tsx
import { PaymentFormSoft } from "@ncc/bank-verification-ui";

<PaymentFormSoft
  channelSlug="your-channel-slug"
  currency="AED"
  onSuccess={(result) => console.log("Approved")}
  onError={(result) => console.error(result.message)}
/>
```

**Props** — identical to `PaymentForm`.

**Visual features:**
- Pastel gradient background (purple → blue → green tint)
- Decorative soft-glow blobs
- Rounded pill inputs (14px radius) with purple focus ring
- Card brand shown as a colored pill badge
- Gradient submit button with drop shadow
- Animated success/error result banner

---

### PaymentFormSplit

A two-column layout: a dark left panel with a live interactive card preview, and a white right panel with compact inputs. The card preview flips to show the CVV when that field is focused.

**Minimum width:** 580px (intended for desktop/modal use)
**Font:** Outfit

```tsx
import { PaymentFormSplit } from "@ncc/bank-verification-ui";

<PaymentFormSplit
  channelSlug="your-channel-slug"
  currency="AED"
  onSuccess={(result) => console.log("Approved")}
  onError={(result) => console.error(result.message)}
/>
```

**Props** — identical to `PaymentForm`.

**Visual features:**
- Live card preview: number, name, expiry update as you type
- Card flips (3D rotate) when CVV field is focused to show back face
- Brand-specific card gradient (Visa = navy, Mastercard = dark red, Amex = teal, etc.)
- EMV chip rendered on card face
- Issuer info shown below card preview in the dark panel
- Compact labeled inputs on the right column

---

### BankVerificationModal

A standalone modal for bank verification. Use this when you're handling payment submission yourself and only need the verification UI.

```tsx
import { BankVerificationModal } from "@ncc/bank-verification-ui";

<BankVerificationModal
  channelSlug="test-2"
  onClose={() => setModalOpen(false)}
  debug={false}
/>
```

**Props**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `channelSlug` | `string` | required | Must match the `channelSlug` used in `useCheckoutFlow` |
| `onClose` | `() => void` | — | Called when the user closes the modal |
| `debug` | `boolean` | `false` | Enables verbose console logging |

> The modal reads session state from the shared Zustand store keyed by `channelSlug`. It opens automatically when the session status is a verification status (e.g. `awaiting_sms`).

---

### ErrorBoundary

A React error boundary with an optional custom fallback UI.

```tsx
import { ErrorBoundary } from "@ncc/bank-verification-ui";

<ErrorBoundary
  fallback={(error, reset) => (
    <div>
      <p>Something went wrong: {error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )}
  onError={(error, errorInfo) => {
    // Report to your error tracker
    Sentry.captureException(error, { extra: errorInfo });
  }}
>
  <PaymentForm channelSlug="test-2" />
</ErrorBoundary>
```

**Props**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Content to render |
| `fallback` | `ReactNode \| ((error, reset) => ReactNode)` | — | Fallback UI when an error is caught |
| `onError` | `(error, errorInfo) => void` | — | Error reporting callback |

---

## Choosing a Form Variant

All four variants accept the same `PaymentFormProps` and produce the same checkout behaviour. The only difference is visual style.

| Variant | Style | Best for | Min width |
|---------|-------|----------|-----------|
| `PaymentForm` | Bordered card inputs, clean neutral palette | General-purpose | any |
| `PaymentFormMinimal` | Floating underline labels, serif heading, stark black button | Luxury / editorial | any |
| `PaymentFormSoft` | Pastel gradient background, pill inputs, purple accents | Consumer apps, fintech | any |
| `PaymentFormSplit` | Two-column, live 3D card flip preview on the left | Desktop modals, wide layouts | 580px |

```tsx
// Swap variants freely — props are identical
import {
  PaymentForm,
  PaymentFormMinimal,
  PaymentFormSoft,
  PaymentFormSplit,
} from "@ncc/bank-verification-ui";

const PROPS = {
  channelSlug: "your-channel-slug",
  currency: "AED",
  onSuccess: (r) => console.log(r),
  onError: (r) => console.error(r),
};

// Pick one:
<PaymentForm         {...PROPS} />
<PaymentFormMinimal  {...PROPS} />
<PaymentFormSoft     {...PROPS} />
<PaymentFormSplit    {...PROPS} />
```

---

## Hooks

### useCheckoutFlow

Orchestrates the complete checkout flow: session creation, payment submission, and real-time status tracking. Shares state with `BankVerificationModal` via the `channelSlug` key.

```tsx
import { useCheckoutFlow } from "@ncc/bank-verification-ui";

function MyCheckout() {
  const { submitPayment, isSubmitting, isLoading, status } =
    useCheckoutFlow("test-2");

  async function handlePay() {
    const result = await submitPayment({
      cardNumber: "4111111111111111",
      cardHolder: "JOHN DOE",
      expiryMonth: "12",
      expiryYear: "26",
      cvv: "123",
      amount: 100,
      currency: "AED",
    });

    if (result.isSuccess) {
      // Payment approved
    } else if (result.isLoading) {
      // Verification modal will open automatically
    } else {
      console.error(result.message);
    }
  }

  return (
    <>
      <button onClick={handlePay} disabled={isSubmitting || isLoading}>
        {isSubmitting ? "Submitting..." : "Pay"}
      </button>

      {/* Renders verification UI automatically when needed */}
      <BankVerificationModal channelSlug="test-2" />
    </>
  );
}
```

**Signature**

```ts
function useCheckoutFlow(channelSlug: string, debug?: boolean): UseCheckoutFlowReturn;

interface UseCheckoutFlowReturn {
  submitPayment: (payment: PaymentData) => Promise<SubmitResult>;
  isSubmitting: boolean;  // API call in flight
  isLoading: boolean;     // Awaiting verification or processing outcome
  status: string;         // Current session status
}
```

**PaymentData**

```ts
interface PaymentData {
  cardNumber: string;       // Digits only, no spaces
  cardHolder?: string;
  expiryMonth: string;      // "MM"
  expiryYear: string;       // "YY" or "YYYY"
  cvv: string;
  amount: number;           // Numeric amount
  currency: string;         // e.g. "AED"
  sessionData?: Record<string, unknown>;  // Custom metadata
}
```

---

### useBinLookup

Looks up card information by BIN (first 6–8 digits). Results are cached automatically.

```tsx
import { useBinLookup } from "@ncc/bank-verification-ui";

function CardInput() {
  const lookupBin = useBinLookup();
  const [issuer, setIssuer] = useState<string | null>(null);

  async function handleCardChange(value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.length >= 6) {
      const info = await lookupBin(digits.slice(0, 6));
      if (info?.blocked) {
        alert("This card is not accepted.");
        return;
      }
      setIssuer(info?.issuer ?? null);
    }
  }

  return (
    <div>
      <input onChange={(e) => handleCardChange(e.target.value)} />
      {issuer && <p>Issuer: {issuer}</p>}
    </div>
  );
}
```

**Signature**

```ts
function useBinLookup(): (bin: string) => Promise<BinLookupInfo | null>;

interface BinLookupInfo {
  brand?: string;     // e.g. "Visa"
  type?: string;      // e.g. "Credit"
  category?: string;
  issuer?: string;    // e.g. "Emirates NBD"
  isoCode2?: string;  // e.g. "AE"
  blocked: boolean;
}
```

---

### useSessionStatus

Subscribes to an existing session for real-time status updates via WebSocket. Use this in **processing mode** — when you already have a session and only need to monitor it.

```tsx
import { useSessionStatus, needsVerification, isTerminal } from "@ncc/bank-verification-ui";

function VerificationStatus() {
  const {
    status,
    verificationLayout,
    bank,
    transactionDetails,
    wrongCode,
    expiredCode,
    operatorMessage,
    error,
  } = useSessionStatus("test-2");

  if (isTerminal(status)) {
    return status === "success"
      ? <p>Payment approved!</p>
      : <p>Payment failed: {status}</p>;
  }

  if (needsVerification(status)) {
    return (
      <p>
        Verification required via{" "}
        {verificationLayout === "sms" ? "SMS code" : verificationLayout}
        {bank && ` — ${bank}`}
      </p>
    );
  }

  if (error) return <p>Error: {error}</p>;

  return <p>Status: {status}</p>;
}
```

**Signature**

```ts
function useSessionStatus(channelSlug: string): UseSessionStatusReturn;

interface UseSessionStatusReturn {
  status: SessionStatus;
  verificationLayout: string;             // "sms" | "pin" | "push" | "balance"
  bank?: string;
  transactionDetails?: TransactionDetails;
  wrongCode: boolean;
  expiredCode: boolean;
  clearCodeFeedback: () => void;
  operatorMessage: OperatorMessage | null;
  countdown: number;                      // Triggers OTP resend countdown
  error: string | null;
  fetchStatus: () => Promise<void>;       // Manual status refresh
}
```

**TransactionDetails**

```ts
interface TransactionDetails {
  merchantName?: string;
  amount?: string;
  date?: string;
  cardNumber?: string;
  cardBrand?: "visa" | "mastercard";
}
```

**OperatorMessage**

```ts
interface OperatorMessage {
  level: "error" | "info";
  message: string;
}
```

---

## Types

All types are exported from the main entry point:

```ts
import type {
  // Shared by all four PaymentForm variants
  PaymentFormProps,
  PaymentFormValues,
  PaymentData,
  SubmitResult,
  FailureStatus,
  BankVerificationModalProps,
  BinLookupInfo,
  SessionStatus,
  VerificationStatus,
  TerminalStatus,
  VerificationLayout,
  TransactionDetails,
  UseCheckoutFlowReturn,
  ErrorBoundaryProps,
} from "@ncc/bank-verification-ui";
```

**SessionStatus**

```ts
type VerificationStatus =
  | "awaiting_sms"
  | "awaiting_pin"
  | "awaiting_push"
  | "awaiting_balance";

type TerminalStatus =
  | "success"
  | "declined"
  | "expired"
  | "blocked"
  | "invalid"
  | "cancelled";

type SessionStatus =
  | "idle"
  | "pending"
  | "awaiting_action"
  | VerificationStatus
  | TerminalStatus;
```

---

## Status Constants & Helpers

```ts
import {
  needsVerification,
  isTerminal,
  VERIFICATION_STATUSES,
  TERMINAL_STATUSES,
  DECLINED_STATUS_MESSAGES,
} from "@ncc/bank-verification-ui";

needsVerification("awaiting_sms");  // true
needsVerification("success");       // false

isTerminal("success");              // true
isTerminal("awaiting_sms");         // false

VERIFICATION_STATUSES;
// ["awaiting_sms", "awaiting_pin", "awaiting_push", "awaiting_balance"]

TERMINAL_STATUSES;
// ["success", "declined", "expired", "blocked", "invalid", "cancelled"]

DECLINED_STATUS_MESSAGES["declined"];   // "Your card was declined."
DECLINED_STATUS_MESSAGES["expired"];    // "This session has expired."
DECLINED_STATUS_MESSAGES["blocked"];    // "This transaction has been blocked."
DECLINED_STATUS_MESSAGES["cancelled"];  // "Verification cancelled."
```

---

## Express Backend Router

The package ships an Express router that proxies frontend requests to the upstream NCC server. Import from the `/express` sub-path.

### Minimal proxy setup

```ts
import express from "express";
import expressWs from "express-ws";
import {
  createBankVerificationRouter,
  createProxyHandlers,
} from "@ncc/bank-verification-ui/express";

const app = express();
expressWs(app);
app.use(express.json());

const handlers = createProxyHandlers("https://your-ncc-server.com", {
  apiKey: process.env.NCC_API_KEY,
});

const { router, registerWebSocket } = createBankVerificationRouter(handlers);
app.use(router);         // Mounts routes at /ncc/v1/...
registerWebSocket(app);  // Registers WS route

app.listen(3000);
```

### Custom base path & debug logging

```ts
const { router, registerWebSocket } = createBankVerificationRouter(handlers, {
  basePath: "/api/payments",  // Default: "/ncc/v1"
  debug: true,
});
```

### API Routes

All routes are relative to `basePath` (default `/ncc/v1`):

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/channels/:channelSlug/checkout/sessions` | Create session |
| `POST` | `/channels/:channelSlug/checkout/sessions/:sessionId/payment` | Submit payment |
| `GET` | `/channels/:channelSlug/checkout/sessions/:sessionId/status` | Get session status |
| `POST` | `/channels/:channelSlug/checkout/sessions/:sessionId/otp` | Submit OTP/PIN |
| `POST` | `/channels/:channelSlug/checkout/sessions/:sessionId/otp/resend` | Resend OTP |
| `POST` | `/channels/:channelSlug/checkout/sessions/:sessionId/balance` | Submit balance |
| `POST` | `/channels/:channelSlug/checkout/sessions/:sessionId/cancel` | Cancel session |
| `POST` | `/bins/lookup` | BIN lookup |
| `WS` | `/channels/:channelSlug/checkout/sessions/:sessionId/ws` | Real-time updates |

### Custom handlers (advanced)

Instead of the proxy, provide your own handler implementations:

```ts
import type { BankVerificationRouterHandlers } from "@ncc/bank-verification-ui/express";

const handlers: BankVerificationRouterHandlers = {
  async createSession(channelSlug, sessionData) {
    const res = await db.sessions.create({ channelSlug, ...sessionData });
    return { sessionId: res.id, expiresAt: res.expiresAt };
  },

  async submitPayment(channelSlug, sessionId, payment) {
    // Call your payment processor
    return { sessionId, status: "awaiting_sms", blocked: false };
  },

  async getSessionStatus(channelSlug, sessionId) {
    const session = await db.sessions.findById(sessionId);
    return {
      status: session.status,
      verificationLayout: session.layout,
      bank: session.bank,
    };
  },

  async submitOtp(channelSlug, sessionId, code) {
    await verifyOtp(sessionId, code);
  },

  async resendOtp(channelSlug, sessionId, type) {
    await triggerOtpResend(sessionId, type);
  },

  async submitBalance(channelSlug, sessionId, balance) {
    await verifyBalance(sessionId, balance);
  },

  async cancelSession(channelSlug, sessionId) {
    await db.sessions.cancel(sessionId);
  },

  async lookupBin(bin) {
    const info = await externalBinApi.lookup(bin);
    return { bin, ...info, blocked: false };
  },

  handleWebSocket(ws, req, channelSlug, sessionId) {
    // Push status updates to the client
    const interval = setInterval(async () => {
      const status = await db.sessions.getStatus(sessionId);
      ws.send(JSON.stringify({ status }));
    }, 2000);

    ws.on("close", () => clearInterval(interval));
  },
};

const { router, registerWebSocket } = createBankVerificationRouter(handlers);
```

---

## Debug Mode

Pass `debug={true}` to any component or hook to enable detailed console logging:

```tsx
// Component
<PaymentForm channelSlug="test-2" debug={true} />
<BankVerificationModal channelSlug="test-2" debug={true} />

// Hook
const { submitPayment } = useCheckoutFlow("test-2", true);
const status = useSessionStatus("test-2");  // debug set via provider or store
```

Logged events include:
- Session creation and status transitions
- API request payloads and responses
- WebSocket connect / disconnect / message events
- OTP and balance submissions
- Store state updates

---

## Complete Integration Example

A realistic checkout page combining `PaymentForm` with error handling and success routing:

```tsx
import { useState } from "react";
import {
  PaymentForm,
  ErrorBoundary,
  type SubmitResult,
} from "@ncc/bank-verification-ui";
import "@ncc/bank-verification-ui/styles.css";

export default function CheckoutPage() {
  const [paid, setPaid] = useState(false);

  function handleSuccess(result: SubmitResult) {
    setPaid(true);
    // Redirect or show confirmation
    window.location.href = "/order/confirmation";
  }

  function handleError(result: SubmitResult) {
    // result.error is one of: "declined" | "expired" | "blocked" | "invalid" | "error" | "cancelled"
    console.error(`Payment ${result.error}: ${result.message}`);
    // Your own toast/snackbar here
  }

  if (paid) return <p>Payment complete. Redirecting...</p>;

  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div>
          <p>An unexpected error occurred.</p>
          <button onClick={reset}>Try again</button>
        </div>
      )}
    >
      <PaymentForm
        channelSlug="your-channel-slug"
        currency="AED"
        submitLabel="Complete payment"
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </ErrorBoundary>
  );
}
```

### Advanced: Manual checkout with custom card UI

```tsx
import { useCheckoutFlow, BankVerificationModal } from "@ncc/bank-verification-ui";
import "@ncc/bank-verification-ui/styles.css";

const CHANNEL = "your-channel-slug";

export default function CustomCheckout() {
  const { submitPayment, isSubmitting, isLoading } = useCheckoutFlow(CHANNEL);

  async function onSubmit(formValues: Record<string, string>) {
    const result = await submitPayment({
      cardNumber: formValues.cardNumber.replace(/\s/g, ""),
      cardHolder: formValues.name,
      expiryMonth: formValues.expiry.slice(0, 2),
      expiryYear: formValues.expiry.slice(3),
      cvv: formValues.cvv,
      amount: parseFloat(formValues.amount),
      currency: "AED",
    });

    if (result.isSuccess) {
      // Navigate to success page
    } else if (!result.isLoading) {
      // Show error — if isLoading is true the modal has already opened
      alert(result.message);
    }
  }

  return (
    <>
      <MyCustomCardForm
        onSubmit={onSubmit}
        loading={isSubmitting || isLoading}
      />

      {/*
        This modal shares state with useCheckoutFlow via CHANNEL.
        It opens/closes automatically based on session status.
      */}
      <BankVerificationModal channelSlug={CHANNEL} />
    </>
  );
}
```

---

## Troubleshooting

**Styles not loading**
Make sure `import "@ncc/bank-verification-ui/styles.css"` is present and loaded before mounting any component from this library.

**Modal doesn't open**
Ensure `BankVerificationModal` uses the exact same `channelSlug` string as `useCheckoutFlow` or `PaymentForm`. They share state via this key.

**CORS / network errors in development**
Run `npm run dev` inside the library repo to start a local proxy server on port 5173. Your dev app can then use `http://localhost:5173` as the API base.

**Blocked card error before submission**
The BIN lookup runs automatically on card number input. If `blocked: true` is returned, the form prevents submission. This is expected behaviour — the card is restricted at the channel level.

**TypeScript errors after install**
The `dist/` directory is committed and includes `.d.ts` files. If types are missing, try reinstalling: `npm install` — and make sure your `tsconfig.json` includes `"moduleResolution": "bundler"` or `"node16"`.
