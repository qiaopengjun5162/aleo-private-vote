import { describe, expect, it } from "vitest";
import { createRecoveryNotice, getErrorMessage } from "./recovery";

describe("recovery helpers", () => {
  it("extracts error messages from unknown values", () => {
    expect(getErrorMessage(new Error("wallet failed"))).toBe("wallet failed");
    expect(getErrorMessage("plain failure")).toBe("plain failure");
    expect(getErrorMessage(null)).toBe("Unexpected wallet error.");
  });

  it("classifies rejected wallet requests", () => {
    expect(createRecoveryNotice("User rejected the request", "wallet-execution")).toMatchObject({
      title: "Wallet request rejected",
      tone: "warning"
    });
    expect(createRecoveryNotice("User rejected the request", "wallet-signature")).toMatchObject({
      title: "Signature rejected",
      tone: "warning"
    });
  });

  it("classifies insufficient balance errors", () => {
    expect(createRecoveryNotice("Insufficient credits for fee", "wallet-execution")).toMatchObject({
      title: "Insufficient testnet balance",
      tone: "danger"
    });
  });

  it("classifies unavailable wallet extensions", () => {
    expect(createRecoveryNotice("Leo Wallet is not installed or not available", "wallet-connect")).toMatchObject({
      title: "Wallet extension unavailable",
      tone: "warning"
    });
  });

  it("classifies testnet status outages", () => {
    expect(createRecoveryNotice("Unable to query the testnet API.", "testnet-status")).toMatchObject({
      title: "Testnet status unavailable",
      tone: "info"
    });
  });

  it("falls back to execution-specific recovery", () => {
    expect(createRecoveryNotice("Wallet returned an unknown execution error", "wallet-execution")).toMatchObject({
      title: "Execution recovery needed",
      tone: "danger"
    });
  });
});
