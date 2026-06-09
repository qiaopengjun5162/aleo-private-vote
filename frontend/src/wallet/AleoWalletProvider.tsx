"use client";

import { FoxWalletAdapter } from "@provablehq/aleo-wallet-adaptor-fox";
import { LeoWalletAdapter } from "@provablehq/aleo-wallet-adaptor-leo";
import { PuzzleWalletAdapter } from "@provablehq/aleo-wallet-adaptor-puzzle";
import { ShieldWalletAdapter } from "@provablehq/aleo-wallet-adaptor-shield";
import type { BaseAleoWalletAdapter } from "@provablehq/aleo-wallet-adaptor-core";
import { Network, type Account, type TransactionOptions, type TransactionStatusResponse } from "@provablehq/aleo-types";
import { WalletDecryptPermission, WalletReadyState } from "@provablehq/aleo-wallet-standard";
import { ChevronRight, Shield, Wallet, X } from "lucide-react";
import {
  defaultWallets,
  isReadyWallet,
  mergeWalletOptions,
  type WalletOption
} from "@/wallet/walletOptions";
import { EmbeddedWalletOption } from "@/wallet/EmbeddedWalletOption";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { Button } from "@/components/ui/button";
import {
  normalizeWalletTransactionHistory,
  type WalletTransactionHistoryEntry
} from "@/walletTransactionHistory";

const programId = "private_vote.aleo";

