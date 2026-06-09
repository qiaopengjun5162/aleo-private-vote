"use client";

import {
  type AleoTransaction,
  DecryptPermission,
  WalletAdapterNetwork,
  WalletReadyState,
  type WalletError
} from "@demox-labs/aleo-wallet-adapter-base";
import { LeoWalletAdapter } from "@demox-labs/aleo-wallet-adapter-leo";
import { Wallet } from "lucide-react";
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

type LeoWalletContextValue = {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  publicKey: string | null;
  readyState: WalletReadyState;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  requestExecution: (transaction: AleoTransaction) => Promise<string>;
};

const LeoWalletContext = createContext<LeoWalletContextValue | null>(null);

export function LeoWalletProvider({ children }: { children: ReactNode }) {
  const adapterRef = useRef<LeoWalletAdapter | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [readyState, setReadyState] = useState<WalletReadyState>(WalletReadyState.Unsupported);

  useEffect(() => {
    const adapter = new LeoWalletAdapter({
      appName: "Aleo Private Vote",
      mobileWebviewUrl: window.location.href
    });

    adapterRef.current = adapter;
    setReadyState(adapter.readyState);

    const handleReadyStateChange = (state: WalletReadyState) => {
      setReadyState(state);
    };
    const handleConnect = (address: string) => {
      setConnected(true);
      setPublicKey(address);
      setError(null);
    };
    const handleDisconnect = () => {
      setConnected(false);
      setPublicKey(null);
    };
    const handleError = (walletError: WalletError) => {
      setError(walletError.message || walletError.name);
    };

    adapter.on("readyStateChange", handleReadyStateChange);
    adapter.on("connect", handleConnect);
    adapter.on("disconnect", handleDisconnect);
    adapter.on("error", handleError);

    return () => {
      adapter.off("readyStateChange", handleReadyStateChange);
      adapter.off("connect", handleConnect);
      adapter.off("disconnect", handleDisconnect);
      adapter.off("error", handleError);
    };
  }, []);

  const connect = useCallback(async () => {
    const adapter = adapterRef.current;
    if (!adapter || connecting || connected) return;

    if (adapter.readyState !== WalletReadyState.Installed) {
      window.open(adapter.url, "_blank", "noopener,noreferrer");
      setError("Leo Wallet is not installed or not available in this browser.");
      return;
    }

    setConnecting(true);
    setError(null);
    try {
      await adapter.connect(DecryptPermission.NoDecrypt, WalletAdapterNetwork.Testnet, ["private_vote.aleo"]);
      setConnected(Boolean(adapter.publicKey));
      setPublicKey(adapter.publicKey);
    } catch (walletError) {
      setError(walletError instanceof Error ? walletError.message : String(walletError));
    } finally {
      setConnecting(false);
    }
  }, [connected, connecting]);

  const disconnect = useCallback(async () => {
    const adapter = adapterRef.current;
    if (!adapter) return;

    await adapter.disconnect();
    setConnected(false);
    setPublicKey(null);
  }, []);

  const requestExecution = useCallback(async (transaction: AleoTransaction) => {
    const adapter = adapterRef.current;
    if (!adapter || !adapter.publicKey) {
      throw new Error("Leo Wallet is not connected.");
    }

    return adapter.requestExecution(transaction);
  }, []);

  const value = useMemo(
    () => ({
      connected,
      connecting,
      error,
      publicKey,
      readyState,
      connect,
      disconnect,
      requestExecution
    }),
    [connected, connecting, error, publicKey, readyState, connect, disconnect, requestExecution]
  );

  return <LeoWalletContext.Provider value={value}>{children}</LeoWalletContext.Provider>;
}

export function useLeoWallet() {
  const context = useContext(LeoWalletContext);
  if (!context) {
    throw new Error("useLeoWallet must be used within LeoWalletProvider");
  }

  return context;
}

function formatAddress(address: string) {
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

export function LeoWalletButton() {
  const { connected, connecting, disconnect, error, publicKey, readyState, connect } = useLeoWallet();

  if (connected && publicKey) {
    return (
      <div className="flex flex-col items-start gap-2 md:items-end">
        <Button onClick={disconnect} variant="primary">
          <Wallet size={16} />
          {formatAddress(publicKey)}
        </Button>
        <span className="max-w-xs text-xs font-bold text-stone-700">Leo Wallet connected</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <Button disabled={connecting} onClick={connect} variant="primary">
        <Wallet size={16} />
        {connecting ? "Connecting..." : readyState === WalletReadyState.Installed ? "Connect Leo Wallet" : "Install Leo Wallet"}
      </Button>
      {error ? <span className="max-w-xs text-xs font-bold text-[#9f2d1d]">{error}</span> : null}
    </div>
  );
}
