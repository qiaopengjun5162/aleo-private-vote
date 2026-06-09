"use client";

import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatAddress(address: string) {
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

export function EmbeddedWalletButtonInner() {
  const { primaryWallet, setShowAuthFlow } = useDynamicContext();
  const address = primaryWallet?.address;

  return (
    <Button onClick={() => setShowAuthFlow(true)} type="button" variant="outline">
      <KeyRound size={16} />
      {address ? formatAddress(address) : "Embedded Aleo wallet"}
    </Button>
  );
}
