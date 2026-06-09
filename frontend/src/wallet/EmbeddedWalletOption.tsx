"use client";

import dynamic from "next/dynamic";
import { ChevronRight, KeyRound } from "lucide-react";
import { dynamicEmbeddedWalletEnabled } from "@/wallet/DynamicAleoProvider";

const EmbeddedWalletOptionInner = dynamic(
  () => import("@/wallet/EmbeddedWalletOptionInner").then((module) => module.EmbeddedWalletOptionInner),
  {
    ssr: false
  }
);

export function EmbeddedWalletOption({ onOpen }: { onOpen: () => void }) {
  if (!dynamicEmbeddedWalletEnabled) {
    return (
      <button
        className="flex w-full cursor-not-allowed items-center justify-between gap-4 rounded-md border border-stone-950 bg-stone-100 p-4 text-left opacity-70"
        disabled
        type="button"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-stone-950 bg-white">
            <KeyRound size={20} />
          </span>
          <span className="min-w-0">
            <strong className="block text-base">Dynamic</strong>
            <span className="block text-sm font-bold text-stone-600">
              Embedded wallet requires NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID
            </span>
          </span>
        </span>
        <ChevronRight size={18} />
      </button>
    );
  }

  return <EmbeddedWalletOptionInner onOpen={onOpen} />;
}
