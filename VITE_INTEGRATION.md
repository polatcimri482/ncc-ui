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

```tsx
import { BankVerificationModal } from "@ncc/bank-verification-ui";
import "@ncc/bank-verification-ui/styles.css";

// Basic usage
<BankVerificationModal
  open={open}
  onClose={() => setOpen(false)}
  apiBase="https://api.example.com"
  channelSlug="channel"
  sessionId={sessionId}
/>

// With debug mode (logs session status, WebSocket events, OTP/balance submissions to console)
<BankVerificationModal debug={true} open={...} onClose={...} apiBase={...} channelSlug={...} sessionId={...} />
```
