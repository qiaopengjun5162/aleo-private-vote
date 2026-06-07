export type Proposal = {
  id: string;
  title: string;
  description: string;
  proposer: string;
  agreeVotes: number;
  disagreeVotes: number;
  ticketsIssued: number;
};

export type VoteReport = {
  id: string;
  proposalId: string;
  vote: "agree" | "disagree";
  status: "verified";
  ticketCommitment: string;
  txId: string;
  createdAt: string;
};

export const proposals: Proposal[] = [
  {
    id: "proposal-privacy-grants",
    title: "Fund privacy-preserving grant reviews",
    description: "Allocate the next community grant round to privacy-preserving Aleo applications.",
    proposer: "aleo1privatevoteproposer0000000000000000000000000000000000000",
    agreeVotes: 12,
    disagreeVotes: 3,
    ticketsIssued: 21
  }
];

export const reports: VoteReport[] = [];
