import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type Proposal = {
  id: string;
  title: string;
  description: string;
  proposer: string;
  agreeVotes: number;
  disagreeVotes: number;
  ticketsIssued: number;
  status: "active" | "passed" | "failed";
  closedAt?: string;
};

export type TicketRecord = {
  proposalId: string;
  ticketCommitment: string;
  voter: string;
  issuedAt: string;
  spentAt?: string;
};

export type VoteReport = {
  id: string;
  proposalId: string;
  vote: "agree" | "disagree";
  status: "verified";
  ticketCommitment: string;
  voter: string;
  txId: string;
  createdAt: string;
};

export type DemoStore = {
  proposals: Proposal[];
  tickets: TicketRecord[];
  reports: VoteReport[];
  save(): Promise<void>;
};

const seedProposals: Proposal[] = [
  {
    id: "proposal-privacy-grants",
    title: "Fund privacy-preserving grant reviews",
    description: "Allocate the next community grant round to privacy-preserving Aleo applications.",
    proposer: "aleo1privatevoteproposer0000000000000000000000000000000000000",
    agreeVotes: 12,
    disagreeVotes: 3,
    ticketsIssued: 21,
    status: "active"
  }
];

type DemoStoreState = {
  proposals?: unknown;
  reports?: unknown;
  tickets?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nonNegativeInteger(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
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

function normalizeTicket(value: unknown, proposalIds: Set<string>): TicketRecord | null {
  if (!isRecord(value)) return null;

  const proposalId = stringValue(value.proposalId);
  const ticketCommitment = stringValue(value.ticketCommitment);
  const voter = stringValue(value.voter);
  const issuedAt = stringValue(value.issuedAt);

  if (!proposalIds.has(proposalId) || !ticketCommitment || !voter || !issuedAt) {
    return null;
  }

  return {
    proposalId,
    ticketCommitment,
    voter,
    issuedAt,
    ...(typeof value.spentAt === "string" && value.spentAt.trim() ? { spentAt: value.spentAt.trim() } : {})
  };
}

function normalizeReport(value: unknown, proposalIds: Set<string>): VoteReport | null {
  if (!isRecord(value)) return null;

  const id = stringValue(value.id);
  const proposalId = stringValue(value.proposalId);
  const vote = value.vote === "agree" || value.vote === "disagree" ? value.vote : null;
  const ticketCommitment = stringValue(value.ticketCommitment);
  const voter = stringValue(value.voter);
  const txId = stringValue(value.txId);
  const createdAt = stringValue(value.createdAt);

  if (!id || !proposalIds.has(proposalId) || !vote || !ticketCommitment || !voter || !txId || !createdAt) {
    return null;
  }

  return {
    id,
    proposalId,
    vote,
    status: "verified",
    ticketCommitment,
    voter,
    txId,
    createdAt
  };
}

function normalizeStoreState(state: DemoStoreState) {
  const proposals = Array.isArray(state.proposals)
    ? state.proposals.map(normalizeProposal).filter((proposal): proposal is Proposal => Boolean(proposal))
    : [];
  const nextProposals = proposals.length > 0 ? proposals : seedProposals.map((proposal) => ({ ...proposal }));
  const proposalIds = new Set(nextProposals.map((proposal) => proposal.id));
  const tickets = Array.isArray(state.tickets)
    ? state.tickets.map((ticket) => normalizeTicket(ticket, proposalIds)).filter((ticket): ticket is TicketRecord => Boolean(ticket))
    : [];
  const reports = Array.isArray(state.reports)
    ? state.reports.map((report) => normalizeReport(report, proposalIds)).filter((report): report is VoteReport => Boolean(report))
    : [];

  return {
    proposals: nextProposals,
    reports,
    tickets
  };
}

export function voterProposalKey(proposalId: string, voter: string) {
  return `${proposalId.trim()}:${voter.trim().toLowerCase()}`;
}

export function createDemoStore(state: DemoStoreState = {}): DemoStore {
  const normalized = normalizeStoreState(state);

  return {
    ...normalized,
    async save() {
      return;
    }
  };
}

export async function createFileDemoStore(filePath: string): Promise<DemoStore> {
  let loadedState: DemoStoreState = {};

  try {
    loadedState = JSON.parse(await readFile(filePath, "utf8")) as DemoStoreState;
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : undefined;
    if (code !== "ENOENT") {
      throw error;
    }
  }

  const normalized = normalizeStoreState(loadedState);
  const store: DemoStore = {
    ...normalized,
    async save() {
      const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
      const payload = `${JSON.stringify(
        {
          proposals: store.proposals,
          reports: store.reports,
          tickets: store.tickets
        },
        null,
        2
      )}\n`;

      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(tempPath, payload, "utf8");
      await rename(tempPath, filePath);
    }
  };

  await store.save();
  return store;
}
