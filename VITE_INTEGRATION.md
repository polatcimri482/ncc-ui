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

Wrap your checkout area with `BankVerificationProvider`. Use `useCheckoutFlow` (no args) and `BankVerificationModal` inside it. Session state lives in localStorage; call `resetSession()` in `onClose` to clear when the modal closes.

```tsx
import {
  BankVerificationProvider,
  BankVerificationModal,
  useCheckoutFlow,
} from "@ncc/bank-verification-ui";
import "@ncc/bank-verification-ui/styles.css";

function CheckoutPage() {
  const closeHandlerRef = React.useRef<(() => void) | null>(null);
  return (
    <BankVerificationProvider
      channelSlug="your-channel"
      debug={false}
      onSuccess={(sid) => { /* ... */ }}
      onFailed={(status, sid) => { /* ... */ }}
      closeHandlerRef={closeHandlerRef}
    >
      <CheckoutContent closeHandlerRef={closeHandlerRef} />
    </BankVerificationProvider>
  );
}

function CheckoutContent({ closeHandlerRef }: { closeHandlerRef: React.MutableRefObject<(() => void) | null> }) {
  const [open, setOpen] = React.useState(false);
  const { sessionId, resetSession, submitPayment, binLookup } = useCheckoutFlow({
    onNeedsVerification: () => setOpen(true),
    onSuccess: (sid) => { /* ... */ },
    onFailed: (status, sid) => { /* ... */ },
  });

  const handleClose = () => {
    resetSession();
    setOpen(false);
  };

  React.useEffect(() => {
    closeHandlerRef.current = handleClose;
    return () => { closeHandlerRef.current = null; };
  }, [handleClose, closeHandlerRef]);

  return (
    <>
      {/* Your checkout form */}
      <BankVerificationModal open={open} onClose={handleClose} />
    </>
  );
}
```

With `debug={true}` on the provider, logs session status, WebSocket events, and OTP/balance submissions to the console.
