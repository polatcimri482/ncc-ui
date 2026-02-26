# @ncc/bank-ui

Bank verification UI and hooks for checkout flows. Minimal package with no Tailwind or modal dependencies.

## Exports

| Export | Description |
|--------|-------------|
| `configureBankUI` | Set API base URL. Call once at app startup before using bank components or hooks. |
| `BankVerification` | Ready-made verification page component (SMS OTP, PIN, push, balance layouts). |
| `useSessionStatus` | Hook for checkout pages to consume verification status, layout, redirects, and errors. |
| `BankConfig` | Type for configuration. |
| `BankVerificationProps` | Props type for `BankVerification`. |

## Setup

Import the CSS once in your app (e.g. in your root layout or `main.tsx`):

```ts
import "@ncc/bank-ui/styles.css";
```

Then configure the API base:

```ts
import { configureBankUI } from "@ncc/bank-ui";

configureBankUI({ apiBase: "https://api.example.com" });
```

## Usage

### Verification page component

```tsx
import { BankVerification } from "@ncc/bank-ui";

<BankVerification
  channelSlug="sms"
  sessionId={sessionId}
  onSuccess={(id) => navigate("/success")}
  onDeclined={(id, status) => navigate("/declined")}
  onRedirect={(url) => window.location.assign(url)}
/>
```

### Custom hook (checkout pages)

Use `useSessionStatus` when you need to control UI yourself:

```tsx
import { useSessionStatus } from "@ncc/bank-ui";

function CheckoutPage({ channelSlug, sessionId }) {
  const {
    status,
    verificationLayout,
    redirectUrl,
    wrongCode,
    clearWrongCode,
    operatorMessage,
    error,
    refetch,
  } = useSessionStatus(channelSlug, sessionId);

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
- **Tailwind removed.** Components use CSS files; import `@ncc/bank-ui/styles.css` in your app.
- **Layout/shared exports removed.** Only `BankVerification`, `useSessionStatus`, and config/types are exported.
- **zustand removed.** Config is plain module state.
- **react-dom** is no longer a peer dependency (only `react` is required).
