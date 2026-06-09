import type { Metadata } from "next";
import { AleoWalletProvider } from "@/wallet/AleoWalletProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aleo Private Vote",
  description: "A privacy-preserving Aleo voting DApp with Aleo wallet connection."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AleoWalletProvider>{children}</AleoWalletProvider>
      </body>
    </html>
  );
}
