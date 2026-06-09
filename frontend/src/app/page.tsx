"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Fingerprint,
  Flag,
  History,
  KeyRound,
  ListChecks,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Ticket,
  Vote
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { createRecoveryNotice, type RecoveryNotice } from "@/recovery";
import {
  isAleoTransactionId,
  resolveOnChainTransactionId,
  transactionStatusLabels,
  walletExecutionStatusLabel,
  type TestnetTransactionStatusResponse,
  type WalletTransactionStatusLike
} from "@/transactionStatus";
import { AleoWalletButton, useAleoWallet } from "@/wallet/AleoWalletProvider";
import { type WalletTransactionHistoryEntry } from "@/walletTransactionHistory";
import {
  clearVoteSession,
  createVoteSessionSnapshot,
  hasLocalVote,
  readVoteSession,
  recordLocalVote,
  writeVoteSession,
  type LocalVoteRecord
} from "@/voteSession";
import {
  bytesToHex,
  createWalletSignatureChallenge,
  encodeWalletSignatureChallenge,
  verifyWalletSignatureProof
} from "@/walletSignature";
import { AleoWorker } from "@/workers/AleoWorker";
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
const walletStatusPollIntervalMs = 5_000;
const walletStatusMaxChecks = 24;

type ExecutionStatus = "idle" | "local-check" | "wallet-approval" | "submitted" | "failed";
type WalletHistoryStatus = "idle" | "loading" | "loaded" | "failed";
type WalletSignatureStatus = "idle" | "signing" | "verified" | "failed";

type WalletSignatureProof = {
  challenge: string;
  signatureHex: string;
  signedAt: string;
  verified: boolean;
};

const executionStatusLabels: Record<ExecutionStatus, string> = {
  idle: "Ready after ticket",
  "local-check": "Running local Aleo check",
  "wallet-approval": "Waiting for wallet approval",
  submitted: "Submitted to testnet",
  failed: "Execution failed"
};

