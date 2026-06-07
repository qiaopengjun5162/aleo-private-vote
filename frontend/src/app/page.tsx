"use client";

import { CheckCircle2, Fingerprint, ShieldCheck, Ticket, Vote } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AleoWorker } from "@/workers/AleoWorker";
import {
  calculateAgreePercent,
  fallbackProposal,
  mergeReportTally,
  nextVoteCounts,
  type ApiStatus,
  type Proposal,
  type TicketReceipt,
  type VoteChoice,
  type VoteReport
} from "@/voteFlow";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8787";

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function readProgram() {
  const response = await fetch("/programs/private_vote.aleo");
  if (!response.ok) {
    throw new Error(`Program fetch failed: ${response.status}`);
  }

  return response.text();
}

export default function Home() {
  const [proposal, setProposal] = useState<Proposal>(fallbackProposal);
  const [ticket, setTicket] = useState<TicketReceipt | null>(null);
  const [choice, setChoice] = useState<VoteChoice>("agree");
  const [report, setReport] = useState<VoteReport | null>(null);
  const [proofResult, setProofResult] = useState<string>("not-run");
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");
  const [message, setMessage] = useState<string>("Loading backend proposal...");
  const [isIssuing, setIsIssuing] = useState(false);
  const [isProving, setIsProving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProposal() {
      try {
        const proposals = await readJson<Proposal[]>(await fetch(`${apiBaseUrl}/api/proposals`));
        if (cancelled) return;

        setProposal(proposals[0] ?? fallbackProposal);
        setApiStatus("connected");
        setMessage("Backend API connected");
      } catch (error) {
        if (cancelled) return;

        setApiStatus("demo");
        setMessage(error instanceof Error ? `Demo mode: ${error.message}` : "Demo mode: backend unavailable");
      }
    }

    void loadProposal();

    return () => {
      cancelled = true;
    };
  }, []);

  const agreePercent = useMemo(
    () => calculateAgreePercent(proposal.agreeVotes, proposal.disagreeVotes),
    [proposal.agreeVotes, proposal.disagreeVotes]
  );

  async function issueTicket() {
    setIsIssuing(true);
    setReport(null);
    setMessage(apiStatus === "connected" ? "Requesting a backend ticket..." : "Issuing a local demo ticket...");

    try {
      if (apiStatus === "connected") {
        const receipt = await readJson<TicketReceipt>(
          await fetch(`${apiBaseUrl}/api/tickets`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ proposalId: proposal.id })
          })
        );

        setTicket(receipt);
        setProposal((current) => ({
          ...current,
          ticketsIssued: receipt.ticketsIssued
        }));
        setMessage("Private ticket issued by backend API");
        return;
      }

      const receipt = {
        proposalId: proposal.id,
        ticketCommitment: `ticket-${crypto.randomUUID()}`,
        ticketsIssued: proposal.ticketsIssued + 1,
        issuedAt: new Date().toISOString()
      };
      setTicket(receipt);
      setProposal((current) => ({
        ...current,
        ticketsIssued: current.ticketsIssued + 1
      }));
      setMessage("Private ticket issued locally for demo mode");
    } catch (error) {
      setApiStatus("demo");
      setMessage(error instanceof Error ? `Backend ticket failed, switched to demo mode: ${error.message}` : "Backend ticket failed");
    } finally {
      setIsIssuing(false);
    }
  }

  async function castVote() {
    if (!ticket) return;

    setIsProving(true);
    setMessage("Running Aleo SDK local execution in a Web Worker...");

    try {
      const nextCounts = nextVoteCounts(proposal, choice);
      const program = await readProgram();
      const worker = AleoWorker();
      const [output] = await worker.localProgramExecution(program, "main", [
        `${nextCounts.agreeVotes}u64`,
        `${nextCounts.disagreeVotes}u64`
      ]);

      setProofResult(output);

      if (apiStatus === "connected") {
        const serverReport = await readJson<VoteReport>(
          await fetch(`${apiBaseUrl}/api/reports`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              proposalId: proposal.id,
              vote: choice,
              ticketCommitment: ticket.ticketCommitment
            })
          })
        );

        setReport(serverReport);
        setProposal((current) => mergeReportTally(current, serverReport, nextCounts));
        setMessage("Vote proof accepted and report stored by backend");
      } else {
        setReport({
          id: `report-${Date.now()}`,
          proposalId: proposal.id,
          vote: choice,
          status: "verified",
          ticketCommitment: ticket.ticketCommitment,
          txId: `demo-${crypto.randomUUID()}`,
          createdAt: new Date().toISOString()
        });
        setProposal((current) => ({
          ...current,
          agreeVotes: nextCounts.agreeVotes,
          disagreeVotes: nextCounts.disagreeVotes
        }));
        setMessage("Vote proof accepted in local demo mode");
      }

      setTicket(null);
    } catch (error) {
      setProofResult(error instanceof Error ? error.message : String(error));
      setMessage(error instanceof Error ? error.message : "Aleo SDK execution failed");
    } finally {
      setIsProving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#eef0e8] bg-[linear-gradient(90deg,rgba(28,25,23,0.08)_1px,transparent_1px),linear-gradient(rgba(28,25,23,0.08)_1px,transparent_1px)] bg-[size:42px_42px] px-5 py-10 text-stone-950 md:px-10">
      <section className="mx-auto mb-8 flex max-w-6xl flex-col justify-between gap-6 md:flex-row md:items-start">
        <div>
          <p className="mb-3 text-xs font-black uppercase text-[#6f3d2f]">private voting on Aleo</p>
          <h1 className="max-w-3xl font-serif text-6xl leading-[0.9] tracking-tight md:text-8xl">
            Aleo Private Vote
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-700">
            A ticket-backed voting room where the voter identity stays private and the public tally remains
            verifiable.
          </p>
        </div>
        <Badge>
          <ShieldCheck size={16} />
          {apiStatus === "connected" ? "backend + sdk" : "sdk demo mode"}
        </Badge>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardContent>
            <CardHeader className="mb-6">
              <div className="inline-flex items-center gap-2 text-sm font-black text-[#6f3d2f]">
                <Vote size={20} />
                Proposal
              </div>
              <CardTitle>{proposal.title}</CardTitle>
            </CardHeader>

            <p className="leading-7 text-stone-700">{proposal.description}</p>

            <div className="my-6 grid gap-3 rounded-md bg-[#f4e4cf] p-4 md:grid-cols-[96px_1fr]">
              <span className="font-bold text-stone-700">Proposer</span>
              <code className="overflow-hidden text-ellipsis whitespace-nowrap text-sm">
                {proposal.proposer.slice(0, 18)}...{proposal.proposer.slice(-8)}
              </code>
            </div>

            <div className="grid items-center gap-4 rounded-md border border-stone-950 bg-white p-5 md:grid-cols-[1fr_auto]">
              <div>
                <p className="text-xs font-black uppercase text-[#6f3d2f]">Private ticket</p>
                <strong className="mt-1 block text-xl">{ticket ? "Issued" : "Not issued"}</strong>
                {ticket ? (
                  <code className="mt-2 block max-w-xs overflow-hidden text-ellipsis whitespace-nowrap text-xs text-stone-600">
                    {ticket.ticketCommitment}
                  </code>
                ) : null}
              </div>
              <Button disabled={isIssuing || isProving} onClick={issueTicket}>
                <Ticket size={16} />
                {isIssuing ? "Issuing..." : "Issue ticket"}
              </Button>
            </div>

            <div className="my-6 grid grid-cols-2 gap-2">
              <Button variant={choice === "agree" ? "default" : "outline"} onClick={() => setChoice("agree")}>
                Agree
              </Button>
              <Button variant={choice === "disagree" ? "default" : "outline"} onClick={() => setChoice("disagree")}>
                Disagree
              </Button>
            </div>

            <Button className="w-full" disabled={!ticket || isProving} onClick={castVote} size="lg" variant="primary">
              <Fingerprint size={18} />
              {isProving ? "Generating proof..." : "Cast private vote"}
            </Button>

            <p className="mt-4 text-sm font-black text-[#6f3d2f]">{message}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="mb-6 inline-flex items-center gap-2 text-sm font-black text-[#6f3d2f]">
              <CheckCircle2 size={20} />
              Public tally
            </div>

            <Progress value={agreePercent} />

            <div className="my-6 grid grid-cols-3 gap-3">
              {[
                ["Agree", proposal.agreeVotes],
                ["Disagree", proposal.disagreeVotes],
                ["Tickets", proposal.ticketsIssued]
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-stone-950 bg-white p-4">
                  <span className="block text-xs font-bold text-stone-600">{label}</span>
                  <strong className="mt-2 block text-3xl">{value}</strong>
                </div>
              ))}
            </div>

            <div className="min-h-44 rounded-md bg-stone-950 p-5 text-white">
              <p className="text-xs font-black uppercase text-[#d9ff65]">Verification report</p>
              {report ? (
                <>
                  <h3 className="my-3 text-2xl font-black">Vote proof accepted</h3>
                  <code className="mb-2 block [overflow-wrap:anywhere]">{report.id}</code>
                  <code className="mb-2 block [overflow-wrap:anywhere]">{report.txId}</code>
                  <code className="mb-3 block [overflow-wrap:anywhere]">private_vote.aleo/main =&gt; {proofResult}</code>
                  <span className="text-sm text-[#d9ff65]">
                    The vote was counted without exposing voter identity.
                  </span>
                </>
              ) : (
                <>
                  <h3 className="my-3 text-2xl font-black">Awaiting private vote</h3>
                  <span className="text-sm text-[#d9ff65]">Issue a ticket and cast a vote to generate a report.</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
