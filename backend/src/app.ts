import cors from "@fastify/cors";
import Fastify from "fastify";
import { z } from "zod";
import { createDemoStore, type DemoStore } from "./data.js";

type BuildServerOptions = {
  logger?: boolean;
  store?: DemoStore;
};

const reportSchema = z.object({
  proposalId: z.string().min(1),
  vote: z.enum(["agree", "disagree"]),
  ticketCommitment: z.string().min(8)
});

const ticketSchema = z.object({
  proposalId: z.string().min(1)
});

const proposalSchema = z.object({
  description: z.string().trim().min(12).max(280),
  proposer: z.string().trim().min(8),
  title: z.string().trim().min(4).max(80)
});

export async function buildServer(options: BuildServerOptions = {}) {
  const store = options.store ?? createDemoStore();
  const server = Fastify({ logger: options.logger ?? true });

  await server.register(cors, {
    origin: true
  });

  server.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({ error: "Invalid request", issues: error.issues });
    }

    return reply.send(error);
  });

  server.get("/health", async () => ({
    status: "ok",
    service: "aleo-private-vote-backend"
  }));

  server.get("/api/proposals", async () => store.proposals);

  server.post("/api/proposals", async (request) => {
    const body = proposalSchema.parse(request.body);
    const proposal = {
      id: `proposal-${crypto.randomUUID()}`,
      title: body.title,
      description: body.description,
      proposer: body.proposer,
      agreeVotes: 0,
      disagreeVotes: 0,
      ticketsIssued: 0,
      status: "active" as const
    };

    store.proposals.unshift(proposal);
    return proposal;
  });

  server.post("/api/proposals/:proposalId/close", async (request, reply) => {
    const params = z.object({ proposalId: z.string().min(1) }).parse(request.params);
    const proposal = store.proposals.find((item) => item.id === params.proposalId);

    if (!proposal) {
      return reply.code(404).send({ error: "Proposal not found" });
    }

    if (proposal.status !== "active") {
      return proposal;
    }

    proposal.status = proposal.agreeVotes >= proposal.disagreeVotes ? "passed" : "failed";
    proposal.closedAt = new Date().toISOString();
    return proposal;
  });

  server.get("/api/reports", async () => store.reports);

  server.post("/api/tickets", async (request, reply) => {
    const body = ticketSchema.parse(request.body);
    const proposal = store.proposals.find((item) => item.id === body.proposalId);

    if (!proposal) {
      return reply.code(404).send({ error: "Proposal not found" });
    }

    if (proposal.status !== "active") {
      return reply.code(409).send({ error: "Proposal is closed" });
    }

    proposal.ticketsIssued += 1;

    return {
      proposalId: body.proposalId,
      ticketCommitment: `ticket-${crypto.randomUUID()}`,
      ticketsIssued: proposal.ticketsIssued,
      issuedAt: new Date().toISOString()
    };
  });

  server.post("/api/reports", async (request, reply) => {
    const body = reportSchema.parse(request.body);
    const proposal = store.proposals.find((item) => item.id === body.proposalId);

    if (!proposal) {
      return reply.code(404).send({ error: "Proposal not found" });
    }

    if (proposal.status !== "active") {
      return reply.code(409).send({ error: "Proposal is closed" });
    }

    if (body.vote === "agree") {
      proposal.agreeVotes += 1;
    } else {
      proposal.disagreeVotes += 1;
    }

    const report = {
      id: `report-${Date.now()}`,
      proposalId: body.proposalId,
      vote: body.vote,
      status: "verified" as const,
      ticketCommitment: body.ticketCommitment,
      txId: `demo-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString()
    };

    store.reports.unshift(report);
    return {
      ...report,
      tally: {
        agreeVotes: proposal.agreeVotes,
        disagreeVotes: proposal.disagreeVotes,
        ticketsIssued: proposal.ticketsIssued
      }
    };
  });

  return server;
}
