import cors from "@fastify/cors";
import Fastify from "fastify";
import { z } from "zod";
import { createDemoStore, voterProposalKey, type DemoStore } from "./data.js";

type BuildServerOptions = {
  logger?: boolean;
  store?: DemoStore;
};

const reportSchema = z.object({
  proposalId: z.string().min(1),
  vote: z.enum(["agree", "disagree"]),
  ticketCommitment: z.string().min(8),
  voter: z.string().trim().min(8)
});

const ticketSchema = z.object({
  proposalId: z.string().min(1),
  voter: z.string().trim().min(8)
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
    await store.save();
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
    await store.save();
    return proposal;
  });

  server.get("/api/reports", async () => store.reports);

  server.post("/api/tickets", async (request, reply) => {
    const body = ticketSchema.parse(request.body);
    const proposal = store.proposals.find((item) => item.id === body.proposalId);
    const voterKey = voterProposalKey(body.proposalId, body.voter);

    if (!proposal) {
      return reply.code(404).send({ error: "Proposal not found" });
    }

    if (proposal.status !== "active") {
      return reply.code(409).send({ error: "Proposal is closed" });
    }

    if (store.reports.some((report) => voterProposalKey(report.proposalId, report.voter) === voterKey)) {
      return reply.code(409).send({ error: "Voter already submitted a report for this proposal" });
    }

    const existingTicket = store.tickets.find(
      (ticket) => voterProposalKey(ticket.proposalId, ticket.voter) === voterKey && !ticket.spentAt
    );
    if (existingTicket) {
      return {
        proposalId: body.proposalId,
        ticketCommitment: existingTicket.ticketCommitment,
        ticketsIssued: proposal.ticketsIssued,
        issuedAt: existingTicket.issuedAt
      };
    }

    proposal.ticketsIssued += 1;
    const ticket = {
      proposalId: body.proposalId,
      ticketCommitment: `ticket-${crypto.randomUUID()}`,
      voter: body.voter,
      issuedAt: new Date().toISOString()
    };
    store.tickets.unshift(ticket);
    await store.save();

    return {
      proposalId: body.proposalId,
      ticketCommitment: ticket.ticketCommitment,
      ticketsIssued: proposal.ticketsIssued,
      issuedAt: ticket.issuedAt
    };
  });

  server.post("/api/reports", async (request, reply) => {
    const body = reportSchema.parse(request.body);
    const proposal = store.proposals.find((item) => item.id === body.proposalId);
    const voterKey = voterProposalKey(body.proposalId, body.voter);

    if (!proposal) {
      return reply.code(404).send({ error: "Proposal not found" });
    }

    if (proposal.status !== "active") {
      return reply.code(409).send({ error: "Proposal is closed" });
    }

    if (store.reports.some((report) => voterProposalKey(report.proposalId, report.voter) === voterKey)) {
      return reply.code(409).send({ error: "Voter already submitted a report for this proposal" });
    }

    const ticket = store.tickets.find(
      (item) =>
        item.proposalId === body.proposalId &&
        item.ticketCommitment === body.ticketCommitment &&
        voterProposalKey(item.proposalId, item.voter) === voterKey &&
        !item.spentAt
    );
    if (!ticket) {
      return reply.code(409).send({ error: "Ticket not found for voter" });
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
      voter: body.voter,
      txId: `demo-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString()
    };

    ticket.spentAt = report.createdAt;
    store.reports.unshift(report);
    await store.save();
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
