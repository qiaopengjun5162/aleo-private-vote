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

  server.get("/api/reports", async () => store.reports);

  server.post("/api/tickets", async (request, reply) => {
    const body = ticketSchema.parse(request.body);
    const proposal = store.proposals.find((item) => item.id === body.proposalId);

    if (!proposal) {
      return reply.code(404).send({ error: "Proposal not found" });
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
