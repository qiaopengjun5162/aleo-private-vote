import { describe, expect, it } from "vitest";
import { calculateAgreePercent, fallbackProposal, mergeReportTally, nextVoteCounts, type VoteReport } from "./voteFlow";

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
