"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TransactionTimeline } from "@/components/transaction-timeline";
import { useContractClient } from "@/lib/hooks/use-cases";
import type { Address, TransactionProgress } from "@/lib/contract/types";
import { useWallet } from "@/lib/genlayer/wallet";

export function CreateCaseForm() {
  const client = useContractClient();
  const wallet = useWallet();
  const router = useRouter();
  const [progress, setProgress] = useState<TransactionProgress | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const result = await client.createCase({
        assetHash: String(data.get("assetHash")),
        issuer: String(data.get("issuer")) as Address,
        provider: String(data.get("provider")) as Address,
        policy: String(data.get("policy")),
        policyVersion: String(data.get("policyVersion")),
        cycleId: String(data.get("cycleId")),
        cycleStart: String(data.get("cycleStart")),
        cycleEnd: String(data.get("cycleEnd")),
      }, setProgress);
      if (!result.ok) setError(result.error);
      else router.push(`/cases/${result.caseRecord.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create case");
    } finally {
      setBusy(false);
    }
  }

  if (!wallet.isConnected) return <div className="notice">Connect wallet to create a case</div>;
  if (!wallet.isCorrectNetwork) return <div className="notice warning">Switch the connected wallet to GenLayer Studionet before creating a case.</div>;

  return <form className="form-card" onSubmit={submit}>
    <div className="form-section"><div><span className="step">01</span><h2>Asset & bound actors</h2><p>The issuer wallet signs each service record. The provider remains the party responsible for the service.</p></div><div className="fields"><label>Asset hash<input name="assetHash" required placeholder="64 lowercase hexadecimal characters" /></label><div className="split"><label>Issuer wallet<input name="issuer" required placeholder="0x…" /></label><label>Provider wallet<input name="provider" required placeholder="0x…" /></label></div></div></div>
    <div className="form-section"><div><span className="step">02</span><h2>Immutable policy</h2><p>The exact policy text and its contract-computed digest bind every verdict.</p></div><div className="fields"><label>Policy<textarea name="policy" required rows={4} placeholder="Describe each maintenance obligation precisely." /></label><div className="split"><label>Policy version<input name="policyVersion" required placeholder="hvac-v1" /></label><label>Cycle ID<input name="cycleId" required placeholder="cycle-2026-q3" /></label></div></div></div>
    <div className="form-section"><div><span className="step">03</span><h2>Service cycle</h2><p>Service and issuance dates must remain inside this window.</p></div><div className="fields split"><label>Start date<input name="cycleStart" type="date" required /></label><label>End date<input name="cycleEnd" type="date" required /></label></div></div>
    {error && <div className="notice error">{error}</div>}
    {progress && <TransactionTimeline {...progress} />}
    <button className="button primary wide" disabled={busy}>{busy ? "Processing…" : "Create immutable case"}</button>
  </form>;
}
