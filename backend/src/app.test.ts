import { afterEach, describe, expect, it } from "vitest";
import { buildServer } from "./app.js";

const servers = new Set<Awaited<ReturnType<typeof buildServer>>>();

async function testServer() {
  const server = await buildServer({ logger: false });
  servers.add(server);
  await server.ready();
  return server;
}

afterEach(async () => {
  await Promise.all([...servers].map((server) => server.close()));
  servers.clear();
});

describe("backend API", () => {
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
        proposalId: "proposal-privacy-grants"
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

  it("stores a vote report and returns the updated tally", async () => {
    const server = await testServer();

    const response = await server.inject({
      method: "POST",
      url: "/api/reports",
      payload: {
        proposalId: "proposal-privacy-grants",
        vote: "agree",
        ticketCommitment: "ticket-vitest"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        proposalId: "proposal-privacy-grants",
        vote: "agree",
        status: "verified",
        tally: {
          agreeVotes: 13,
          disagreeVotes: 3,
          ticketsIssued: 21
        }
      })
    );
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