type AleoWalletContextValue = {
  account: Account | null;
  connected: boolean;
  connectingWallet: string | null;
  error: string | null;
  publicKey: string | null;
  wallets: WalletOption[];
  connect: (walletName: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  executeTransaction: (options: TransactionOptions) => Promise<string>;
  transactionStatus: (transactionId: string) => Promise<TransactionStatusResponse>;
  requestTransactionHistory: (program?: string) => Promise<WalletTransactionHistoryEntry[]>;
};

const AleoWalletContext = createContext<AleoWalletContextValue | null>(null);

function createWalletAdapters() {
  return [
    new LeoWalletAdapter({
      appName: "Aleo Private Vote",
      appDescription: "Privacy-preserving voting on Aleo testnet.",
      mobileWebviewUrl: window.location.href,
      programIdPermissions: {
        [Network.TESTNET]: [programId]
      }
    }),
    new ShieldWalletAdapter(),
    new PuzzleWalletAdapter({
      appName: "Aleo Private Vote",
      appDescription: "Privacy-preserving voting on Aleo testnet.",
      programIdPermissions: {
        [Network.TESTNET]: [programId]
      }
    }),
    new FoxWalletAdapter()
  ];
}

function toWalletOptions(adapters: BaseAleoWalletAdapter[]): WalletOption[] {
  return adapters.map((adapter) => ({
    name: adapter.name,
    readyState: adapter.readyState,
    url: adapter.url
  }));
}

function walletStatusLabel(wallet: WalletOption) {
  if (isReadyWallet(wallet)) return "Installed";
  if (wallet.readyState === WalletReadyState.UNSUPPORTED) return "Unsupported";
  return "Not detected";
}

function walletActionLabel(wallet: WalletOption, connectingWallet: string | null) {
  if (connectingWallet === wallet.name) return "Connecting...";
  return isReadyWallet(wallet) ? `Connect ${wallet.name}` : `Install ${wallet.name}`;
}

function walletStatusClass(wallet: WalletOption) {
  if (isReadyWallet(wallet)) return "bg-[#d9ff65]";
  if (wallet.readyState === WalletReadyState.UNSUPPORTED) return "bg-[#f4c8be]";
  return "bg-white/70";
}

export function AleoWalletProvider({ children }: { children: ReactNode }) {
  const adaptersRef = useRef<BaseAleoWalletAdapter[]>([]);
  const selectedAdapterRef = useRef<BaseAleoWalletAdapter | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wallets, setWallets] = useState<WalletOption[]>(defaultWallets);

  useEffect(() => {
    const adapters = createWalletAdapters();
    adaptersRef.current = adapters;
    setWallets(mergeWalletOptions(toWalletOptions(adapters)));

    const refreshWallets = () => {
      setWallets(mergeWalletOptions(toWalletOptions(adapters)));
    };
    const handleConnect = (connectedAccount: Account) => {
      setAccount(connectedAccount);
      setError(null);
    };
    const handleDisconnect = () => {
      setAccount(null);
      selectedAdapterRef.current = null;
    };
    const handleError = (walletError: Error) => {
      setError(walletError.message || walletError.name);
    };

    adapters.forEach((adapter) => {
      adapter.on("readyStateChange", refreshWallets);
      adapter.on("connect", handleConnect);
      adapter.on("disconnect", handleDisconnect);
      adapter.on("error", handleError);
    });

    return () => {
      adapters.forEach((adapter) => {
        adapter.off("readyStateChange", refreshWallets);
        adapter.off("connect", handleConnect);
        adapter.off("disconnect", handleDisconnect);
        adapter.off("error", handleError);
      });
    };
  }, []);

  const connect = useCallback(async (walletName: string) => {
    const adapter = adaptersRef.current.find((item) => item.name === walletName);
    if (!adapter || connectingWallet) return false;
    if (account) return true;

    if (adapter.readyState !== WalletReadyState.INSTALLED && adapter.readyState !== WalletReadyState.LOADABLE) {
      if (adapter.url) {
        window.open(adapter.url, "_blank", "noopener,noreferrer");
      }
      setError(`${adapter.name} is not installed or not available in this browser.`);
      return false;
    }

    setConnectingWallet(adapter.name);
    setError(null);
    try {
      const connectedAccount = await adapter.connect(Network.TESTNET, WalletDecryptPermission.OnChainHistory, [programId]);
      selectedAdapterRef.current = adapter;
      setAccount(connectedAccount);
      return true;
    } catch (walletError) {
      setError(walletError instanceof Error ? walletError.message : String(walletError));
      return false;
    } finally {
      setConnectingWallet(null);
    }
  }, [account, connectingWallet]);

  const disconnect = useCallback(async () => {
    const adapter = selectedAdapterRef.current;
    if (!adapter) {
      setAccount(null);
      return;
    }

    await adapter.disconnect();
    setAccount(null);
    selectedAdapterRef.current = null;
  }, []);

  const executeTransaction = useCallback(async (options: TransactionOptions) => {
    const adapter = selectedAdapterRef.current;
    if (!adapter || !adapter.connected) {
      throw new Error("Aleo wallet is not connected.");
    }

    const result = await adapter.executeTransaction(options);
    return result.transactionId;
  }, []);

  const signMessage = useCallback(async (message: Uint8Array) => {
    const adapter = selectedAdapterRef.current;
    if (!adapter || !adapter.connected) {
      throw new Error("Aleo wallet is not connected.");
    }

    return adapter.signMessage(message);
  }, []);

  const requestTransactionHistory = useCallback(async (program = programId) => {
    const adapter = selectedAdapterRef.current;
    if (!adapter || !adapter.connected) {
      throw new Error("Aleo wallet is not connected.");
    }

    const result = await adapter.requestTransactionHistory(program);
    return normalizeWalletTransactionHistory(result.transactions);
  }, []);

  const transactionStatus = useCallback(async (transactionId: string) => {
    const adapter = selectedAdapterRef.current;
    if (!adapter || !adapter.connected) {
      throw new Error("Aleo wallet is not connected.");
    }

    return adapter.transactionStatus(transactionId);
  }, []);

  const value = useMemo(
    () => ({
      account,
      connected: Boolean(account),
      connectingWallet,
      error,
      publicKey: account?.address ?? null,
      wallets,
      connect,
      disconnect,
      signMessage,
      executeTransaction,
      transactionStatus,
      requestTransactionHistory
    }),
    [
      account,
      connectingWallet,
      error,
      wallets,
      connect,
      disconnect,
      signMessage,
      executeTransaction,
      transactionStatus,
      requestTransactionHistory
    ]
  );

  return <AleoWalletContext.Provider value={value}>{children}</AleoWalletContext.Provider>;
}

