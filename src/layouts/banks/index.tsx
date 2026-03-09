import React, { Suspense } from "react";
import type { BankVerificationProps } from "../../types";

const NBD2 = React.lazy(() => import("./verification-ui").then((m) => ({ default: m.VerificationUi })));

/** Map bank slugs (lowercase) to lazy bank-specific layout components */
export const BANK_LAYOUT_MAP: Record<string, React.LazyExoticComponent<React.ComponentType<BankVerificationProps>>> = {
  nbd2: NBD2,
};

interface BankLayoutProps extends BankVerificationProps {
  bank: string;
  fallback?: React.ReactNode;
}

/** Renders a bank layout by slug with Suspense. */
export function BankLayout({ bank, fallback = null, ...props }: BankLayoutProps) {
  const Layout = BANK_LAYOUT_MAP[bank.toLowerCase()];
  if (!Layout) return null;
  return (
    <Suspense fallback={fallback}>
      <Layout {...props} />
    </Suspense>
  );
}
