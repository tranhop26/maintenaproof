"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Address } from "@/lib/contract/types";
import { STUDIONET_CHAIN_HEX } from "@/lib/genlayer/config";

interface EthereumProvider {
  request(input: { method: string; params?: unknown[] }): Promise<unknown>;
  on(event: string, handler: (...args: unknown[]) => void): void;
  removeListener(event: string, handler: (...args: unknown[]) => void): void;
}

declare global {
  interface Window { ethereum?: EthereumProvider }
}

interface WalletValue {
  address: Address | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  error: string | null;
  connect(): Promise<void>;
  switchNetwork(): Promise<void>;
}

const WalletContext = createContext<WalletValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<Address | null>(null);
  const [chain, setChain] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!window.ethereum) return;
    const accounts = (await window.ethereum.request({ method: "eth_accounts" })) as string[];
    const chainId = (await window.ethereum.request({ method: "eth_chainId" })) as string;
    setAddress((accounts[0] as Address | undefined) ?? null);
    setChain(chainId.toLowerCase());
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const accountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setAddress((accounts[0] as Address | undefined) ?? null);
    };
    const chainChanged = (...args: unknown[]) => setChain(String(args[0]).toLowerCase());
    window.ethereum?.on("accountsChanged", accountsChanged);
    window.ethereum?.on("chainChanged", chainChanged);
    return () => {
      window.clearTimeout(initialRefresh);
      window.ethereum?.removeListener("accountsChanged", accountsChanged);
      window.ethereum?.removeListener("chainChanged", chainChanged);
    };
  }, [refresh]);

  const connect = useCallback(async () => {
    setError(null);
    try {
      if (!window.ethereum) throw new Error("Install a browser wallet to continue");
      await window.ethereum.request({ method: "eth_requestAccounts" });
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Wallet connection failed");
    }
  }, [refresh]);

  const switchNetwork = useCallback(async () => {
    setError(null);
    try {
      if (!window.ethereum) throw new Error("Wallet is not available");
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: STUDIONET_CHAIN_HEX }],
      });
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Network switch failed");
    }
  }, [refresh]);

  const value = useMemo<WalletValue>(() => ({
    address,
    isConnected: Boolean(address),
    isCorrectNetwork: chain === STUDIONET_CHAIN_HEX.toLowerCase(),
    error,
    connect,
    switchNetwork,
  }), [address, chain, connect, error, switchNetwork]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletValue {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside WalletProvider");
  return value;
}
