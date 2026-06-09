export type RawWalletTransactionHistoryEntry = {
  id?: string;
  transactionId?: string;
};

export type WalletTransactionHistoryEntry = {
  id: string;
  transactionId: string;
};

export function getWalletTransactionId(entry: RawWalletTransactionHistoryEntry): string | null {
  if (entry.transactionId) return entry.transactionId;
  if (entry.id) return entry.id;
  return null;
}

export function normalizeWalletTransactionHistory(
  transactions: RawWalletTransactionHistoryEntry[]
): WalletTransactionHistoryEntry[] {
  const seen = new Set<string>();
  const history: WalletTransactionHistoryEntry[] = [];

  transactions.forEach((entry) => {
    const transactionId = getWalletTransactionId(entry);
    if (!transactionId || seen.has(transactionId)) return;

    seen.add(transactionId);
    history.push({
      id: entry.id ?? transactionId,
      transactionId
    });
  });

  return history;
}
