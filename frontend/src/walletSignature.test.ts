import { describe, expect, it } from "vitest";
import {
  bytesToHex,
  createWalletSignatureChallenge,
  encodeWalletSignatureChallenge,
  verifyWalletSignatureProof
} from "./walletSignature";

describe("wallet signature helpers", () => {
  it("builds a deterministic wallet ownership challenge transcript", () => {
    expect(
      createWalletSignatureChallenge({
        address: "aleo1example",
        issuedAt: "2026-06-09T12:00:00.000Z",
        nonce: "nonce-1",
        origin: "https://aleo-private-vote.vercel.app",
        programId: "private_vote.aleo"
      })
    ).toBe(
      [
        "Aleo Private Vote wallet ownership proof",
        "Origin: https://aleo-private-vote.vercel.app",
        "Program: private_vote.aleo",
        "Address: aleo1example",
        "Nonce: nonce-1",
        "Issued At: 2026-06-09T12:00:00.000Z",
        "Purpose: Confirm this wallet controls the connected Aleo address before private voting."
      ].join("\n")
    );
  });

  it("encodes challenges as UTF-8 bytes for wallet signing", () => {
    expect(Array.from(encodeWalletSignatureChallenge("Aleo"))).toEqual([65, 108, 101, 111]);
  });

  it("serializes wallet signatures as lowercase hex", () => {
    expect(bytesToHex(new Uint8Array([0, 15, 16, 255]))).toBe("000f10ff");
  });

  it("verifies signatures produced by an Aleo account", async () => {
    const { Account } = await import("@provablehq/sdk/testnet.js");
    const account = new Account();
    const challengeBytes = encodeWalletSignatureChallenge("Aleo Private Vote test challenge");
    const signature = account.sign(challengeBytes);

    try {
      expect(
        await verifyWalletSignatureProof(account.address().toString(), challengeBytes, signature.toBytesLe())
      ).toBe(true);
    } finally {
      signature.free();
      account.destroy();
    }
  });
});
