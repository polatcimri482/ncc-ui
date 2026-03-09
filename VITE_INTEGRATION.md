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
  const { submitPayment, binLookup } = useCheckoutFlow();

  const handleSubmit = async () => {
    const result = await submitPayment(paymentData);
    if (!result.isSuccess) {
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
