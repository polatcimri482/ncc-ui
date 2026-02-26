# @ncc/bank-verification-ui

Bank verification UI and hooks for checkout flows. Minimal package with no Tailwind or modal dependencies.

## Exports

| Export | Description |
|--------|-------------|
| `BankVerification` | Ready-made verification page component (SMS OTP, PIN, push, balance layouts). |
| `useSessionStatus` | Hook for checkout pages to consume verification status, layout, redirects, and errors. |
| `BankConfig` | Type for configuration (apiBase). |
| `BankVerificationProps` | Props type for `BankVerification`. |

## Setup

Import the CSS once in your app (e.g. in your root layout or `main.tsx`):

```ts
import "@ncc/bank-verification-ui/styles.css";
```

## Usage

### Verification page component

Pass `apiBase` as a prop (no global configuration needed):

```tsx
import { BankVerification } from "@ncc/bank-verification-ui";

<BankVerification
  apiBase="https://api.example.com"
  channelSlug="sms"
  sessionId={sessionId}
  onSuccess={(id) => navigate("/success")}
  onDeclined={(id, status) => navigate("/declined")}
  onRedirect={(url) => window.location.assign(url)}
/>
```

### Custom hook (checkout pages)

Use `useSessionStatus` when you need to control UI yourself. Pass `apiBase` as the first argument:

```tsx
import { useSessionStatus } from "@ncc/bank-verification-ui";

function CheckoutPage({ apiBase, channelSlug, sessionId }) {
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

  if (redirectUrl) window.location.assign(redirectUrl);
  if (status === "success") return <SuccessScreen />;
  if (["declined", "expired", "blocked"].includes(status)) return <DeclinedScreen />;

  return (
    <YourCustomLayout
      layout={verificationLayout}
      wrongCode={wrongCode}
      onTryAgain={clearWrongCode}
      operatorMessage={operatorMessage}
    />
  );
}
```

## Breaking changes (v0.1.0)

- **BankModal removed.** Use `BankVerification` directly on your page or route.
- **Tailwind removed.** Components use CSS files; import `@ncc/bank-verification-ui/styles.css` in your app.
- **Layout/shared exports removed.** Only `BankVerification`, `useSessionStatus`, and config/types are exported.
- **zustand removed.** Config was plain module state; now `apiBase` is passed as props.
- **configureBankUI removed.** Pass `apiBase` to `BankVerification` and `useSessionStatus` instead.
- **react-dom** is no longer a peer dependency (only `react` is required).
