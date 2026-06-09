import { describe, expect, it } from "vitest";
import {
  calculateAgreePercent,
  canVoteOnProposal,
  closeProposal,
  createLocalProposal,
  fallbackProposal,
  mergeReportTally,
  nextVoteCounts,
  proposalOutcome,
  proposalStatusLabel,
  type VoteReport
} from "./voteFlow";

describe("vote flow helpers", () => {
  it("calculates the public agree percentage", () => {
    expect(calculateAgreePercent(12, 3)).toBe(80);
    expect(calculateAgreePercent(0, 0)).toBe(0);
  });

  it("increments the selected vote side", () => {
    expect(nextVoteCounts(fallbackProposal, "agree")).toEqual({
      agreeVotes: 13,
      disagreeVotes: 3
    });
    expect(nextVoteCounts(fallbackProposal, "disagree")).toEqual({
      agreeVotes: 12,
      disagreeVotes: 4
    });
  });

  it("creates local active proposals", () => {
    const proposal = createLocalProposal({
      title: "  Add private reviewer elections  ",
      description: "  Let reviewers vote privately while the final tally remains public.  ",
      proposer: "aleo1creator"
    });

    expect(proposal).toEqual(
      expect.objectContaining({
        title: "Add private reviewer elections",
        description: "Let reviewers vote privately while the final tally remains public.",
        proposer: "aleo1creator",
        status: "active",
        agreeVotes: 0,
        disagreeVotes: 0,
        ticketsIssued: 0
      })
    );
    expect(proposal.id).toMatch(/^proposal-/);
  });

  it("labels active and closed proposal outcomes", () => {
    expect(proposalOutcome({ agreeVotes: 2, disagreeVotes: 2 })).toBe("passing");
    expect(proposalStatusLabel(fallbackProposal)).toBe("Currently passing");
    expect(canVoteOnProposal(fallbackProposal)).toBe(true);

    const failed = closeProposal({
      ...fallbackProposal,
      agreeVotes: 1,
      disagreeVotes: 2
    });

    expect(failed.status).toBe("failed");
    expect(proposalStatusLabel(failed)).toBe("Failed");
    expect(canVoteOnProposal(failed)).toBe(false);
  });

  it("prefers backend tally data when a report includes it", () => {
    const report: VoteReport = {
      id: "report-vitest",
      proposalId: fallbackProposal.id,
      vote: "agree",
      status: "verified",
      ticketCommitment: "ticket-vitest",
      txId: "demo-vitest",
      createdAt: new Date(0).toISOString(),
      tally: {
        agreeVotes: 99,
        disagreeVotes: 5,
        ticketsIssued: 42
      }
    };

    expect(mergeReportTally(fallbackProposal, report, nextVoteCounts(fallbackProposal, "agree"))).toEqual({
      ...fallbackProposal,
      agreeVotes: 99,
      disagreeVotes: 5,
      ticketsIssued: 42
    });
  });
});
