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
