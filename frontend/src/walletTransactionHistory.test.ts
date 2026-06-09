import { describe, expect, it } from "vitest";
import { getWalletTransactionId, normalizeWalletTransactionHistory } from "./walletTransactionHistory";

describe("wallet transaction history helpers", () => {
  it("prefers transactionId for explorer links", () => {
    expect(getWalletTransactionId({ id: "local-id", transactionId: "at1abc" })).toBe("at1abc");
  });

  it("falls back to id when wallets only return id", () => {
    expect(getWalletTransactionId({ id: "at1fallback" })).toBe("at1fallback");
  });

  it("normalizes and deduplicates wallet history entries", () => {
    expect(
      normalizeWalletTransactionHistory([
        { id: "one", transactionId: "at1one" },
        { id: "duplicate", transactionId: "at1one" },
        { id: "at1two" },
        {}
      ])
    ).toEqual([
      { id: "one", transactionId: "at1one" },
      { id: "at1two", transactionId: "at1two" }
    ]);
  });
});
