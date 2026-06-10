export type VoteChoice = "agree" | "disagree";
export type ApiStatus = "checking" | "connected" | "demo";

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

export type TicketReceipt = {
  proposalId: string;
  ticketCommitment: string;
  ticketsIssued: number;
  issuedAt: string;
};

export type VoteReport = {
  id: string;
  proposalId: string;
  vote: VoteChoice;
  status: "verified";
  ticketCommitment: string;
  voter?: string;
  txId: string;
  createdAt: string;
  tally?: {
    agreeVotes: number;
    disagreeVotes: number;
    ticketsIssued: number;
  };
};

export const fallbackProposal: Proposal = {
  id: "proposal-privacy-grants",
  title: "Fund privacy-preserving grant reviews",
  description: "Allocate the next community grant round to privacy-preserving Aleo applications.",
  proposer: "aleo1privatevoteproposer0000000000000000000000000000000000000",
  agreeVotes: 12,
  disagreeVotes: 3,
  ticketsIssued: 21,
  status: "active"
};

export function calculateAgreePercent(agreeVotes: number, disagreeVotes: number) {
  const totalVotes = agreeVotes + disagreeVotes;
  return Math.round((agreeVotes / Math.max(totalVotes, 1)) * 100);
}

export function createLocalProposal(params: Pick<Proposal, "description" | "proposer" | "title">): Proposal {
  return {
    id: `proposal-${crypto.randomUUID()}`,
    title: params.title.trim(),
    description: params.description.trim(),
    proposer: params.proposer,
    agreeVotes: 0,
    disagreeVotes: 0,
    ticketsIssued: 0,
    status: "active"
  };
}

export function nextVoteCounts(proposal: Proposal, choice: VoteChoice) {
  return {
    agreeVotes: proposal.agreeVotes + (choice === "agree" ? 1 : 0),
    disagreeVotes: proposal.disagreeVotes + (choice === "disagree" ? 1 : 0)
  };
}

export function proposalOutcome(proposal: Pick<Proposal, "agreeVotes" | "disagreeVotes">) {
  return proposal.agreeVotes >= proposal.disagreeVotes ? "passing" : "failing";
}

export function closeProposal(proposal: Proposal): Proposal {
  if (proposal.status !== "active") return proposal;

  return {
    ...proposal,
    closedAt: new Date().toISOString(),
    status: proposalOutcome(proposal) === "passing" ? "passed" : "failed"
  };
}

export function proposalStatusLabel(proposal: Proposal) {
  if (proposal.status === "passed") return "Passed";
  if (proposal.status === "failed") return "Failed";
  return proposalOutcome(proposal) === "passing" ? "Currently passing" : "Currently failing";
}

export function canVoteOnProposal(proposal: Proposal) {
  return proposal.status === "active";
}

export function mergeReportTally(proposal: Proposal, report: VoteReport, fallback: ReturnType<typeof nextVoteCounts>) {
  return {
    ...proposal,
    agreeVotes: report.tally?.agreeVotes ?? fallback.agreeVotes,
    disagreeVotes: report.tally?.disagreeVotes ?? fallback.disagreeVotes,
    ticketsIssued: report.tally?.ticketsIssued ?? proposal.ticketsIssued
  };
}
