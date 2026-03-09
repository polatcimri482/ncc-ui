import React, { Suspense } from "react";

const NBD2 = React.lazy(() => import("./verification-ui").then((m) => ({ default: m.VerificationUi })));

/** Map bank slugs (lowercase) to lazy bank-specific layout components. Layouts require BankVerificationProvider. */
export const BANK_LAYOUT_MAP: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  nbd2: NBD2,
};

interface BankLayoutProps {
  bank: string;
  fallback?: React.ReactNode;
}

/** Renders a bank layout by slug with Suspense. Must be used within BankVerificationProvider. */
export function BankLayout({ bank, fallback = null }: BankLayoutProps) {
  const Layout = BANK_LAYOUT_MAP[bank.toLowerCase()];
  if (!Layout) return null;
  return (
    <Suspense fallback={fallback}>
      <Layout />
    </Suspense>
  );
}
