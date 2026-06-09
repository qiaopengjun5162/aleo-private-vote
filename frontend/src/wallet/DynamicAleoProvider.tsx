"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const dynamicEnvironmentId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;

export const dynamicEmbeddedWalletEnabled = Boolean(dynamicEnvironmentId);

const DynamicAleoProviderInner = dynamic(
  () => import("@/wallet/DynamicAleoProviderInner").then((module) => module.DynamicAleoProviderInner),
  {
    ssr: false
  }
);

export function DynamicAleoProvider({ children }: { children: ReactNode }) {
  if (!dynamicEnvironmentId) {
    return <>{children}</>;
  }

  return <DynamicAleoProviderInner environmentId={dynamicEnvironmentId}>{children}</DynamicAleoProviderInner>;
}
