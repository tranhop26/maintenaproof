"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TransactionTimeline } from "@/components/transaction-timeline";
import { useContractClient } from "@/lib/hooks/use-cases";
import type { Address, TransactionProgress } from "@/lib/contract/types";

export function CreateCaseForm() {
  const client = useContractClient();
  const router = useRouter();
  const [progress, setProgress] = useState<TransactionProgress | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const result = await client.createCase({
        assetHash: String(data.get("assetHash")), provider: String(data.get("provider")) as Address,
        evidenceHostname: String(data.get("evidenceHostname")), policy: String(data.get("policy")),
        policyVersion: String(data.get("policyVersion")), cycleId: String(data.get("cycleId")),
        cycleStart: String(data.get("cycleStart")), cycleEnd: String(data.get("cycleEnd")),
      }, setProgress);
      if (!result.ok) setError(result.error); else router.push(`/cases/${result.caseRecord.id}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to create case"); }
    finally { setBusy(false); }
  }
  return <form className="form-card" onSubmit={submit}><div className="form-section"><div><span className="step">01</span><h2>Asset & provider</h2><p>These identities are immutable after creation.</p></div><div className="fields"><label>Asset hash<input name="assetHash" required placeholder="64 lowercase hexadecimal characters" /></label><label>Provider wallet<input name="provider" required placeholder="0x…" /></label></div></div><div className="form-section"><div><span className="step">02</span><h2>Evidence boundary</h2><p>Only HTTPS pages on this exact host are accepted.</p></div><div className="fields"><label>Evidence hostname<input name="evidenceHostname" required placeholder="httpbin.org" /></label><label>Policy<textarea name="policy" required rows={4} placeholder="Describe each maintenance obligation precisely." /></label><div className="split"><label>Policy version<input name="policyVersion" required placeholder="hvac-v1" /></label><label>Cycle ID<input name="cycleId" required placeholder="cycle-2026-q3" /></label></div></div></div><div className="form-section"><div><span className="step">03</span><h2>Service cycle</h2><p>Evidence dates must remain inside this window.</p></div><div className="fields split"><label>Start date<input name="cycleStart" type="date" required /></label><label>End date<input name="cycleEnd" type="date" required /></label></div></div>{error && <div className="notice error">{error}</div>}{progress && <TransactionTimeline {...progress} />}<button className="button primary wide" disabled={busy}>{busy ? "Processing…" : "Create immutable case"}</button></form>;
}
