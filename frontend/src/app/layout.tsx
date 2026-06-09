import type { Metadata } from "next";
import { LeoWalletProvider } from "@/wallet/LeoWalletProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aleo Private Vote",
  description: "A privacy-preserving Aleo voting DApp with Leo Wallet connection."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <LeoWalletProvider>{children}</LeoWalletProvider>
      </body>
    </html>
  );
}
