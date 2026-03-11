# @ncc/bank-verification-ui — Manual

---

## 1. Installation

```json
{
  "dependencies": {
    "@ncc/bank-verification-ui": "github:polatcimri482/ncc-ui#main"
  }
}
```

Local monorepo:

```json
"@ncc/bank-verification-ui": "file:../bank-verification-ui"
```

---

## 2. Required Dependency Versions

These must match exactly in every consumer project. Express version mismatches silently break WebSocket.

| Package | Version |
|---------|---------|
| `express` | `^4.18.0` (**not** 5.x) |
| `express-ws` | `^5.0.0` |
| `react` / `react-dom` | `^18.0.0` |
| `vite` | `^5.4.0`, `^6.0.0`, or `^7.0.0` |

---

## 3. Server Setup

Copy this pattern exactly. The order matters — wrong ordering silently breaks WebSocket.

```ts
// server/index.ts
import http from "http";
import express from "express";
import expressWs from "express-ws";
import { createServer as createViteServer } from "vite";
import {
  createBankVerificationRouter,
  createProxyHandlers,
} from "@ncc/bank-verification-ui/express";

const app = express();

// 1. Create httpServer explicitly — must pass BOTH to expressWs
const httpServer = http.createServer(app);
expressWs(app, httpServer);

app.use(express.json());

// 2. NCC router + WebSocket BEFORE Vite
const handlers = createProxyHandlers(
  process.env.NCC_UPSTREAM ?? "https://your-ncc-server.com",
  {
    apiKey: process.env.NCC_API_KEY,  // optional
    // debug: true,                   // logs all proxy traffic
  }
);
const { router, registerWebSocket } = createBankVerificationRouter(handlers);
app.use(router);
registerWebSocket(app);

// 3. Vite — share httpServer via middlewareMode object (not middlewareMode:true)
const vite = await createViteServer({
  server: { middlewareMode: { server: httpServer } },
});
app.use(vite.middlewares);

httpServer.listen(Number(process.env.PORT ?? 5000), () => {
  console.log(`Server running on port ${process.env.PORT ?? 5000}`);
});
```

### Rules

| Rule | Why |
|------|-----|
| `expressWs(app, httpServer)` — pass both | Without `httpServer`, WS upgrades are missed |
| NCC routes before `app.use(vite.middlewares)` | Vite's catch-all swallows unmatched requests |
| `middlewareMode: { server: httpServer }` | Prevents Vite from competing for upgrade events |
| Express `^4.x` only | Express 5 is not supported |

### Environment variables

| Variable | Description |
|----------|-------------|
| `NCC_UPSTREAM` | Base URL of the NCC backend (e.g. `https://your-server.com`) |
| `NCC_API_KEY` | API key passed as `X-API-Key` header to upstream |
| `PORT` | Server port (default `5000`) |

---

## 4. CSS

Import once at the top level of your app:

```ts
import "@ncc/bank-verification-ui/styles.css";
```

---

## 5. Payment Form Components

All four form variants share the same props. Pick the one that matches your design.

| Component | Style |
|-----------|-------|
| `PaymentForm` | Standard card form |
| `PaymentFormMinimal` | Minimalist, editorial (floating labels, serif heading) |
| `PaymentFormSoft` | Soft pastel gradient, rounded pill inputs |
| `PaymentFormSplit` | Two-column with live 3D card preview (min 580px wide) |

### Props (all variants)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `channelSlug` | `string` | **required** | Channel identifier — must match your NCC server config |
| `currency` | `string` | `"AED"` | Currency code shown in the form |
| `defaultValues` | `Partial<PaymentFormValues>` | — | Pre-fill any form fields |
| `showAmount` | `boolean` | `true` | Set to `false` to hide the amount field (fixed price). Requires `defaultValues.amount`. |
| `submitLabel` | `string` | `"Pay now"` | Text on the submit button |
| `onSuccess` | `(result: SubmitResult) => void` | — | Called when payment is approved |
| `onError` | `(result: SubmitResult) => void` | — | Called when payment fails or is declined |
| `debug` | `boolean` | `false` | Shows a floating debug panel with WS status and session state |

### PaymentFormValues

```ts
interface PaymentFormValues {
  cardNumber: string;   // "4111 1111 1111 1111"
  cardHolder: string;   // "JOHN DOE"
  expiryMonth: string;  // "12"
  expiryYear: string;   // "26"
  cvv: string;          // "123"
  amount: string;       // "250.00"
}
```

### SubmitResult

```ts
interface SubmitResult {
  isSuccess: boolean;
  error?: "declined" | "expired" | "blocked" | "invalid" | "error" | "cancelled";
  message?: string;
}
```

---

## 6. Usage Examples

### Basic form

```tsx
import { PaymentForm } from "@ncc/bank-verification-ui";
import "@ncc/bank-verification-ui/styles.css";

export default function CheckoutPage() {
  return (
    <PaymentForm
      channelSlug="your-channel"
      currency="GBP"
      onSuccess={() => router.push("/success")}
      onError={(result) => toast.error(result.message ?? "Payment failed")}
    />
  );
}
```

### Fixed price (amount not shown to user)

```tsx
<PaymentForm
  channelSlug="your-channel"
  currency="GBP"
  showAmount={false}
  defaultValues={{ amount: "0.00" }}
  submitLabel="Verify Card & Confirm"
  onSuccess={() => setStep("confirmed")}
  onError={(result) => setError(result.message)}
/>
```

### Split layout with pre-filled card

```tsx
import { PaymentFormSplit } from "@ncc/bank-verification-ui";

<PaymentFormSplit
  channelSlug="your-channel"
  currency="USD"
  defaultValues={{
    cardHolder: currentUser.name,
    amount: order.total,
  }}
  onSuccess={() => setPaymentState("success")}
  onError={(result) => setPaymentState("error")}
/>
```

### Debug mode (development only)

```tsx
<PaymentForm
  channelSlug="your-channel"
  currency="AED"
  debug={process.env.NODE_ENV === "development"}
  onSuccess={handleSuccess}
  onError={handleError}
/>
```

The debug panel shows live WebSocket connection status (`connecting` → `connected` / `polling`), session ID, current status, and all incoming events.
