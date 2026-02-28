import React, { Suspense } from "react";

export type BankLayoutProps = Record<string, unknown>;

const NBD2 = React.lazy(() => import("./NBD2").then((m) => ({ default: m.NBD2 })));

/** Map bank slugs (lowercase) to lazy bank-specific layout components */
export const BANK_LAYOUT_MAP: Record<string, React.LazyExoticComponent<React.ComponentType<BankLayoutProps>>> = {
  nbd2: NBD2,
};

export { NBD2 };

export interface BankLayoutComponentProps extends BankLayoutProps {
  bank: string;
  fallback?: React.ReactNode;
}

/** Renders a bank layout by slug with Suspense. Use when consuming BANK_LAYOUT_MAP to avoid manual Suspense. */
export function BankLayout({ bank, fallback = null, ...props }: BankLayoutComponentProps) {
  const Layout = bank ? BANK_LAYOUT_MAP[bank.toLowerCase()] : null;
  if (!Layout) return null;
  return (
    <Suspense fallback={fallback}>
      <Layout {...props} />
    </Suspense>
  );
}
