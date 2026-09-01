"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { TransactionProgress } from "@/lib/contract/types";
import { TransactionTimeline } from "@/components/transaction-timeline";
import { useContractClient } from "@/lib/hooks/use-cases";

export function EvaluatePanel({ caseId, onDone }: { caseId: number; onDone(): void }) {
  const client = useContractClient(); const [progress, setProgress] = useState<TransactionProgress | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function evaluate() { setBusy(true); setError(""); const result = await client.evaluate(BigInt(caseId), setProgress); if (result.ok) onDone(); else setError(result.error); setBusy(false); }
  return <section className="evaluate-panel"><Sparkles /><div><h3>Validator evaluation</h3><p>GenLayer validators assess the exact canonical record stored on-chain against the locked policy. No mutable page is fetched, and any wallet may request the decision.</p>{error && <div className="notice error">{error}</div>}{progress && <TransactionTimeline {...progress} />}<button className="button primary" disabled={busy} onClick={() => void evaluate()}>{busy ? "Consensus pending…" : "Evaluate record"}</button></div></section>;
}
