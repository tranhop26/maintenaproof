"use client";

import { WalletCards } from "lucide-react";
import { useWallet } from "@/lib/genlayer/wallet";

function short(address: string) { return `${address.slice(0, 6)}…${address.slice(-4)}`; }

export function WalletButton() {
  const wallet = useWallet();
  if (!wallet.isConnected) {
    return <button className="button secondary" onClick={() => void wallet.connect()}><WalletCards size={17} />Connect wallet</button>;
  }
  if (!wallet.isCorrectNetwork) {
    return <button className="button warning" onClick={() => void wallet.switchNetwork()}>Switch to Studionet</button>;
  }
  return <div className="wallet-chip"><span className="live-dot" />{short(wallet.address!)}</div>;
}
