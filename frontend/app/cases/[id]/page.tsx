"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CaseActions } from "@/components/case-actions";
import { CertificateCard } from "@/components/certificate-card";
import { EvidenceForm } from "@/components/evidence-form";
import { EvaluatePanel } from "@/components/evaluate-panel";
import { StatusBadge } from "@/components/status-badge";
import { TransactionTimeline } from "@/components/transaction-timeline";
import type { TransactionProgress } from "@/lib/contract/types";
import { useContractClient } from "@/lib/hooks/use-cases";
import { useWallet } from "@/lib/genlayer/wallet";
import { EXPLORER_URL, configuredContractAddress } from "@/lib/genlayer/config";

export default function CasePage() {
  const params = useParams<{ id: string }>(); const id = BigInt(params.id); const client = useContractClient(); const wallet = useWallet();
  const [progress, setProgress] = useState<TransactionProgress | null>(null); const [actionError, setActionError] = useState(""); const [busy, setBusy] = useState(false);
  const record = useQuery({ queryKey: ["case", params.id], queryFn: () => client.getCase(id) });
  const certificate = useQuery({ queryKey: ["certificate", params.id], queryFn: () => client.getCertificate(id), enabled: record.data?.status === "COMPLIANT" });
  if (record.isLoading) return <div className="page"><div className="empty"><div className="loader" />Reading case…</div></div>;
  if (!record.data || record.error) return <div className="page"><div className="empty error"><h2>Case readback failed</h2><p>{record.error?.message ?? "Record unavailable"}</p></div></div>;
  const item = record.data; const refresh = () => { void record.refetch(); void certificate.refetch(); };
  const providerCanSubmit = wallet.address?.toLowerCase() === item.provider.toLowerCase() && ["DRAFT", "UNRESOLVED"].includes(item.status);
  async function cancel() { setBusy(true); setActionError(""); const result = await client.cancelCase(id, setProgress); if (result.ok) refresh(); else setActionError(result.error); setBusy(false); }
  return <div className="page narrow"><Link className="back-link" href="/"><ArrowLeft size={16} />All cases</Link><section className="case-header"><div><div className="eyebrow">CASE {String(item.id).padStart(4, "0")}</div><h1>{item.cycle_id}</h1></div><StatusBadge status={item.status} /></section><div className="detail-grid"><section className="panel"><div className="panel-title">Locked policy</div><p className="policy">{item.policy}</p><dl className="data-grid"><div><dt>Policy version</dt><dd>{item.policy_version}</dd></div><div><dt>Service window</dt><dd>{item.cycle_start} → {item.cycle_end}</dd></div><div><dt>Evidence host</dt><dd>{item.evidence_hostname}</dd></div><div><dt>Asset hash</dt><dd><code>{item.asset_hash}</code></dd></div></dl></section><aside className="panel actors"><div className="panel-title">Bound actors</div><dl><dt>Owner</dt><dd><code>{item.owner}</code></dd><dt>Provider</dt><dd><code>{item.provider}</code></dd></dl><a className="text-link" href={`${EXPLORER_URL}/address/${configuredContractAddress()}`} target="_blank" rel="noreferrer">Explorer readback <ExternalLink size={15} /></a></aside></div>{providerCanSubmit && <EvidenceForm caseId={item.id} nextVersion={item.latest_evidence_version + 1} onDone={refresh} />}{item.status === "SUBMITTED" && <EvaluatePanel caseId={item.id} onDone={refresh} />}{item.status !== "SUBMITTED" && !providerCanSubmit && <CaseActions wallet={wallet.address} caseRecord={item} busy={busy} onCancel={() => void cancel()} onSubmit={() => undefined} onEvaluate={() => undefined} />}{actionError && <div className="notice error">{actionError}</div>}{progress && <TransactionTimeline {...progress} />}{certificate.data && <CertificateCard certificate={certificate.data} />}{item.status === "UNRESOLVED" && <div className="notice warning"><strong>UNRESOLVED</strong> The agreed evidence was insufficient or unsafe. The locked provider may submit a strictly newer revision.</div>}</div>;
}
