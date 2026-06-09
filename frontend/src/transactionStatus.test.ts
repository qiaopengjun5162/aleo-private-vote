import { describe, expect, it } from "vitest";
import {
  isAleoTransactionId,
  parseTestnetTransaction,
  resolveOnChainTransactionId,
  transactionStatusLabels,
  walletExecutionStatusLabel
} from "./transactionStatus";

describe("testnet transaction status helpers", () => {
  it("extracts execution details from a Provable transaction payload", () => {
    expect(
      parseTestnetTransaction({
        type: "execute",
        execution: {
          transitions: [
            {
              program: "private_vote.aleo",
              function: "main"
            }
          ]
        }
      })
    ).toEqual({
      type: "execute",
      program: "private_vote.aleo",
      functionName: "main"
    });
  });

  it("handles missing transaction details without throwing", () => {
    expect(parseTestnetTransaction(null)).toEqual({});
    expect(parseTestnetTransaction({ type: 42 })).toEqual({});
  });

  it("has a label for every chain status exposed to the UI", () => {
    expect(transactionStatusLabels).toEqual({
      checking: "Checking testnet status",
      pending: "Waiting for testnet confirmation",
      accepted: "Accepted on testnet",
      unavailable: "Status check unavailable"
    });
  });

  it("detects Aleo transaction ids before opening explorer links", () => {
    expect(isAleoTransactionId("at1pwcdsarry997563mt69tg45a8ur72mr88l609jvz2peh38emsgrqsp83se")).toBe(true);
    expect(isAleoTransactionId("temporary-wallet-id")).toBe(false);
    expect(isAleoTransactionId(null)).toBe(false);
  });

  it("resolves the on-chain id from wallet status before falling back to the wallet execution id", () => {
    expect(
      resolveOnChainTransactionId("temporary-wallet-id", {
        status: "pending",
        transactionId: "at1resolved"
      })
    ).toBe("at1resolved");
    expect(resolveOnChainTransactionId("at1direct", null)).toBe("at1direct");
    expect(resolveOnChainTransactionId("temporary-wallet-id", { status: "pending" })).toBeNull();
  });

  it("normalizes wallet execution status labels", () => {
    expect(walletExecutionStatusLabel(undefined)).toBe("Submitted to wallet");
    expect(walletExecutionStatusLabel("pending")).toBe("Wallet execution pending");
    expect(walletExecutionStatusLabel("accepted")).toBe("Wallet resolved on-chain id");
    expect(walletExecutionStatusLabel("failed")).toBe("Wallet execution failed");
    expect(walletExecutionStatusLabel("custom")).toBe("custom");
  });
});
