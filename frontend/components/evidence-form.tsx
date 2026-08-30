"use client";

import { useState } from "react";
import type { TransactionProgress } from "@/lib/contract/types";
import { TransactionTimeline } from "@/components/transaction-timeline";
import { useContractClient } from "@/lib/hooks/use-cases";

export function EvidenceForm({ caseId, nextVersion, onDone }: { caseId: number; nextVersion: number; onDone(): void }) {
  const client = useContractClient(); const [progress, setProgress] = useState<TransactionProgress | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); const data = new FormData(event.currentTarget); try { const result = await client.submitEvidence({ caseId: BigInt(caseId), url: String(data.get("url")), version: BigInt(nextVersion) }, setProgress); if (result.ok) onDone(); else setError(result.error); } catch (caught) { setError(caught instanceof Error ? caught.message : "Submission failed"); } finally { setBusy(false); } }
  return <form className="inline-form" onSubmit={submit}><label>Public evidence URL<input name="url" type="url" required placeholder="https://locked-host/report" /></label><div className="revision">Revision v{nextVersion}</div>{error && <div className="notice error">{error}</div>}{progress && <TransactionTimeline {...progress} />}<button className="button primary" disabled={busy}>Submit evidence</button></form>;
}
