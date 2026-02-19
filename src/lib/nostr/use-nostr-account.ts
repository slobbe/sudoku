import { useContext } from "react";
import { NostrAccountContext } from "./account-context";

export function useNostrAccount() {
  const context = useContext(NostrAccountContext);
  if (!context) {
    throw new Error("useNostrAccount must be used within NostrAccountProvider.");
  }

  return context;
}
