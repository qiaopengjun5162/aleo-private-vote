import { describe, expect, it } from "vitest";
import { fallbackProposal } from "./voteFlow";
import {
  createVoteSessionSnapshot,
  hasLocalVote,
  localVoteKey,
  normalizeVoteSession,
  recordLocalVote
} from "./voteSession";

describe("vote session helpers", () => {
  it("restores a valid persisted workspace", () => {
    const snapshot = normalizeVoteSession({
      version: 1,
      proposals: [fallbackProposal],
      selectedProposalId: fallbackProposal.id,
      choice: "disagree",
      ticket: {
        proposalId: fallbackProposal.id,
        ticketCommitment: "ticket-abc12345",
        ticketsIssued: 22,
        issuedAt: new Date(0).toISOString()
      },
      report: null,
      proofResult: "true",
      walletExecutionId: "at1wallet",
      onChainTxId: "at1chain",
      localVotes: [
        {
          proposalId: fallbackProposal.id,
          voter: "aleo1voter",
          reportId: "report-1",
          votedAt: new Date(1).toISOString()
        }
      ],
      savedAt: new Date(2).toISOString()
    });

    expect(snapshot).toEqual(
      expect.objectContaining({
        selectedProposalId: fallbackProposal.id,
        choice: "disagree",
        proofResult: "true",
        walletExecutionId: "at1wallet",
        onChainTxId: "at1chain"
      })
    );
    expect(snapshot?.ticket?.ticketCommitment).toBe("ticket-abc12345");
    expect(snapshot?.localVotes).toHaveLength(1);
  });

  it("drops stale ticket and vote records for unknown proposals", () => {
    const snapshot = normalizeVoteSession({
      version: 1,
      proposals: [fallbackProposal],
      selectedProposalId: "missing",
      choice: "agree",
      ticket: {
        proposalId: "missing",
        ticketCommitment: "ticket-abc12345",
        ticketsIssued: 1,
        issuedAt: new Date(0).toISOString()
      },
      report: null,
      proofResult: "",
      walletExecutionId: "",
      onChainTxId: "",
      localVotes: [
        {
          proposalId: "missing",
          voter: "aleo1voter",
          reportId: "report-1",
          votedAt: new Date(1).toISOString()
        }
      ],
      savedAt: ""
    });

    expect(snapshot?.selectedProposalId).toBe(fallbackProposal.id);
    expect(snapshot?.ticket).toBeNull();
    expect(snapshot?.localVotes).toEqual([]);
  });

  it("creates a normalized snapshot with a save timestamp", () => {
    const snapshot = createVoteSessionSnapshot({
      proposals: [fallbackProposal],
      selectedProposalId: fallbackProposal.id,
      choice: "agree",
      ticket: null,
      report: null,
      proofResult: "not-run",
      walletExecutionId: null,
      onChainTxId: null,
      localVotes: []
    });

    expect(snapshot?.version).toBe(1);
    expect(snapshot?.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("uses a stable wallet vote key and replaces duplicate local votes", () => {
    const first = {
      proposalId: fallbackProposal.id,
      voter: "ALEO1VOTER",
      reportId: "report-1",
      votedAt: new Date(0).toISOString()
    };
    const second = {
      ...first,
      voter: "aleo1voter",
      reportId: "report-2",
      votedAt: new Date(1).toISOString()
    };

    expect(localVoteKey(fallbackProposal.id, "ALEO1VOTER")).toBe(localVoteKey(fallbackProposal.id, "aleo1voter"));
    expect(recordLocalVote([first], second)).toEqual([second]);
    expect(hasLocalVote([first], fallbackProposal.id, "aleo1voter")).toBe(true);
  });
});
