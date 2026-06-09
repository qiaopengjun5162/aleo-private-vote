"use client";

import { AleoWalletConnectors, DynamicWaasAleoConnectors } from "@dynamic-labs/aleo";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import type { ReactNode } from "react";

export function DynamicAleoProviderInner({
  children,
  environmentId
}: {
  children: ReactNode;
  environmentId: string;
}) {
  return (
    <DynamicContextProvider
      settings={{
        appName: "Aleo Private Vote",
        environmentId,
        shadowDOMEnabled: true,
        walletConnectors: [DynamicWaasAleoConnectors, AleoWalletConnectors]
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}
