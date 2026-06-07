import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aleo Private Vote",
  description: "A privacy-preserving Aleo voting DApp MVP."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
