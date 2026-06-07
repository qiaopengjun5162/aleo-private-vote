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
  ticketsIssued: 21
};

export function calculateAgreePercent(agreeVotes: number, disagreeVotes: number) {
  const totalVotes = agreeVotes + disagreeVotes;
  return Math.round((agreeVotes / Math.max(totalVotes, 1)) * 100);
}

export function nextVoteCounts(proposal: Proposal, choice: VoteChoice) {
  return {
    agreeVotes: proposal.agreeVotes + (choice === "agree" ? 1 : 0),
    disagreeVotes: proposal.disagreeVotes + (choice === "disagree" ? 1 : 0)
  };
}

export function mergeReportTally(proposal: Proposal, report: VoteReport, fallback: ReturnType<typeof nextVoteCounts>) {
  return {
    ...proposal,
    agreeVotes: report.tally?.agreeVotes ?? fallback.agreeVotes,
    disagreeVotes: report.tally?.disagreeVotes ?? fallback.disagreeVotes,
    ticketsIssued: report.tally?.ticketsIssued ?? proposal.ticketsIssued
  };
}
