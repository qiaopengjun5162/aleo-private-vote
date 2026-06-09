import { WalletReadyState } from "@provablehq/aleo-wallet-standard";

export type WalletOption = {
  name: string;
  readyState: WalletReadyState;
  url?: string;
};

export const defaultWallets: WalletOption[] = [
  {
    name: "Leo Wallet",
    readyState: WalletReadyState.NOT_DETECTED,
    url: "https://app.leo.app"
  },
  {
    name: "Shield Wallet",
    readyState: WalletReadyState.NOT_DETECTED,
    url: "https://www.shield.app/"
  },
  {
    name: "Puzzle Wallet",
    readyState: WalletReadyState.NOT_DETECTED,
    url: "https://puzzle.online/wallet"
  },
  {
    name: "Fox Wallet",
    readyState: WalletReadyState.NOT_DETECTED,
    url: "https://foxwallet.com/download"
  }
];

export function isReadyWallet(wallet: Pick<WalletOption, "readyState">) {
  return wallet.readyState === WalletReadyState.INSTALLED || wallet.readyState === WalletReadyState.LOADABLE;
}

export function mergeWalletOptions(detectedWallets: WalletOption[]) {
  return defaultWallets.map((wallet) => detectedWallets.find((item) => item.name === wallet.name) ?? wallet);
}
