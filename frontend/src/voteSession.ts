import {
  fallbackProposal,
  type Proposal,
  type TicketReceipt,
  type VoteChoice,
  type VoteReport
} from "./voteFlow";

export const voteSessionStorageKey = "aleo-private-vote.session.v1";

export type LocalVoteRecord = {
  proposalId: string;
  voter: string;
  reportId: string;
  votedAt: string;
};

export type VoteSessionSnapshot = {
  version: 1;
  proposals: Proposal[];
  selectedProposalId: string;
  choice: VoteChoice;
  ticket: TicketReceipt | null;
  report: VoteReport | null;
  proofResult: string;
  walletExecutionId: string | null;
  onChainTxId: string | null;
  localVotes: LocalVoteRecord[];
  savedAt: string;
};

type UnknownRecord = Record<string, unknown>;

function browserStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableStringValue(value: unknown) {
  const trimmed = stringValue(value);
  return trimmed.length > 0 ? trimmed : null;
}

function nonNegativeInteger(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function normalizeChoice(value: unknown): VoteChoice {
  return value === "disagree" ? "disagree" : "agree";
}

function normalizeProposal(value: unknown): Proposal | null {
  if (!isRecord(value)) return null;

  const id = stringValue(value.id);
  const title = stringValue(value.title);
  const description = stringValue(value.description);
  const proposer = stringValue(value.proposer);
  const agreeVotes = nonNegativeInteger(value.agreeVotes);
  const disagreeVotes = nonNegativeInteger(value.disagreeVotes);
  const ticketsIssued = nonNegativeInteger(value.ticketsIssued);
  const status = value.status === "passed" || value.status === "failed" ? value.status : "active";

  if (!id || !title || !description || !proposer || agreeVotes === null || disagreeVotes === null || ticketsIssued === null) {
    return null;
  }

  return {
    id,
    title,
    description,
    proposer,
    agreeVotes,
    disagreeVotes,
    ticketsIssued,
    status,
    ...(typeof value.closedAt === "string" && value.closedAt.trim() ? { closedAt: value.closedAt.trim() } : {})
  };
}

function normalizeTicket(value: unknown, proposalIds: Set<string>): TicketReceipt | null {
  if (!isRecord(value)) return null;

  const proposalId = stringValue(value.proposalId);
  const ticketCommitment = stringValue(value.ticketCommitment);
  const issuedAt = stringValue(value.issuedAt);
  const ticketsIssued = nonNegativeInteger(value.ticketsIssued);

  if (!proposalIds.has(proposalId) || !ticketCommitment || !issuedAt || ticketsIssued === null) {
    return null;
  }

  return {
    proposalId,
    ticketCommitment,
    ticketsIssued,
    issuedAt
  };
}

function normalizeReport(value: unknown, proposalIds: Set<string>): VoteReport | null {
  if (!isRecord(value)) return null;

  const id = stringValue(value.id);
  const proposalId = stringValue(value.proposalId);
  const vote = value.vote === "disagree" ? "disagree" : value.vote === "agree" ? "agree" : null;
  const ticketCommitment = stringValue(value.ticketCommitment);
  const voter = stringValue(value.voter);
  const txId = stringValue(value.txId);
  const createdAt = stringValue(value.createdAt);

  if (!id || !proposalIds.has(proposalId) || !vote || !ticketCommitment || !txId || !createdAt) {
    return null;
  }

  return {
    id,
    proposalId,
    vote,
    status: "verified",
    ticketCommitment,
    ...(voter ? { voter } : {}),
    txId,
    createdAt
  };
}

export function localVoteKey(proposalId: string, voter: string) {
  return `${proposalId.trim()}:${voter.trim().toLowerCase()}`;
}

export function hasLocalVote(records: LocalVoteRecord[], proposalId: string, voter: string) {
  const target = localVoteKey(proposalId, voter);
  return records.some((record) => localVoteKey(record.proposalId, record.voter) === target);
}

export function recordLocalVote(records: LocalVoteRecord[], nextRecord: LocalVoteRecord) {
  const target = localVoteKey(nextRecord.proposalId, nextRecord.voter);
  return [
    nextRecord,
    ...records.filter((record) => localVoteKey(record.proposalId, record.voter) !== target)
  ];
}

function normalizeLocalVotes(value: unknown, proposalIds: Set<string>) {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const records: LocalVoteRecord[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;

    const proposalId = stringValue(item.proposalId);
    const voter = stringValue(item.voter);
    const reportId = stringValue(item.reportId);
    const votedAt = stringValue(item.votedAt);
    const key = localVoteKey(proposalId, voter);

    if (!proposalIds.has(proposalId) || !voter || !reportId || !votedAt || seen.has(key)) continue;
    seen.add(key);
    records.push({ proposalId, voter, reportId, votedAt });
  }

  return records;
}

export function normalizeVoteSession(value: unknown): VoteSessionSnapshot | null {
  if (!isRecord(value) || value.version !== 1) return null;

  const proposals = Array.isArray(value.proposals)
    ? value.proposals.map(normalizeProposal).filter((proposal): proposal is Proposal => Boolean(proposal))
    : [];
  const nextProposals = proposals.length > 0 ? proposals : [fallbackProposal];
  const proposalIds = new Set(nextProposals.map((proposal) => proposal.id));
  const selectedProposalId = proposalIds.has(stringValue(value.selectedProposalId))
    ? stringValue(value.selectedProposalId)
    : nextProposals[0].id;

  return {
    version: 1,
    proposals: nextProposals,
    selectedProposalId,
    choice: normalizeChoice(value.choice),
    ticket: normalizeTicket(value.ticket, proposalIds),
    report: normalizeReport(value.report, proposalIds),
    proofResult: stringValue(value.proofResult) || "not-run",
    walletExecutionId: nullableStringValue(value.walletExecutionId),
    onChainTxId: nullableStringValue(value.onChainTxId),
    localVotes: normalizeLocalVotes(value.localVotes, proposalIds),
    savedAt: stringValue(value.savedAt) || new Date(0).toISOString()
  };
}

export function createVoteSessionSnapshot(params: Omit<VoteSessionSnapshot, "savedAt" | "version">) {
  return normalizeVoteSession({
    version: 1,
    ...params,
    savedAt: new Date().toISOString()
  });
}

export function readVoteSession(storage: Storage | null = browserStorage()) {
  if (!storage) return null;

  try {
    const raw = storage.getItem(voteSessionStorageKey);
    if (!raw) return null;
    return normalizeVoteSession(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeVoteSession(snapshot: VoteSessionSnapshot, storage: Storage | null = browserStorage()) {
  if (!storage) return;

  try {
    storage.setItem(voteSessionStorageKey, JSON.stringify(snapshot));
  } catch {
    return;
  }
}

export function clearVoteSession(storage: Storage | null = browserStorage()) {
  if (!storage) return;
  storage.removeItem(voteSessionStorageKey);
}
