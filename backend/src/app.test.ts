import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildServer } from "./app.js";
import { createFileDemoStore } from "./data.js";

const servers = new Set<Awaited<ReturnType<typeof buildServer>>>();
const tempDirs = new Set<string>();
const voter = "aleo1voter0000000000000000000000000000000000000000000";

async function testServer(options: Parameters<typeof buildServer>[0] = {}) {
  const server = await buildServer({ logger: false, ...options });
  servers.add(server);
  await server.ready();
  return server;
}

afterEach(async () => {
  await Promise.all([...servers].map((server) => server.close()));
  await Promise.all([...tempDirs].map((dir) => rm(dir, { force: true, recursive: true })));
  servers.clear();
  tempDirs.clear();
});

describe("backend API", () => {
  it("keeps health checks outside the state-changing API rate limit", async () => {
    const server = await testServer({ rateLimit: { max: 1, timeWindow: 60_000 } });

    const firstResponse = await server.inject({
      method: "GET",
      url: "/health"
    });
    const secondResponse = await server.inject({
      method: "GET",
      url: "/health"
    });

    expect(firstResponse.statusCode).toBe(200);
    expect(firstResponse.json()).toEqual(
      expect.objectContaining({
        rateLimit: "enabled",
        service: "aleo-private-vote-backend",
        status: "ok"
      })
    );
    expect(secondResponse.statusCode).toBe(200);
  });

  it("returns the demo proposal", async () => {
    const server = await testServer();

    const response = await server.inject({
      method: "GET",
      url: "/api/proposals"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      expect.objectContaining({
        id: "proposal-privacy-grants",
        agreeVotes: 12,
        disagreeVotes: 3,
        ticketsIssued: 21
      })
    ]);
  });

  it("issues a private ticket commitment", async () => {
    const server = await testServer();

    const response = await server.inject({
      method: "POST",
      url: "/api/tickets",
      payload: {
        proposalId: "proposal-privacy-grants",
        voter
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        proposalId: "proposal-privacy-grants",
        ticketsIssued: 22
      })
    );
    expect(response.json().ticketCommitment).toMatch(/^ticket-/);
  });

  it("rate limits state-changing API routes", async () => {
    const server = await testServer({ rateLimit: { max: 1, timeWindow: 60_000 } });

    await server.inject({
      method: "POST",
      url: "/api/tickets",
      payload: {
        proposalId: "proposal-privacy-grants",
        voter
      }
    });

    const response = await server.inject({
      method: "POST",
      url: "/api/tickets",
      payload: {
        proposalId: "proposal-privacy-grants",
        voter: "aleo1limited000000000000000000000000000000000000000"
      }
    });

    expect(response.statusCode).toBe(429);
    expect(response.headers["retry-after"]).toBeDefined();
  });

  it("rejects oversized request bodies before validation", async () => {
    const server = await testServer({ bodyLimit: 128 });

    const response = await server.inject({
      method: "POST",
      url: "/api/proposals",
      payload: {
        title: "Large proposal",
        description: "x".repeat(512),
        proposer: "aleo1creator0000000000000000000000000000000000000000"
      }
    });

    expect(response.statusCode).toBe(413);
  });

  it("creates and closes a demo proposal", async () => {
    const server = await testServer();

    const createResponse = await server.inject({
      method: "POST",
      url: "/api/proposals",
      payload: {
        title: "Choose grant reviewers",
        description: "Select the next group of privacy grant reviewers for the Aleo community.",
        proposer: "aleo1creator0000000000000000000000000000000000000000"
      }
    });

    expect(createResponse.statusCode).toBe(200);
    expect(createResponse.json()).toEqual(
      expect.objectContaining({
        title: "Choose grant reviewers",
        agreeVotes: 0,
        disagreeVotes: 0,
        ticketsIssued: 0,
        status: "active"
      })
    );

    const closeResponse = await server.inject({
      method: "POST",
      url: `/api/proposals/${createResponse.json().id}/close`
    });

    expect(closeResponse.statusCode).toBe(200);
    expect(closeResponse.json()).toEqual(
      expect.objectContaining({
        id: createResponse.json().id,
        status: "passed"
      })
    );
    expect(closeResponse.json().closedAt).toEqual(expect.any(String));
  });

  it("rejects ticket issuance for closed proposals", async () => {
    const server = await testServer();

    await server.inject({
      method: "POST",
      url: "/api/proposals/proposal-privacy-grants/close"
    });

    const response = await server.inject({
      method: "POST",
      url: "/api/tickets",
      payload: {
        proposalId: "proposal-privacy-grants",
        voter
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual(expect.objectContaining({ error: "Proposal is closed" }));
  });

  it("stores a vote report and returns the updated tally", async () => {
    const server = await testServer();
    const ticketResponse = await server.inject({
      method: "POST",
      url: "/api/tickets",
      payload: {
        proposalId: "proposal-privacy-grants",
        voter
      }
    });

    const response = await server.inject({
      method: "POST",
      url: "/api/reports",
      payload: {
        proposalId: "proposal-privacy-grants",
        vote: "agree",
        ticketCommitment: ticketResponse.json().ticketCommitment,
        voter
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        proposalId: "proposal-privacy-grants",
        vote: "agree",
        voter,
        status: "verified",
        tally: {
          agreeVotes: 13,
          disagreeVotes: 3,
          ticketsIssued: 22
        }
      })
    );
  });

  it("rejects a duplicate voter report for the same proposal", async () => {
    const server = await testServer();
    const ticketResponse = await server.inject({
      method: "POST",
      url: "/api/tickets",
      payload: {
        proposalId: "proposal-privacy-grants",
        voter
      }
    });

    await server.inject({
      method: "POST",
      url: "/api/reports",
      payload: {
        proposalId: "proposal-privacy-grants",
        vote: "agree",
        ticketCommitment: ticketResponse.json().ticketCommitment,
        voter
      }
    });

    const response = await server.inject({
      method: "POST",
      url: "/api/tickets",
      payload: {
        proposalId: "proposal-privacy-grants",
        voter
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual(expect.objectContaining({ error: "Voter already submitted a report for this proposal" }));
  });

  it("persists proposals, tickets, and reports when VOTE_STORE_PATH is backed by a file store", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aleo-private-vote-"));
    tempDirs.add(dir);
    const storePath = join(dir, "store.json");
    const server = await testServer({ store: await createFileDemoStore(storePath) });
    const ticketResponse = await server.inject({
      method: "POST",
      url: "/api/tickets",
      payload: {
        proposalId: "proposal-privacy-grants",
        voter
      }
    });

    await server.inject({
      method: "POST",
      url: "/api/reports",
      payload: {
        proposalId: "proposal-privacy-grants",
        vote: "disagree",
        ticketCommitment: ticketResponse.json().ticketCommitment,
        voter
      }
    });

    const persisted = JSON.parse(await readFile(storePath, "utf8"));
    expect(persisted.proposals[0]).toEqual(
      expect.objectContaining({
        agreeVotes: 12,
        disagreeVotes: 4,
        ticketsIssued: 22
      })
    );
    expect(persisted.tickets[0]).toEqual(expect.objectContaining({ voter, spentAt: expect.any(String) }));
    expect(persisted.reports[0]).toEqual(expect.objectContaining({ voter, vote: "disagree" }));
  });

  it("rejects malformed reports", async () => {
    const server = await testServer();

    const response = await server.inject({
      method: "POST",
      url: "/api/reports",
      payload: {
        proposalId: "proposal-privacy-grants",
        vote: "maybe",
        ticketCommitment: "bad"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual(expect.objectContaining({ error: "Invalid request" }));
  });
});