export function useAleoWallet() {
  const context = useContext(AleoWalletContext);
  if (!context) {
    throw new Error("useAleoWallet must be used within AleoWalletProvider");
  }

  return context;
}

function formatAddress(address: string) {
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

export function AleoWalletButton() {
  const { connected, connectingWallet, connect, disconnect, error, publicKey, wallets } = useAleoWallet();
  const installedWallets = wallets.filter(isReadyWallet);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showExternalWallets, setShowExternalWallets] = useState(false);

  if (connected && publicKey) {
    return (
      <div className="flex flex-col items-start gap-2 md:items-end">
        <Button onClick={disconnect} variant="primary">
          <Wallet size={16} />
          {formatAddress(publicKey)}
        </Button>
        <span className="max-w-xs text-xs font-bold text-stone-700">Aleo wallet connected</span>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-xl flex-col items-start gap-2 md:items-end">
      <Button onClick={() => setIsModalOpen(true)} type="button" variant="primary">
        <Wallet size={16} />
        Connect Wallet
      </Button>
      {error ? <span className="max-w-xs text-xs font-bold text-[#9f2d1d]">{error}</span> : null}
      {isModalOpen ? (
        <div
          aria-labelledby="wallet-connect-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-stone-950/70 px-4 py-8 backdrop-blur-sm"
          role="dialog"
        >
          <div className="w-full max-w-xl rounded-md border border-stone-950 bg-[#eef0e8] p-5 text-left shadow-[10px_10px_0_#1c1917]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-3xl font-black" id="wallet-connect-title">
                  Connect Wallet
                </h2>
                <p className="mt-1 text-sm font-bold text-stone-700">Choose how you would like to connect to Aleo.</p>
              </div>
              <Button
                aria-label="Close wallet connection dialog"
                className="h-9 w-9 px-0"
                onClick={() => setIsModalOpen(false)}
                type="button"
                variant="outline"
              >
                <X size={16} />
              </Button>
            </div>

            <div className="mt-5 grid gap-3">
              <button
                className="flex w-full items-center justify-between gap-4 rounded-md border border-stone-950 bg-white p-4 text-left shadow-[4px_4px_0_#1c1917] transition hover:-translate-y-0.5 hover:bg-[#d9ff65]"
                onClick={() => setShowExternalWallets((current) => !current)}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-stone-950 bg-[#f4e4cf]">
                    <Shield size={20} />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-base">Aleo Wallet Adapter</strong>
                    <span className="block text-sm font-bold text-stone-600">Connect an external wallet extension</span>
                  </span>
                </span>
                <ChevronRight
                  className={showExternalWallets ? "rotate-90 transition" : "transition"}
                  size={18}
                />
              </button>

              {showExternalWallets ? (
                <div className="grid gap-2 rounded-md border border-stone-950 bg-[#f4e4cf] p-3 sm:grid-cols-2">
                  {wallets.map((wallet) => (
                    <Button
                      className="h-auto min-h-14 justify-between px-3 py-2 text-left"
                      disabled={Boolean(connectingWallet)}
                      key={wallet.name}
                      onClick={() => {
                        void connect(wallet.name).then((didConnect) => {
                          if (didConnect) setIsModalOpen(false);
                        });
                      }}
                      type="button"
                      variant={isReadyWallet(wallet) ? "primary" : "outline"}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Wallet size={16} />
                        <span className="truncate">{walletActionLabel(wallet, connectingWallet)}</span>
                      </span>
                      <span
                        className={`rounded-sm border border-stone-950/20 px-1.5 py-0.5 text-[10px] font-black uppercase text-stone-700 ${walletStatusClass(wallet)}`}
                      >
                        {walletStatusLabel(wallet)}
                      </span>
                    </Button>
                  ))}
                  {installedWallets.length === 0 ? (
                    <p className="text-xs font-bold text-stone-700 sm:col-span-2">
                      Choose a wallet to install, then refresh this page after the extension is available.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <EmbeddedWalletOption onOpen={() => setIsModalOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
