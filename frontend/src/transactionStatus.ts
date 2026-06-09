export type TestnetTransactionStatus = "checking" | "pending" | "accepted" | "unavailable";

export type TestnetTransactionDetails = {
  type?: string;
  program?: string;
  functionName?: string;
};

export type TestnetTransactionStatusResponse = TestnetTransactionDetails & {
  txId: string;
  status: TestnetTransactionStatus;
  message: string;
  checkedAt: string;
};

export type WalletTransactionStatusLike = {
  status?: string;
  transactionId?: string;
  error?: string;
};

export const transactionStatusLabels: Record<TestnetTransactionStatus, string> = {
  checking: "Checking testnet status",
  pending: "Waiting for testnet confirmation",
  accepted: "Accepted on testnet",
  unavailable: "Status check unavailable"
};

export function parseTestnetTransaction(payload: unknown): TestnetTransactionDetails {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const transaction = payload as {
    type?: unknown;
    execution?: {
      transitions?: Array<{
        program?: unknown;
        function?: unknown;
      }>;
    };
  };
  const transition = transaction.execution?.transitions?.[0];

  return {
    type: typeof transaction.type === "string" ? transaction.type : undefined,
    program: typeof transition?.program === "string" ? transition.program : undefined,
    functionName: typeof transition?.function === "string" ? transition.function : undefined
  };
}

export function isAleoTransactionId(value: string | null | undefined): value is string {
  return typeof value === "string" && /^at1[0-9a-z]+$/i.test(value);
}

export function resolveOnChainTransactionId(
  walletExecutionId: string | null,
  walletStatus: WalletTransactionStatusLike | null
): string | null {
  if (isAleoTransactionId(walletStatus?.transactionId)) return walletStatus.transactionId;
  if (isAleoTransactionId(walletExecutionId)) return walletExecutionId;
  return null;
}

export function walletExecutionStatusLabel(status: string | undefined): string {
  if (!status) return "Submitted to wallet";

  const normalized = status.toLowerCase();
  if (normalized.includes("accept") || normalized.includes("complete") || normalized.includes("success")) {
    return "Wallet resolved on-chain id";
  }
  if (normalized.includes("fail") || normalized.includes("reject") || normalized.includes("error")) {
    return "Wallet execution failed";
  }
  if (normalized.includes("pending") || normalized.includes("submit") || normalized.includes("process")) {
    return "Wallet execution pending";
  }

  return status;
}
