"use client";

import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { ChevronRight, KeyRound } from "lucide-react";

function formatAddress(address: string) {
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

export function EmbeddedWalletOptionInner({ onOpen }: { onOpen: () => void }) {
  const { primaryWallet, setShowAuthFlow } = useDynamicContext();
  const address = primaryWallet?.address;

  return (
    <button
      className="flex w-full items-center justify-between gap-4 rounded-md border border-stone-950 bg-white p-4 text-left shadow-[4px_4px_0_#1c1917] transition hover:-translate-y-0.5 hover:bg-[#d9ff65]"
      onClick={() => {
        setShowAuthFlow(true);
        onOpen();
      }}
      type="button"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-stone-950 bg-[#d9ff65]">
          <KeyRound size={20} />
        </span>
        <span className="min-w-0">
          <strong className="block text-base">Dynamic</strong>
          <span className="block text-sm font-bold text-stone-600">
            {address ? `Embedded wallet ${formatAddress(address)}` : "Create or connect an embedded wallet"}
          </span>
        </span>
      </span>
      <ChevronRight size={18} />
    </button>
  );
}
