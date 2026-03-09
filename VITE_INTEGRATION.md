# Vite Integration

This package works with Vite (5.x, 6.x, 7.x) apps.

## Installation (GitHub)

This package is hosted on GitHub, not npm. Add it as a dependency:

```json
{
  "dependencies": {
    "@ncc/bank-verification-ui": "github:polatcimri482/ncc-ui#main"
  }
}
```

If this package lives in a subdirectory of the repo:

```json
"@ncc/bank-verification-ui": "git+https://github.com/polatcimri482/ncc-ui.git#main?subdir=bank-verification-ui"
```

**Recommendations:**

- **Pin to a tag** for production (e.g. `#v0.1.0` instead of `#main`) so installs stay reproducible.

> For local monorepos: use `file:../bank-verification-ui` (or the relative path to this package).

## Usage

Wrap your checkout area with `BankVerificationProvider`. Use `useCheckoutFlow()` and `BankVerificationModal` inside it. Modal visibility and session reset are handled internally.

```tsx
import {
  BankVerificationProvider,
  BankVerificationModal,
  useCheckoutFlow,
} from "@ncc/bank-verification-ui";
import "@ncc/bank-verification-ui/styles.css";

function CheckoutPage() {
  return (
    <BankVerificationProvider
      channelSlug="your-channel"
      debug={false}
    >
      <CheckoutContent />
    </BankVerificationProvider>
  );
}

function CheckoutContent() {
  const { submitPayment, isLoading, status } = useCheckoutFlow();

  const handleSubmit = async () => {
    const result = await submitPayment(paymentData);
    if (result.isSuccess) {
      // done
    } else if (result.isLoading) {
      // Modal opens; use isLoading and status for loading UI
    } else {
      showError(result.message);
    }
  };

  return (
    <>
      {/* Your checkout form */}
      <BankVerificationModal />
    </>
  );
}
```

With `debug={true}` on the provider, logs session status, WebSocket events, and OTP/balance submissions to the console.

## Backend: Express Router

For same-origin setups, add the Express router to proxy NCC API requests:

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

const handlers = createProxyHandlers("https://srv1462130.hstgr.cloud");
const { router, registerWebSocket } = createBankVerificationRouter(handlers);
app.use(router);
registerWebSocket(app);
```

Routes: `/ncc/v1/channels/...`, `/ncc/v1/bins/lookup`, WebSocket at `/ncc/v1/.../ws`. Requires `express` and `express-ws`.

### Local Testing

From this package, run `npm run dev` or `npm run dev:mock`. Preview app and NCC API run together on http://localhost:5173. Default proxies to upstream; `dev:mock` uses mock handlers (offline).