const recoveryToneClasses: Record<RecoveryNotice["tone"], string> = {
  danger: "border-[#9f2d1d] bg-[#f4c8be]",
  info: "border-stone-950 bg-[#eef0e8]",
  warning: "border-stone-950 bg-[#f4e4cf]"
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
    error: walletError,
    executeTransaction,
    publicKey,
    requestTransactionHistory,
    signMessage,
    transactionStatus: checkWalletTransactionStatus
  } = useAleoWallet();
  const [proposals, setProposals] = useState<Proposal[]>([fallbackProposal]);
  const [selectedProposalId, setSelectedProposalId] = useState(fallbackProposal.id);
  const [ticket, setTicket] = useState<TicketReceipt | null>(null);
  const [choice, setChoice] = useState<VoteChoice>("agree");
  const [report, setReport] = useState<VoteReport | null>(null);
  const [proofResult, setProofResult] = useState<string>("not-run");
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");
  const [message, setMessage] = useState<string>("Loading backend proposal...");
  const [isIssuing, setIsIssuing] = useState(false);
  const [isProving, setIsProving] = useState(false);
  const [walletExecutionId, setWalletExecutionId] = useState<string | null>(null);
  const [walletAdapterStatus, setWalletAdapterStatus] = useState<WalletTransactionStatusLike | null>(null);
  const [walletStatusMessage, setWalletStatusMessage] = useState("Wallet execution status is available after approval.");
  const [onChainTxId, setOnChainTxId] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>("idle");
  const [testnetTransactionStatus, setTestnetTransactionStatus] = useState<TestnetTransactionStatusResponse | null>(null);
  const [walletHistory, setWalletHistory] = useState<WalletTransactionHistoryEntry[]>([]);
  const [walletHistoryStatus, setWalletHistoryStatus] = useState<WalletHistoryStatus>("idle");
  const [walletHistoryMessage, setWalletHistoryMessage] = useState("Connect a wallet to load private_vote.aleo history.");
  const [walletSignatureStatus, setWalletSignatureStatus] = useState<WalletSignatureStatus>("idle");
  const [walletSignatureProof, setWalletSignatureProof] = useState<WalletSignatureProof | null>(null);
  const [walletSignatureMessage, setWalletSignatureMessage] = useState("Connect a wallet to sign an ownership challenge.");
  const [recoveryNotice, setRecoveryNotice] = useState<RecoveryNotice | null>(null);
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalDescription, setProposalDescription] = useState("");
  const [isCreatingProposal, setIsCreatingProposal] = useState(false);
  const [isClosingProposal, setIsClosingProposal] = useState(false);
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const [localSessionSavedAt, setLocalSessionSavedAt] = useState<string | null>(null);
  const [localVotes, setLocalVotes] = useState<LocalVoteRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    const savedSession = readVoteSession();

    if (savedSession) {
      setProposals(savedSession.proposals);
      setSelectedProposalId(savedSession.selectedProposalId);
      setChoice(savedSession.choice);
      setTicket(savedSession.ticket);
      setReport(savedSession.report);
      setProofResult(savedSession.proofResult);
      setWalletExecutionId(savedSession.walletExecutionId);
      setOnChainTxId(savedSession.onChainTxId);
      setLocalVotes(savedSession.localVotes);
      setLocalSessionSavedAt(savedSession.savedAt);
      setMessage("Local voting workspace restored");
    }
    setSessionHydrated(true);

    async function loadProposal() {
      try {
        const loadedProposals = await readJson<Proposal[]>(await fetch(`${apiBaseUrl}/api/proposals`));
        if (cancelled) return;

        const nextProposals = loadedProposals.length > 0 ? loadedProposals : [fallbackProposal];
        setProposals(nextProposals);
        setSelectedProposalId((current) =>
          nextProposals.some((proposal) => proposal.id === current) ? current : nextProposals[0].id
        );
        setApiStatus("connected");
        setMessage("Backend API connected");
      } catch (error) {
        if (cancelled) return;

        setApiStatus("demo");
        setMessage(
          savedSession
            ? "Demo mode: restored local voting workspace"
            : error instanceof Error
              ? `Demo mode: ${error.message}`
              : "Demo mode: backend unavailable"
        );
      }
    }

    void loadProposal();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!onChainTxId) {
      setTestnetTransactionStatus(null);
      return;
    }

    const trackedTxId = onChainTxId;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function checkTransaction(attempt: number) {
      setTestnetTransactionStatus((current) =>
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

        setTestnetTransactionStatus(status);
        if (status.status === "unavailable") {
          setRecoveryNotice(createRecoveryNotice(status.message, "testnet-status"));
        }
        if (status.status === "accepted") {
          setRecoveryNotice(null);
        }
        if (status.status === "accepted" || attempt >= transactionStatusMaxChecks) {
          return;
        }
      } catch (error) {
        if (cancelled) return;

        setRecoveryNotice(createRecoveryNotice(error, "testnet-status"));
        setTestnetTransactionStatus({
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
    if (!walletExecutionId) {
      setWalletAdapterStatus(null);
      setWalletStatusMessage("Wallet execution status is available after approval.");
      setOnChainTxId(null);
      return;
    }

    const trackedWalletExecutionId = walletExecutionId;
    const immediateOnChainTxId = isAleoTransactionId(trackedWalletExecutionId) ? trackedWalletExecutionId : null;

    if (!walletConnected) {
      setWalletAdapterStatus({
        status: "submitted",
        transactionId: immediateOnChainTxId ?? undefined
      });
      setWalletStatusMessage("Reconnect the same wallet to refresh wallet execution status.");
      setOnChainTxId((current) => current ?? immediateOnChainTxId);
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    setWalletAdapterStatus({
      status: "submitted",
      transactionId: immediateOnChainTxId ?? undefined
    });
    setWalletStatusMessage(
      immediateOnChainTxId
        ? "The wallet returned an on-chain transaction id."
        : "The wallet returned a temporary execution id. Resolving the on-chain transaction id..."
    );
    setOnChainTxId(immediateOnChainTxId);

    async function checkWalletStatus(attempt: number) {
      try {
        const status = await checkWalletTransactionStatus(trackedWalletExecutionId);
        if (cancelled) return;

        setWalletAdapterStatus(status);
        const resolvedOnChainTxId = resolveOnChainTransactionId(trackedWalletExecutionId, status);
        if (resolvedOnChainTxId) {
          setOnChainTxId(resolvedOnChainTxId);
          setRecoveryNotice(null);
        }

        setWalletStatusMessage(
          status.error ??
            (resolvedOnChainTxId
              ? "Wallet status resolved the on-chain transaction id."
              : attempt >= walletStatusMaxChecks
                ? "Wallet status did not return an on-chain transaction id before polling stopped."
                : "Waiting for the wallet to resolve the on-chain transaction id.")
        );

        const normalizedStatus = status.status?.toLowerCase() ?? "";
        const isFinalStatus =
          normalizedStatus.includes("accept") ||
          normalizedStatus.includes("complete") ||
          normalizedStatus.includes("success") ||
          normalizedStatus.includes("fail") ||
          normalizedStatus.includes("reject") ||
          normalizedStatus.includes("error");
        if (resolvedOnChainTxId || isFinalStatus || attempt >= walletStatusMaxChecks) {
          return;
        }
      } catch (error) {
        if (cancelled) return;

        setRecoveryNotice(createRecoveryNotice(error, "wallet-status"));
        setWalletStatusMessage(
          error instanceof Error ? error.message : "Unable to check wallet execution status."
        );
        return;
      }

      timeoutId = setTimeout(() => void checkWalletStatus(attempt + 1), walletStatusPollIntervalMs);
    }

    void checkWalletStatus(1);

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [walletConnected, walletExecutionId, checkWalletTransactionStatus]);

  useEffect(() => {
    if (!sessionHydrated || apiStatus === "checking") return;

    const snapshot = createVoteSessionSnapshot({
      proposals,
      selectedProposalId,
      choice,
      ticket,
      report,
      proofResult,
      walletExecutionId,
      onChainTxId,
      localVotes
    });
    if (!snapshot) return;

    writeVoteSession(snapshot);
    setLocalSessionSavedAt(snapshot.savedAt);
  }, [
    apiStatus,
    choice,
    localVotes,
    onChainTxId,
    proofResult,
    proposals,
    report,
    selectedProposalId,
    sessionHydrated,
    ticket,
    walletExecutionId
  ]);

  useEffect(() => {
    if (walletConnected) {
      setRecoveryNotice(null);
      setWalletHistory([]);
      setWalletHistoryStatus("idle");
      setWalletHistoryMessage("Wallet connected. Load private_vote.aleo history from your wallet.");
      setWalletSignatureStatus("idle");
      setWalletSignatureProof(null);
      setWalletSignatureMessage("Sign a challenge to prove control of the connected Aleo address.");
      return;
    }

    setWalletHistory([]);
    setWalletHistoryStatus("idle");
    setWalletHistoryMessage("Connect a wallet to load private_vote.aleo history.");
    setWalletSignatureStatus("idle");
    setWalletSignatureProof(null);
    setWalletSignatureMessage("Connect a wallet to sign an ownership challenge.");
  }, [walletConnected, publicKey]);

  useEffect(() => {
    if (!walletError) return;
    setRecoveryNotice(createRecoveryNotice(walletError, "wallet-connect"));
  }, [walletError]);

  const proposal = useMemo(
    () => proposals.find((item) => item.id === selectedProposalId) ?? proposals[0] ?? fallbackProposal,
    [proposals, selectedProposalId]
  );
  const proposalCanReceiveVotes = canVoteOnProposal(proposal);
  const proposalStatus = proposalStatusLabel(proposal);
  const currentOutcome = proposalOutcome(proposal);
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
  const walletAlreadyVoted = Boolean(publicKey && hasLocalVote(localVotes, proposal.id, publicKey));
  const localSessionStatus = apiStatus === "connected"
    ? "Backend source"
    : localSessionSavedAt
      ? "Local workspace saved"
      : "Local workspace";
  const canRetryRecovery = Boolean(
    recoveryNotice &&
      walletConnected &&
      (recoveryNotice.context === "wallet-signature" ||
        recoveryNotice.context === "wallet-history" ||
        (recoveryNotice.context === "wallet-execution" && ticket && !isProving))
  );

  function recoveryRetryLabel(notice: RecoveryNotice) {
    if (notice.context === "wallet-signature") return "Retry signature";
    if (notice.context === "wallet-history") return "Retry history";
    if (notice.context === "wallet-execution") return "Retry vote";
    return "Retry";
  }

  function retryRecovery() {
    if (!recoveryNotice || !canRetryRecovery) return;

    const context = recoveryNotice.context;
    setRecoveryNotice(null);
    if (context === "wallet-signature") {
      void proveWalletOwnership();
      return;
    }
    if (context === "wallet-history") {
      void loadWalletTransactionHistory();
      return;
    }
    if (context === "wallet-execution") {
      void castVote();
    }
  }

  function resetVoteSession(nextMessage?: string) {
    setTicket(null);
    setReport(null);
    setWalletExecutionId(null);
    setWalletAdapterStatus(null);
    setWalletStatusMessage("Wallet execution status is available after approval.");
    setOnChainTxId(null);
    setTestnetTransactionStatus(null);
    setExecutionStatus("idle");
    setProofResult("not-run");
    setRecoveryNotice(null);
    if (nextMessage) setMessage(nextMessage);
  }

  function resetLocalWorkspace() {
    clearVoteSession();
    setLocalVotes([]);
    setLocalSessionSavedAt(null);
    setChoice("agree");
    setProposalTitle("");
    setProposalDescription("");
    if (apiStatus !== "connected") {
      setProposals([fallbackProposal]);
      setSelectedProposalId(fallbackProposal.id);
    }
    resetVoteSession(
      apiStatus === "connected" ? "Local workspace reset. Backend proposals preserved." : "Local workspace reset."
    );
  }

  function updateProposal(updatedProposal: Proposal) {
    setProposals((current) => current.map((item) => (item.id === updatedProposal.id ? updatedProposal : item)));
  }

  function updateSelectedProposal(updater: (current: Proposal) => Proposal) {
    setProposals((current) => current.map((item) => (item.id === proposal.id ? updater(item) : item)));
  }

  function selectProposal(proposalId: string) {
    setSelectedProposalId(proposalId);
    resetVoteSession("Proposal selected. Issue a ticket before voting.");
  }

  async function createProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!walletConnected || !publicKey) {
      setMessage("Connect an Aleo wallet before creating a proposal.");
      setRecoveryNotice(createRecoveryNotice("Connect an Aleo wallet before creating a proposal.", "wallet-connect"));
      return;
    }

    const title = proposalTitle.trim();
    const description = proposalDescription.trim();
    if (title.length < 4 || description.length < 12) {
      setMessage("Proposal title and description are too short.");
      return;
    }

    setIsCreatingProposal(true);
    setRecoveryNotice(null);

    try {
      const createdProposal =
        apiStatus === "connected"
          ? await readJson<Proposal>(
              await fetch(`${apiBaseUrl}/api/proposals`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ description, proposer: publicKey, title })
              })
            )
          : createLocalProposal({ description, proposer: publicKey, title });

      setProposals((current) => [createdProposal, ...current]);
      setSelectedProposalId(createdProposal.id);
      setProposalTitle("");
      setProposalDescription("");
      resetVoteSession(apiStatus === "connected" ? "Proposal created by backend API." : "Proposal created locally for demo mode.");
    } catch (error) {
      const localProposal = createLocalProposal({ description, proposer: publicKey, title });
      setApiStatus("demo");
      setProposals((current) => [localProposal, ...current]);
      setSelectedProposalId(localProposal.id);
      setProposalTitle("");
      setProposalDescription("");
      resetVoteSession(
        error instanceof Error
          ? `Backend proposal failed, created a local demo proposal: ${error.message}`
          : "Backend proposal failed, created a local demo proposal."
      );
    } finally {
      setIsCreatingProposal(false);
    }
  }

  async function closeSelectedProposal() {
    if (!proposalCanReceiveVotes) return;

    setIsClosingProposal(true);
    setRecoveryNotice(null);

    try {
      const closedProposal =
        apiStatus === "connected"
          ? await readJson<Proposal>(
              await fetch(`${apiBaseUrl}/api/proposals/${proposal.id}/close`, {
                method: "POST"
              })
            )
          : closeProposal(proposal);

      updateProposal(closedProposal);
      resetVoteSession(`Proposal closed as ${closedProposal.status}.`);
    } catch (error) {
      const closedProposal = closeProposal(proposal);
      setApiStatus("demo");
      updateProposal(closedProposal);
      resetVoteSession(
        error instanceof Error
          ? `Backend close failed, closed locally as ${closedProposal.status}: ${error.message}`
          : `Backend close failed, closed locally as ${closedProposal.status}.`
      );
    } finally {
      setIsClosingProposal(false);
    }
  }

  async function loadWalletTransactionHistory() {
    if (!walletConnected) {
      setWalletHistoryMessage("Connect an Aleo wallet before loading transaction history.");
      setRecoveryNotice(createRecoveryNotice("Connect an Aleo wallet before loading transaction history.", "wallet-history"));
      return;
    }

    setRecoveryNotice(null);
    setWalletHistoryStatus("loading");
    setWalletHistoryMessage("Loading private_vote.aleo history from the connected wallet...");

    try {
      const history = await requestTransactionHistory(programId);
      setWalletHistory(history);
      setWalletHistoryStatus("loaded");
      setRecoveryNotice(null);
      setWalletHistoryMessage(
        history.length > 0
          ? `Loaded ${history.length} private_vote.aleo transaction${history.length === 1 ? "" : "s"} from wallet history.`
          : "No private_vote.aleo transactions were returned by this wallet."
      );
    } catch (error) {
      setRecoveryNotice(createRecoveryNotice(error, "wallet-history"));
      setWalletHistoryStatus("failed");
      setWalletHistoryMessage(error instanceof Error ? error.message : "Unable to load wallet transaction history.");
    }
  }

  async function proveWalletOwnership() {
    if (!walletConnected || !publicKey) {
      setWalletSignatureMessage("Connect an Aleo wallet before signing an ownership challenge.");
      setRecoveryNotice(createRecoveryNotice("Connect an Aleo wallet before signing an ownership challenge.", "wallet-signature"));
      return;
    }

    const signedAt = new Date().toISOString();
    const challenge = createWalletSignatureChallenge({
      address: publicKey,
      issuedAt: signedAt,
      nonce: crypto.randomUUID(),
      origin: window.location.origin,
      programId
    });
    const challengeBytes = encodeWalletSignatureChallenge(challenge);

    setWalletSignatureStatus("signing");
    setWalletSignatureProof(null);
    setRecoveryNotice(null);
    setWalletSignatureMessage("Review and sign the ownership challenge in your wallet.");

    try {
      const signatureBytes = new Uint8Array(await signMessage(challengeBytes));
      setWalletSignatureMessage("Wallet signature received. Verifying it against the connected address...");

      const verified = await verifyWalletSignatureProof(publicKey, challengeBytes, signatureBytes);
      setWalletSignatureProof({
        challenge,
        signatureHex: bytesToHex(signatureBytes),
        signedAt,
        verified
      });
      setWalletSignatureStatus(verified ? "verified" : "failed");
      setWalletSignatureMessage(
        verified
          ? "Wallet signature verified against the connected Aleo address."
          : "Wallet signature did not verify against the connected Aleo address."
      );
      if (verified) {
        setRecoveryNotice(null);
      } else {
        setRecoveryNotice(
          createRecoveryNotice("Wallet signature did not verify against the connected Aleo address.", "wallet-signature")
        );
      }
    } catch (error) {
      setRecoveryNotice(createRecoveryNotice(error, "wallet-signature"));
      setWalletSignatureStatus("failed");
      setWalletSignatureMessage(error instanceof Error ? error.message : "Unable to sign wallet challenge.");
    }
  }

  async function issueTicket() {
    if (!walletConnected || !publicKey) {
      setMessage("Connect an Aleo wallet before issuing a private ticket.");
      setRecoveryNotice(createRecoveryNotice("Connect an Aleo wallet before issuing a private ticket.", "wallet-connect"));
      return;
    }
    if (!proposalCanReceiveVotes) {
      setMessage("This proposal is closed. Select or create an active proposal before issuing a ticket.");
      return;
    }
    if (hasLocalVote(localVotes, proposal.id, publicKey)) {
      setTicket(null);
      setMessage("This wallet already voted on the selected proposal in this browser workspace.");
      return;
    }

    setRecoveryNotice(null);
    setIsIssuing(true);
    setReport(null);
    setWalletExecutionId(null);
    setWalletAdapterStatus(null);
    setWalletStatusMessage("Wallet execution status is available after approval.");
    setOnChainTxId(null);
    setTestnetTransactionStatus(null);
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
        updateSelectedProposal((current) => ({
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
      updateSelectedProposal((current) => ({
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
      setRecoveryNotice(createRecoveryNotice("Connect an Aleo wallet before casting a private vote.", "wallet-execution"));
      return;
    }
    if (!proposalCanReceiveVotes) {
      setMessage("This proposal is closed. Select or create an active proposal before voting.");
      return;
    }
    if (hasLocalVote(localVotes, proposal.id, publicKey)) {
      setTicket(null);
      setMessage("This wallet already voted on the selected proposal in this browser workspace.");
      return;
    }

    setRecoveryNotice(null);
    setIsProving(true);
    setWalletExecutionId(null);
    setWalletAdapterStatus(null);
    setWalletStatusMessage("Wallet execution status is available after approval.");
    setOnChainTxId(null);
    setTestnetTransactionStatus(null);
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
      const walletTxId = await executeTransaction({
        program: programId,
        function: executionFunction,
        inputs: plannedExecutionInputs,
        fee: executionFee,
        privateFee: false
      });
      setWalletExecutionId(walletTxId);
      const reportTxId = walletTxId;
      setExecutionStatus("submitted");
      void loadWalletTransactionHistory();
      const votedAt = new Date().toISOString();
      const localReport = {
        id: `report-${Date.now()}`,
        proposalId: proposal.id,
        vote: choice,
        status: "verified",
        ticketCommitment: ticket.ticketCommitment,
        txId: reportTxId,
        createdAt: votedAt
      } satisfies VoteReport;

      if (apiStatus === "connected") {
        try {
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
          const nextReport = {
            ...serverReport,
            txId: reportTxId
          };

          setReport(nextReport);
          setLocalVotes((current) =>
            recordLocalVote(current, {
              proposalId: proposal.id,
              voter: publicKey,
              reportId: nextReport.id,
              votedAt
            })
          );
          updateSelectedProposal((current) => mergeReportTally(current, serverReport, plannedVoteCounts));
          setMessage("Wallet execution submitted and backend report stored");
        } catch (error) {
          setApiStatus("demo");
          setReport(localReport);
          setLocalVotes((current) =>
            recordLocalVote(current, {
              proposalId: proposal.id,
              voter: publicKey,
              reportId: localReport.id,
              votedAt
            })
          );
          updateSelectedProposal((current) => ({
            ...current,
            agreeVotes: plannedVoteCounts.agreeVotes,
            disagreeVotes: plannedVoteCounts.disagreeVotes
          }));
          setMessage(
            error instanceof Error
              ? `Wallet execution submitted; backend report failed, saved locally: ${error.message}`
              : "Wallet execution submitted; backend report failed and was saved locally."
          );
        }
      } else {
        setReport(localReport);
        setLocalVotes((current) =>
          recordLocalVote(current, {
            proposalId: proposal.id,
            voter: publicKey,
            reportId: localReport.id,
            votedAt
          })
        );
        updateSelectedProposal((current) => ({
          ...current,
          agreeVotes: plannedVoteCounts.agreeVotes,
          disagreeVotes: plannedVoteCounts.disagreeVotes
        }));
        setMessage("Wallet execution submitted; tally updated locally because backend is offline");
      }

      setTicket(null);
    } catch (error) {
      setRecoveryNotice(createRecoveryNotice(error, "wallet-execution"));
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
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <Badge>
              <ShieldCheck size={16} />
              {walletConnected ? (apiStatus === "connected" ? "wallet + on-chain + backend" : "wallet + on-chain") : "wallet required"}
            </Badge>
            <Button onClick={resetLocalWorkspace} size="sm" type="button" variant="outline">
              <RotateCcw size={14} />
              Reset local
            </Button>
          </div>
          <span className="max-w-xs text-left text-xs font-bold text-stone-600 md:text-right">
            {localSessionStatus}
            {localSessionSavedAt ? ` at ${new Date(localSessionSavedAt).toLocaleString()}` : ""}
          </span>
        </div>
      </section>

      <section className="mx-auto mb-6 grid max-w-6xl gap-3 md:grid-cols-3">
        {[
          ["1", walletConnected ? "Wallet connected" : "Connect Aleo wallet"],
          [
            "2",
            walletAlreadyVoted
              ? "Wallet already voted"
              : proposalCanReceiveVotes
                ? ticket
                  ? "Ticket ready"
                  : "Issue ticket"
                : "Proposal closed"
          ],
          [
            "3",
            walletAlreadyVoted
              ? "Local vote locked"
              : !proposalCanReceiveVotes
              ? proposalStatus
              : testnetTransactionStatus?.status === "accepted"
              ? "Execution accepted"
              : onChainTxId
                ? "Checking testnet status"
                : walletExecutionId
                  ? "Wallet execution submitted"
                  : "Approve wallet execution"
          ]
        ].map(([step, label]) => (
          <div key={step} className="flex items-center gap-3 rounded-md border border-stone-950 bg-white p-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#d9ff65] text-sm font-black">{step}</span>
            <strong className="text-sm">{label}</strong>
          </div>
        ))}
      </section>

      <section className="mx-auto mb-6 grid max-w-6xl gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-md border border-stone-950 bg-white p-4 shadow-[4px_4px_0_#1c1917]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase text-[#6f3d2f]">
              <ListChecks size={14} />
              Proposal room
            </p>
            <span className="rounded-sm border border-stone-950 bg-[#eef0e8] px-2 py-1 text-xs font-black uppercase">
              {proposals.length} total
            </span>
          </div>
          <div className="grid gap-2">
            {proposals.map((item) => {
              const selected = item.id === proposal.id;
              return (
                <button
                  className={`rounded-md border border-stone-950 p-3 text-left transition hover:-translate-y-0.5 ${
                    selected ? "bg-[#d9ff65] shadow-[4px_4px_0_#1c1917]" : "bg-[#fffff8] hover:bg-[#f4e4cf]"
                  }`}
                  key={item.id}
                  onClick={() => selectProposal(item.id)}
                  type="button"
                >
                  <span className="flex items-start justify-between gap-3">
                    <strong className="min-w-0 text-sm">{item.title}</strong>
                    <span className="shrink-0 rounded-sm border border-stone-950 bg-white px-1.5 py-0.5 text-[10px] font-black uppercase">
                      {item.status}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs font-bold text-stone-600">
                    {item.agreeVotes} agree / {item.disagreeVotes} disagree / {item.ticketsIssued} tickets
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <form
          className="rounded-md border border-stone-950 bg-[#f4e4cf] p-4 shadow-[4px_4px_0_#1c1917]"
          onSubmit={(event) => void createProposal(event)}
        >
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-black uppercase text-[#6f3d2f]">
            <PlusCircle size={14} />
            Create proposal
          </p>
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm font-black">
              Title
              <input
                className="h-11 rounded-md border border-stone-950 bg-white px-3 font-bold outline-none focus:ring-2 focus:ring-[#c8492d]"
                maxLength={80}
                minLength={4}
                onChange={(event) => setProposalTitle(event.target.value)}
                placeholder="e.g. Fund private reviewer elections"
                value={proposalTitle}
              />
            </label>
            <label className="grid gap-1 text-sm font-black">
              Description
              <textarea
                className="min-h-24 resize-none rounded-md border border-stone-950 bg-white px-3 py-2 font-bold outline-none focus:ring-2 focus:ring-[#c8492d]"
                maxLength={280}
                minLength={12}
                onChange={(event) => setProposalDescription(event.target.value)}
                placeholder="What should voters decide?"
                value={proposalDescription}
              />
            </label>
            <Button disabled={!walletConnected || isCreatingProposal} type="submit" variant="primary">
              <PlusCircle size={16} />
              {isCreatingProposal ? "Creating..." : walletConnected ? "Create proposal" : "Connect wallet to create"}
            </Button>
          </div>
        </form>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardContent>
            <CardHeader className="mb-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 text-sm font-black text-[#6f3d2f]">
                    <Vote size={20} />
                    Proposal
                  </div>
                  <CardTitle>{proposal.title}</CardTitle>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-sm border border-stone-950 bg-[#d9ff65] px-2 py-1 text-xs font-black uppercase">
                    {proposalStatus}
                  </span>
                  {walletAlreadyVoted ? (
                    <span className="rounded-sm border border-stone-950 bg-[#f4c8be] px-2 py-1 text-xs font-black uppercase">
                      wallet voted
                    </span>
                  ) : null}
                  <Button
                    disabled={!proposalCanReceiveVotes || isClosingProposal}
                    onClick={() => void closeSelectedProposal()}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Flag size={14} />
                    {isClosingProposal ? "Closing..." : "Close proposal"}
                  </Button>
                </div>
              </div>
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
                <strong className="mt-1 block text-xl">
                  {walletAlreadyVoted ? "Locked" : ticket ? "Issued" : "Not issued"}
                </strong>
                {ticket ? (
                  <code className="mt-2 block max-w-xs overflow-hidden text-ellipsis whitespace-nowrap text-xs text-stone-600">
                    {ticket.ticketCommitment}
                  </code>
                ) : null}
              </div>
              <Button
                disabled={!walletConnected || !proposalCanReceiveVotes || walletAlreadyVoted || isIssuing || isProving}
                onClick={issueTicket}
              >
                <Ticket size={16} />
                {isIssuing
                  ? "Issuing..."
                  : walletAlreadyVoted
                    ? "Already voted"
                    : !walletConnected
                      ? "Connect wallet first"
                      : proposalCanReceiveVotes
                        ? "Issue ticket"
                        : "Proposal closed"}
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
              disabled={!walletConnected || !ticket || !proposalCanReceiveVotes || walletAlreadyVoted || isProving}
              onClick={castVote}
              size="lg"
              variant="primary"
            >
              <Fingerprint size={18} />
              {isProving
                ? "Generating proof..."
                : walletAlreadyVoted
                  ? "Already voted"
                  : !walletConnected
                    ? "Connect wallet to vote"
                    : proposalCanReceiveVotes
                      ? "Cast private vote"
                      : "Proposal closed"}
            </Button>

            <p className="mt-4 text-sm font-black text-[#6f3d2f]">{message}</p>

            {recoveryNotice ? (
              <div className={`mt-4 rounded-md border p-4 ${recoveryToneClasses[recoveryNotice.tone]}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="inline-flex items-center gap-2 text-xs font-black uppercase text-[#6f3d2f]">
                      <AlertTriangle size={14} />
                      Recovery plan
                    </p>
                    <strong className="mt-1 block text-base">{recoveryNotice.title}</strong>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canRetryRecovery ? (
                      <Button onClick={retryRecovery} size="sm" type="button" variant="outline">
                        <RefreshCw size={14} />
                        {recoveryRetryLabel(recoveryNotice)}
                      </Button>
                    ) : null}
                    <Button onClick={() => setRecoveryNotice(null)} size="sm" type="button" variant="ghost">
                      Dismiss
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-xs font-bold text-stone-700 [overflow-wrap:anywhere]">
                  {recoveryNotice.message}
                </p>
                <ol className="mt-3 grid gap-2 text-xs font-bold text-stone-700">
                  {recoveryNotice.steps.map((step, index) => (
                    <li className="flex gap-2" key={`${index}-${step}`}>
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-stone-950 bg-white text-[10px] font-black">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

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
              {walletExecutionId ? (
                <div className="mt-4 rounded-md border border-stone-950 bg-[#f4e4cf] p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase text-[#6f3d2f]">Wallet execution status</p>
                      <strong className="mt-1 block text-sm">
                        {walletExecutionStatusLabel(walletAdapterStatus?.status)}
                      </strong>
                    </div>
                    <span className="w-fit rounded-sm border border-stone-950 bg-white px-2 py-1 text-xs font-black uppercase">
                      {onChainTxId ? "on-chain id" : "wallet id"}
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-xs">
                    <div>
                      <dt className="font-bold text-stone-600">Wallet execution id</dt>
                      <dd className="font-mono text-stone-800 [overflow-wrap:anywhere]">{walletExecutionId}</dd>
                    </div>
                    {walletAdapterStatus?.transactionId && walletAdapterStatus.transactionId !== walletExecutionId ? (
                      <div>
                        <dt className="font-bold text-stone-600">Resolved transaction id</dt>
                        <dd className="font-mono text-stone-800 [overflow-wrap:anywhere]">
                          {walletAdapterStatus.transactionId}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  <p className="mt-2 text-xs font-bold text-stone-600">{walletStatusMessage}</p>
                </div>
              ) : null}
              {onChainTxId ? (
                <div className="mt-4 rounded-md border border-stone-950 bg-[#eef0e8] p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase text-[#6f3d2f]">Testnet transaction status</p>
                      <strong className="mt-1 block text-sm">
                        {testnetTransactionStatus
                          ? transactionStatusLabels[testnetTransactionStatus.status]
                          : "Checking testnet status"}
                      </strong>
                    </div>
                    {testnetTransactionStatus?.type ? (
                      <span className="w-fit rounded-sm border border-stone-950 bg-white px-2 py-1 text-xs font-black uppercase">
                        {testnetTransactionStatus.type}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs font-bold text-stone-600">
                    {testnetTransactionStatus?.message ?? "Checking the transaction against the testnet API."}
                  </p>
                  {testnetTransactionStatus?.program || testnetTransactionStatus?.functionName ? (
                    <p className="mt-2 font-mono text-xs text-stone-700 [overflow-wrap:anywhere]">
                      {[testnetTransactionStatus.program, testnetTransactionStatus.functionName].filter(Boolean).join("/")}
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

            <div className="mt-4 rounded-md border border-stone-950 bg-white p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase text-[#6f3d2f]">
                    {proposalCanReceiveVotes ? "Current outcome" : "Final outcome"}
                  </p>
                  <strong className="mt-1 block text-xl">{proposalStatus}</strong>
                </div>
                <span
                  className={`w-fit rounded-sm border border-stone-950 px-2 py-1 text-xs font-black uppercase ${
                    currentOutcome === "passing" ? "bg-[#d9ff65]" : "bg-[#f4c8be]"
                  }`}
                >
                  agree &gt;= disagree
                </span>
              </div>
              {proposal.closedAt ? (
                <p className="mt-2 text-xs font-bold text-stone-600">Closed at {proposal.closedAt}</p>
              ) : (
                <p className="mt-2 text-xs font-bold text-stone-600">
                  The proposal can still change while it is active. Closing it freezes the current outcome.
                </p>
              )}
            </div>

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

            <div className="mb-6 rounded-md border border-stone-950 bg-[#f4e4cf] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-black uppercase text-[#6f3d2f]">
                    <KeyRound size={14} />
                    Wallet ownership proof
                  </p>
                  <strong className="mt-1 block text-sm">
                    {walletSignatureStatus === "signing"
                      ? "Waiting for signature"
                      : walletSignatureStatus === "verified"
                        ? "Signature verified"
                        : walletSignatureStatus === "failed"
                          ? "Signature failed"
                          : "Ready to sign"}
                  </strong>
                </div>
                <Button
                  className="w-fit"
                  disabled={!walletConnected || walletSignatureStatus === "signing"}
                  onClick={() => void proveWalletOwnership()}
                  type="button"
                  variant="outline"
                >
                  <KeyRound size={14} />
                  {walletSignatureStatus === "signing" ? "Signing" : "Sign challenge"}
                </Button>
              </div>
              <p className="mt-2 text-xs font-bold text-stone-600">{walletSignatureMessage}</p>
              {walletSignatureProof ? (
                <div className="mt-3 grid gap-3 text-xs">
                  <div>
                    <span className="font-bold text-stone-600">Verified</span>
                    <code className="mt-1 block rounded-sm border border-stone-950 bg-white p-2 font-mono text-stone-800">
                      {walletSignatureProof.verified ? "true" : "false"} at {walletSignatureProof.signedAt}
                    </code>
                  </div>
                  <div>
                    <span className="font-bold text-stone-600">Challenge</span>
                    <pre className="mt-1 max-h-36 overflow-auto rounded-sm border border-stone-950 bg-white p-2 font-mono text-stone-800 [white-space:pre-wrap]">{walletSignatureProof.challenge}</pre>
                  </div>
                  <div>
                    <span className="font-bold text-stone-600">Signature</span>
                    <code className="mt-1 block rounded-sm border border-stone-950 bg-white p-2 font-mono text-stone-800 [overflow-wrap:anywhere]">
                      {walletSignatureProof.signatureHex}
                    </code>
                  </div>
                </div>
              ) : null}
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
