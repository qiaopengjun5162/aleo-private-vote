import { describe, expect, it } from "vitest";
import { parseTestnetTransaction, transactionStatusLabels } from "./transactionStatus";

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
});
