"use client";

import { FoxWalletAdapter } from "@provablehq/aleo-wallet-adaptor-fox";
import { LeoWalletAdapter } from "@provablehq/aleo-wallet-adaptor-leo";
import { PuzzleWalletAdapter } from "@provablehq/aleo-wallet-adaptor-puzzle";
import { ShieldWalletAdapter } from "@provablehq/aleo-wallet-adaptor-shield";
import type { BaseAleoWalletAdapter } from "@provablehq/aleo-wallet-adaptor-core";
import { Network, type Account, type TransactionOptions } from "@provablehq/aleo-types";
import { WalletDecryptPermission, WalletReadyState } from "@provablehq/aleo-wallet-standard";
import { Wallet } from "lucide-react";
import {
  defaultWallets,
  isReadyWallet,
  mergeWalletOptions,
  type WalletOption
} from "@/wallet/walletOptions";
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

const programId = "private_vote.aleo";

type AleoWalletContextValue = {
  account: Account | null;
  connected: boolean;
  connectingWallet: string | null;
  error: string | null;
  publicKey: string | null;
  wallets: WalletOption[];
  connect: (walletName: string) => Promise<void>;
  disconnect: () => Promise<void>;
  executeTransaction: (options: TransactionOptions) => Promise<string>;
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
    if (!adapter || connectingWallet || account) return;

    if (adapter.readyState !== WalletReadyState.INSTALLED && adapter.readyState !== WalletReadyState.LOADABLE) {
      if (adapter.url) {
        window.open(adapter.url, "_blank", "noopener,noreferrer");
      }
      setError(`${adapter.name} is not installed or not available in this browser.`);
      return;
    }

    setConnectingWallet(adapter.name);
    setError(null);
    try {
      const connectedAccount = await adapter.connect(Network.TESTNET, WalletDecryptPermission.NoDecrypt, [programId]);
      selectedAdapterRef.current = adapter;
      setAccount(connectedAccount);
    } catch (walletError) {
      setError(walletError instanceof Error ? walletError.message : String(walletError));
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
      executeTransaction
    }),
    [account, connectingWallet, error, wallets, connect, disconnect, executeTransaction]
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
      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 md:w-auto md:min-w-[30rem]">
        {wallets.map((wallet) => (
          <Button
            disabled={Boolean(connectingWallet)}
            key={wallet.name}
            className="h-auto min-h-14 justify-between px-3 py-2 text-left"
            onClick={() => connect(wallet.name)}
            variant={isReadyWallet(wallet) ? "primary" : "outline"}
          >
            <span className="flex items-center gap-2">
              <Wallet size={16} />
              <span className="whitespace-nowrap">{walletActionLabel(wallet, connectingWallet)}</span>
            </span>
            <span className="rounded-sm border border-stone-950/20 bg-white/70 px-1.5 py-0.5 text-[10px] font-black uppercase text-stone-700">
              {walletStatusLabel(wallet)}
            </span>
          </Button>
        ))}
      </div>
      {error ? <span className="max-w-xs text-xs font-bold text-[#9f2d1d]">{error}</span> : null}
      {installedWallets.length === 0 ? (
        <span className="max-w-md text-xs font-bold text-stone-700">
          Choose a wallet to install, then refresh this page after the extension is available.
        </span>
      ) : null}
    </div>
  );
}
