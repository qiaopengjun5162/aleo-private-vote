"use client";

import { CheckCircle2, ExternalLink, Fingerprint, History, RefreshCw, ShieldCheck, Ticket, Vote } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { transactionStatusLabels, type TestnetTransactionStatusResponse } from "@/transactionStatus";
import { AleoWalletButton, useAleoWallet } from "@/wallet/AleoWalletProvider";
import { type WalletTransactionHistoryEntry } from "@/walletTransactionHistory";
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
const programId = "private_vote.aleo";
const executionFunction = "main";
const executionFee = 35_000;
const executionFeeLabel = "35,000 public fee units";
const testnetExplorerBaseUrl = "https://testnet.explorer.provable.com/transaction";
const transactionStatusPollIntervalMs = 5_000;
const transactionStatusMaxChecks = 24;

type ExecutionStatus = "idle" | "local-check" | "wallet-approval" | "submitted" | "failed";
type WalletHistoryStatus = "idle" | "loading" | "loaded" | "failed";

const executionStatusLabels: Record<ExecutionStatus, string> = {
  idle: "Ready after ticket",
  "local-check": "Running local Aleo check",
  "wallet-approval": "Waiting for wallet approval",
  submitted: "Submitted to testnet",
  failed: "Execution failed"
};

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
  const {
    connected: walletConnected,
    executeTransaction,
    publicKey,
    requestTransactionHistory
  } = useAleoWallet();
  const [proposal, setProposal] = useState<Proposal>(fallbackProposal);
  const [ticket, setTicket] = useState<TicketReceipt | null>(null);
  const [choice, setChoice] = useState<VoteChoice>("agree");
  const [report, setReport] = useState<VoteReport | null>(null);
  const [proofResult, setProofResult] = useState<string>("not-run");
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");
  const [message, setMessage] = useState<string>("Loading backend proposal...");
  const [isIssuing, setIsIssuing] = useState(false);
  const [isProving, setIsProving] = useState(false);
  const [onChainTxId, setOnChainTxId] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>("idle");
  const [transactionStatus, setTransactionStatus] = useState<TestnetTransactionStatusResponse | null>(null);
  const [walletHistory, setWalletHistory] = useState<WalletTransactionHistoryEntry[]>([]);
  const [walletHistoryStatus, setWalletHistoryStatus] = useState<WalletHistoryStatus>("idle");
  const [walletHistoryMessage, setWalletHistoryMessage] = useState("Connect a wallet to load private_vote.aleo history.");

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

  useEffect(() => {
    if (!onChainTxId) {
      setTransactionStatus(null);
      return;
    }

    const trackedTxId = onChainTxId;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function checkTransaction(attempt: number) {
      setTransactionStatus((current) =>
        current?.status === "accepted"
          ? current
          : {
              txId: trackedTxId,
              status: "checking",
              message: "Checking the transaction against the testnet API.",
              checkedAt: new Date().toISOString()
            }
      );

      try {
        const status = await readJson<TestnetTransactionStatusResponse>(
          await fetch(`/api/testnet/transactions/${trackedTxId}`, {
            cache: "no-store"
          })
        );
        if (cancelled) return;

        setTransactionStatus(status);
        if (status.status === "accepted" || attempt >= transactionStatusMaxChecks) {
          return;
        }
      } catch (error) {
        if (cancelled) return;

        setTransactionStatus({
          txId: trackedTxId,
          status: "unavailable",
          message: error instanceof Error ? error.message : "Unable to check transaction status.",
          checkedAt: new Date().toISOString()
        });
        return;
      }

      timeoutId = setTimeout(() => void checkTransaction(attempt + 1), transactionStatusPollIntervalMs);
    }

    void checkTransaction(1);

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [onChainTxId]);

  useEffect(() => {
    if (walletConnected) {
      setWalletHistory([]);
      setWalletHistoryStatus("idle");
      setWalletHistoryMessage("Wallet connected. Load private_vote.aleo history from your wallet.");
      return;
    }

    setWalletHistory([]);
    setWalletHistoryStatus("idle");
    setWalletHistoryMessage("Connect a wallet to load private_vote.aleo history.");
  }, [walletConnected, publicKey]);

  const agreePercent = useMemo(
    () => calculateAgreePercent(proposal.agreeVotes, proposal.disagreeVotes),
    [proposal.agreeVotes, proposal.disagreeVotes]
  );
  const plannedVoteCounts = useMemo(() => nextVoteCounts(proposal, choice), [proposal, choice]);
  const plannedExecutionInputs = useMemo(
    () => [`${plannedVoteCounts.agreeVotes}u64`, `${plannedVoteCounts.disagreeVotes}u64`],
    [plannedVoteCounts]
  );
  const visibleWalletHistory = walletHistory.slice(0, 4);

  async function loadWalletTransactionHistory() {
    if (!walletConnected) {
      setWalletHistoryMessage("Connect an Aleo wallet before loading transaction history.");
      return;
    }

    setWalletHistoryStatus("loading");
    setWalletHistoryMessage("Loading private_vote.aleo history from the connected wallet...");

    try {
      const history = await requestTransactionHistory(programId);
      setWalletHistory(history);
      setWalletHistoryStatus("loaded");
      setWalletHistoryMessage(
        history.length > 0
          ? `Loaded ${history.length} private_vote.aleo transaction${history.length === 1 ? "" : "s"} from wallet history.`
          : "No private_vote.aleo transactions were returned by this wallet."
      );
    } catch (error) {
      setWalletHistoryStatus("failed");
      setWalletHistoryMessage(error instanceof Error ? error.message : "Unable to load wallet transaction history.");
    }
  }

  async function issueTicket() {
    if (!walletConnected || !publicKey) {
      setMessage("Connect an Aleo wallet before issuing a private ticket.");
      return;
    }

    setIsIssuing(true);
    setReport(null);
    setOnChainTxId(null);
    setTransactionStatus(null);
    setExecutionStatus("idle");
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
    if (!walletConnected || !publicKey) {
      setMessage("Connect an Aleo wallet before casting a private vote.");
      return;
    }

    setIsProving(true);
    setOnChainTxId(null);
    setTransactionStatus(null);
    setExecutionStatus("local-check");
    setMessage("Running local Aleo check before opening your wallet...");

    try {
      const program = await readProgram();
      const worker = AleoWorker();
      const [output] = await worker.localProgramExecution(program, executionFunction, plannedExecutionInputs);

      setProofResult(output);
      if (output !== "true") {
        throw new Error(`Local Aleo execution rejected the vote: ${output}`);
      }

      setExecutionStatus("wallet-approval");
      setMessage("Open your Aleo wallet and approve the testnet execution...");
      const txId = await executeTransaction({
        program: programId,
        function: executionFunction,
        inputs: plannedExecutionInputs,
        fee: executionFee,
        privateFee: false
      });
      setOnChainTxId(txId);
      setExecutionStatus("submitted");
      void loadWalletTransactionHistory();

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

        setReport({
          ...serverReport,
          txId
        });
        setProposal((current) => mergeReportTally(current, serverReport, plannedVoteCounts));
        setMessage("Wallet execution submitted and backend report stored");
      } else {
        setReport({
          id: `report-${Date.now()}`,
          proposalId: proposal.id,
          vote: choice,
          status: "verified",
          ticketCommitment: ticket.ticketCommitment,
          txId,
          createdAt: new Date().toISOString()
        });
        setProposal((current) => ({
          ...current,
          agreeVotes: plannedVoteCounts.agreeVotes,
          disagreeVotes: plannedVoteCounts.disagreeVotes
        }));
        setMessage("Wallet execution submitted; tally updated locally because backend is offline");
      }

      setTicket(null);
    } catch (error) {
      setProofResult(error instanceof Error ? error.message : String(error));
      setExecutionStatus("failed");
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
        <div className="flex flex-col items-start gap-3 md:items-end">
          <AleoWalletButton />
          <Badge>
            <ShieldCheck size={16} />
            {walletConnected ? (apiStatus === "connected" ? "wallet + on-chain + backend" : "wallet + on-chain") : "wallet required"}
          </Badge>
        </div>
      </section>

      <section className="mx-auto mb-6 grid max-w-6xl gap-3 md:grid-cols-3">
        {[
          ["1", walletConnected ? "Wallet connected" : "Connect Aleo wallet"],
          ["2", ticket ? "Ticket ready" : "Issue ticket"],
          ["3", transactionStatus?.status === "accepted" ? "Execution accepted" : onChainTxId ? "Execution submitted" : "Approve wallet execution"]
        ].map(([step, label]) => (
          <div key={step} className="flex items-center gap-3 rounded-md border border-stone-950 bg-white p-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#d9ff65] text-sm font-black">{step}</span>
            <strong className="text-sm">{label}</strong>
          </div>
        ))}
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
              <Button disabled={!walletConnected || isIssuing || isProving} onClick={issueTicket}>
                <Ticket size={16} />
                {isIssuing ? "Issuing..." : walletConnected ? "Issue ticket" : "Connect wallet first"}
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

            <Button
              className="w-full"
              disabled={!walletConnected || !ticket || isProving}
              onClick={castVote}
              size="lg"
              variant="primary"
            >
              <Fingerprint size={18} />
              {isProving ? "Generating proof..." : walletConnected ? "Cast private vote" : "Connect wallet to vote"}
            </Button>

            <p className="mt-4 text-sm font-black text-[#6f3d2f]">{message}</p>

            <div className="mt-6 rounded-md border border-stone-950 bg-white p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase text-[#6f3d2f]">Wallet execution request</p>
                  <strong className="mt-1 block text-lg">{executionStatusLabels[executionStatus]}</strong>
                </div>
                <span className="w-fit rounded-sm border border-stone-950 bg-[#d9ff65] px-2 py-1 text-xs font-black uppercase">
                  testnet
                </span>
              </div>
              <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <dt className="font-bold text-stone-600">Program</dt>
                  <dd className="font-mono [overflow-wrap:anywhere]">{programId}</dd>
                </div>
                <div>
                  <dt className="font-bold text-stone-600">Function</dt>
                  <dd className="font-mono">{executionFunction}</dd>
                </div>
                <div>
                  <dt className="font-bold text-stone-600">Inputs</dt>
                  <dd className="font-mono [overflow-wrap:anywhere]">{plannedExecutionInputs.join(", ")}</dd>
                </div>
                <div>
                  <dt className="font-bold text-stone-600">Fee</dt>
                  <dd className="font-mono">{executionFeeLabel}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs font-bold text-stone-600">
                The wallet request uses a public fee and asks the connected wallet to execute the deployed verifier.
              </p>
              {onChainTxId ? (
                <div className="mt-4 rounded-md border border-stone-950 bg-[#eef0e8] p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase text-[#6f3d2f]">Testnet transaction status</p>
                      <strong className="mt-1 block text-sm">
                        {transactionStatus ? transactionStatusLabels[transactionStatus.status] : "Checking testnet status"}
                      </strong>
                    </div>
                    {transactionStatus?.type ? (
                      <span className="w-fit rounded-sm border border-stone-950 bg-white px-2 py-1 text-xs font-black uppercase">
                        {transactionStatus.type}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs font-bold text-stone-600">
                    {transactionStatus?.message ?? "Checking the transaction against the testnet API."}
                  </p>
                  {transactionStatus?.program || transactionStatus?.functionName ? (
                    <p className="mt-2 font-mono text-xs text-stone-700 [overflow-wrap:anywhere]">
                      {[transactionStatus.program, transactionStatus.functionName].filter(Boolean).join("/")}
                    </p>
                  ) : null}
                  <a
                    className="mt-3 inline-flex items-center gap-2 text-sm font-black text-[#6f3d2f] underline"
                    href={`${testnetExplorerBaseUrl}/${onChainTxId}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    View submitted execution
                    <ExternalLink size={14} />
                  </a>
                </div>
              ) : null}
              <div className="mt-4 rounded-md border border-stone-950 bg-white p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="inline-flex items-center gap-2 text-xs font-black uppercase text-[#6f3d2f]">
                      <History size={14} />
                      Wallet transaction history
                    </p>
                    <strong className="mt-1 block text-sm">
                      {walletHistoryStatus === "loading"
                        ? "Loading from wallet"
                        : walletHistoryStatus === "loaded"
                          ? `${walletHistory.length} transaction${walletHistory.length === 1 ? "" : "s"}`
                          : walletHistoryStatus === "failed"
                            ? "History unavailable"
                            : "Ready to load"}
                    </strong>
                  </div>
                  <Button
                    className="w-fit"
                    disabled={!walletConnected || walletHistoryStatus === "loading"}
                    onClick={() => void loadWalletTransactionHistory()}
                    type="button"
                    variant="outline"
                  >
                    <RefreshCw className={walletHistoryStatus === "loading" ? "animate-spin" : ""} size={14} />
                    Refresh history
                  </Button>
                </div>
                <p className="mt-2 text-xs font-bold text-stone-600">{walletHistoryMessage}</p>
                {visibleWalletHistory.length > 0 ? (
                  <div className="mt-3 grid gap-2">
                    {visibleWalletHistory.map((transaction) => (
                      <a
                        className="flex items-center justify-between gap-3 rounded-md border border-stone-950 bg-[#eef0e8] px-3 py-2 text-xs font-black text-[#6f3d2f] underline"
                        href={`${testnetExplorerBaseUrl}/${transaction.transactionId}`}
                        key={`${transaction.id}-${transaction.transactionId}`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <span className="min-w-0 truncate">{transaction.transactionId}</span>
                        <ExternalLink className="shrink-0" size={14} />
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
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
                  {onChainTxId ? (
                    <a
                      className="mb-3 inline-flex items-center gap-2 text-sm font-black text-[#d9ff65] underline"
                      href={`${testnetExplorerBaseUrl}/${onChainTxId}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      View wallet execution
                      <ExternalLink size={14} />
                    </a>
                  ) : null}
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
