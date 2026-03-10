import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type {
  BankVerificationStore,
  BankVerificationStoreApi,
} from "../store/bank-verification-store";

/**
 * Internal React context that holds the zustand store for the verification UI tree.
 * Provided by BankVerificationModal (and any other self-contained entry-point components).
 */
export const BankVerificationStoreContext =
  createContext<BankVerificationStoreApi | null>(null);

export function useBankVerificationStoreApi(): BankVerificationStoreApi {
  const store = useContext(BankVerificationStoreContext);
  if (!store) {
    throw new Error(
      "useBankVerificationStoreApi must be used within BankVerificationModal",
    );
  }
  return store;
}

export function useBankVerificationStore<T>(
  selector: (state: BankVerificationStore) => T,
): T {
  return useStore(useBankVerificationStoreApi(), selector);
}
