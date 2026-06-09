"use client";

import dynamic from "next/dynamic";
import { dynamicEmbeddedWalletEnabled } from "@/wallet/DynamicAleoProvider";

const EmbeddedWalletButtonInner = dynamic(
  () => import("@/wallet/EmbeddedWalletButtonInner").then((module) => module.EmbeddedWalletButtonInner),
  {
    ssr: false
  }
);

export function EmbeddedWalletButton() {
  if (!dynamicEmbeddedWalletEnabled) {
    return null;
  }

  return <EmbeddedWalletButtonInner />;
}
