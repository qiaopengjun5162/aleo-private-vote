import { CheckCircle2, Fingerprint, ShieldCheck, Ticket, Vote } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import privateVoteProgram from "../../leo/private_vote/build/main.aleo?raw";
import "./styles.css";
import { AleoWorker } from "./workers/AleoWorker";
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
} from "./voteFlow";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8787";

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function App() {
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
      const worker = AleoWorker();
      const [output] = await worker.localProgramExecution(privateVoteProgram, "main", [
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
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">private voting on Aleo</p>
          <h1>Aleo Private Vote</h1>
          <p className="lede">
            Cast a private ticket-backed vote while the public tally stays verifiable.
          </p>
        </div>
        <div className="program-pill">
          <ShieldCheck size={18} />
          <span>{apiStatus === "connected" ? "backend + sdk" : "sdk demo mode"}</span>
        </div>
      </section>

      <section className="workspace">
        <div className="panel voting-panel">
          <div className="panel-title">
            <Vote size={20} />
            <span>Proposal</span>
          </div>
          <h2>{proposal.title}</h2>
          <p>{proposal.description}</p>
          <div className="address-row">
            <span>Proposer</span>
            <code>{proposal.proposer.slice(0, 18)}...{proposal.proposer.slice(-8)}</code>
          </div>

          <div className="ticket-box">
            <div>
              <p className="label">Private ticket</p>
              <strong>{ticket ? "Issued" : "Not issued"}</strong>
              {ticket ? <code>{ticket.ticketCommitment}</code> : null}
            </div>
            <button disabled={isIssuing || isProving} onClick={issueTicket}>
              <Ticket size={16} />
              {isIssuing ? "Issuing..." : "Issue ticket"}
            </button>
          </div>

          <div className="segmented" role="group" aria-label="Vote choice">
            <button className={choice === "agree" ? "active" : ""} onClick={() => setChoice("agree")}>
              Agree
            </button>
            <button className={choice === "disagree" ? "active" : ""} onClick={() => setChoice("disagree")}>
              Disagree
            </button>
          </div>

          <button className="primary" disabled={!ticket || isProving} onClick={castVote}>
            <Fingerprint size={18} />
            {isProving ? "Generating proof..." : "Cast private vote"}
          </button>

          <p className="status-line">{message}</p>
        </div>

        <div className="panel tally-panel">
          <div className="panel-title">
            <CheckCircle2 size={20} />
            <span>Public tally</span>
          </div>
          <div className="meter">
            <div style={{ width: `${agreePercent}%` }} />
          </div>
          <div className="stats">
            <div>
              <span>Agree</span>
              <strong>{proposal.agreeVotes}</strong>
            </div>
            <div>
              <span>Disagree</span>
              <strong>{proposal.disagreeVotes}</strong>
            </div>
            <div>
              <span>Tickets</span>
              <strong>{proposal.ticketsIssued}</strong>
            </div>
          </div>

          <div className="report">
            <p className="label">Verification report</p>
            {report ? (
              <>
                <h3>Vote proof accepted</h3>
                <code>{report.id}</code>
                <code>{report.txId}</code>
                <code>private_vote.aleo/main =&gt; {proofResult}</code>
                <span>The vote was counted without exposing voter identity.</span>
              </>
            ) : (
              <>
                <h3>Awaiting private vote</h3>
                <span>Issue a ticket and cast a vote to generate a report.</span>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
