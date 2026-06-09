import { WalletReadyState } from "@provablehq/aleo-wallet-standard";
import { describe, expect, it } from "vitest";
import { isReadyWallet, mergeWalletOptions } from "./walletOptions";

describe("Aleo wallet option helpers", () => {
  it("keeps the full wallet catalog when browser detection has not completed", () => {
    expect(mergeWalletOptions([]).map((wallet) => wallet.name)).toEqual([
      "Leo Wallet",
      "Shield Wallet",
      "Puzzle Wallet",
      "Fox Wallet"
    ]);
  });

  it("uses adapter-detected readiness without hiding other supported wallets", () => {
    const wallets = mergeWalletOptions([
      {
        name: "Leo Wallet",
        readyState: WalletReadyState.INSTALLED,
        url: "https://app.leo.app/browser"
      }
    ]);

    expect(wallets).toEqual([
      {
        name: "Leo Wallet",
        readyState: WalletReadyState.INSTALLED,
        url: "https://app.leo.app/browser"
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
    ]);
  });

  it("only treats installed or loadable wallets as ready to connect", () => {
    expect(isReadyWallet({ readyState: WalletReadyState.INSTALLED })).toBe(true);
    expect(isReadyWallet({ readyState: WalletReadyState.LOADABLE })).toBe(true);
    expect(isReadyWallet({ readyState: WalletReadyState.NOT_DETECTED })).toBe(false);
    expect(isReadyWallet({ readyState: WalletReadyState.UNSUPPORTED })).toBe(false);
  });
});
