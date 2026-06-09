export type WalletSignatureChallengeParams = {
  address: string;
  issuedAt: string;
  nonce: string;
  origin: string;
  programId: string;
};

export function createWalletSignatureChallenge({
  address,
  issuedAt,
  nonce,
  origin,
  programId
}: WalletSignatureChallengeParams): string {
  return [
    "Aleo Private Vote wallet ownership proof",
    `Origin: ${origin}`,
    `Program: ${programId}`,
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    "Purpose: Confirm this wallet controls the connected Aleo address before private voting."
  ].join("\n");
}

export function encodeWalletSignatureChallenge(challenge: string): Uint8Array {
  return new TextEncoder().encode(challenge);
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyWalletSignatureProof(
  address: string,
  challengeBytes: Uint8Array,
  signatureBytes: Uint8Array
): Promise<boolean> {
  const { Address, Signature, initializeWasm } = await import("@provablehq/sdk/testnet.js");

  await initializeWasm();
  let aleoAddress: ReturnType<typeof Address.from_string> | null = null;
  let signature: ReturnType<typeof Signature.fromBytesLe> | null = null;

  try {
    aleoAddress = Address.from_string(address);
    signature = Signature.fromBytesLe(signatureBytes);
    return signature.verify(aleoAddress, challengeBytes);
  } finally {
    signature?.free();
    aleoAddress?.free();
  }
}
