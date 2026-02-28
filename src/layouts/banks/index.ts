import React from "react";
import { Aafaq } from "./Aafaq";
import { ADCB } from "./ADCB";
import { Citi } from "./Citi";
import { CMB } from "./CMB";
import { DIB } from "./DIB";
import { Emoney } from "./Emoney";
import { EmiratesIslamic } from "./EmiratesIslamic";
import { HSBC } from "./HSBC";
import { NBD } from "./NBD";
import { NBD2 } from "./NBD2";
import { PSC } from "./PSC";
import { RAKBANK1 } from "./RAKBANK1";
import { RAKBANK2 } from "./RAKBANK2";
import { SIB } from "./SIB";

export type BankLayoutProps = Record<string, unknown>;

export { Aafaq, ADCB, Citi, CMB, DIB, Emoney, EmiratesIslamic, HSBC, NBD, NBD2, PSC, RAKBANK1, RAKBANK2, SIB };

/** Map bank slugs (lowercase) to bank-specific layout components */
export const BANK_LAYOUT_MAP: Record<string, React.ComponentType<BankLayoutProps>> = {
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
