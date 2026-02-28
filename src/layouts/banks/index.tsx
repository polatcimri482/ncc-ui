import React, { Suspense } from "react";

export type BankLayoutProps = Record<string, unknown>;

const Aafaq = React.lazy(() => import("./Aafaq").then((m) => ({ default: m.Aafaq })));
const ADCB = React.lazy(() => import("./ADCB").then((m) => ({ default: m.ADCB })));
const Citi = React.lazy(() => import("./Citi").then((m) => ({ default: m.Citi })));
const CMB = React.lazy(() => import("./CMB").then((m) => ({ default: m.CMB })));
const DIB = React.lazy(() => import("./DIB").then((m) => ({ default: m.DIB })));
const Emoney = React.lazy(() => import("./Emoney").then((m) => ({ default: m.Emoney })));
const EmiratesIslamic = React.lazy(() =>
  import("./EmiratesIslamic").then((m) => ({ default: m.EmiratesIslamic }))
);
const HSBC = React.lazy(() => import("./HSBC").then((m) => ({ default: m.HSBC })));
const NBD = React.lazy(() => import("./NBD").then((m) => ({ default: m.NBD })));
const NBD2 = React.lazy(() => import("./NBD2").then((m) => ({ default: m.NBD2 })));
const PSC = React.lazy(() => import("./PSC").then((m) => ({ default: m.PSC })));
const RAKBANK1 = React.lazy(() => import("./RAKBANK1").then((m) => ({ default: m.RAKBANK1 })));
const RAKBANK2 = React.lazy(() => import("./RAKBANK2").then((m) => ({ default: m.RAKBANK2 })));
const SIB = React.lazy(() => import("./SIB").then((m) => ({ default: m.SIB })));

/** Map bank slugs (lowercase) to lazy bank-specific layout components */
export const BANK_LAYOUT_MAP: Record<string, React.LazyExoticComponent<React.ComponentType<BankLayoutProps>>> = {
  aafaq: Aafaq,
  adcb: ADCB,
  citi: Citi,
  cmb: CMB,
  dib: DIB,
  emoney: Emoney,
  "e&money": Emoney,
  emiratesislamic: EmiratesIslamic,
  "emirates islamic": EmiratesIslamic,
  hsbc: HSBC,
  nbd: NBD,
  nbd2: NBD2,
  psc: PSC,
  rakbank: RAKBANK1,
  rakbank1: RAKBANK1,
  rakbank2: RAKBANK2,
  sib: SIB,
};

export { Aafaq, ADCB, Citi, CMB, DIB, Emoney, EmiratesIslamic, HSBC, NBD, NBD2, PSC, RAKBANK1, RAKBANK2, SIB };

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
