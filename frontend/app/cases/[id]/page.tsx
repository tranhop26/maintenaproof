"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CaseActions } from "@/components/case-actions";
import { CertificateCard } from "@/components/certificate-card";
import { EvaluatePanel } from "@/components/evaluate-panel";
import { ServiceRecordForm } from "@/components/service-record-form";
import { StatusBadge } from "@/components/status-badge";
import { TransactionTimeline } from "@/components/transaction-timeline";
import type { TransactionProgress } from "@/lib/contract/types";
import { useContractClient } from "@/lib/hooks/use-cases";
import { useWallet } from "@/lib/genlayer/wallet";
import { EXPLORER_URL, configuredContractAddress } from "@/lib/genlayer/config";

export default function CasePage() {
  const params = useParams<{ id: string }>();
  const id = BigInt(params.id);
  const client = useContractClient();
  const wallet = useWallet();
  const [progress, setProgress] = useState<TransactionProgress | null>(null);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const record = useQuery({ queryKey: ["case", params.id], queryFn: () => client.getCase(id) });
  const certificate = useQuery({ queryKey: ["certificate", params.id], queryFn: () => client.getCertificate(id), enabled: record.data?.status === "COMPLIANT" });
  const evidence = useQuery({ queryKey: ["evidence", params.id, record.data?.evidence_count], queryFn: () => Promise.all(Array.from({ length: record.data?.evidence_count ?? 0 }, (_, index) => client.getEvidence(id, BigInt(index)))), enabled: Boolean(record.data?.evidence_count) });
  const attempts = useQuery({ queryKey: ["attempts", params.id, record.data?.attempt_count], queryFn: () => Promise.all(Array.from({ length: record.data?.attempt_count ?? 0 }, (_, index) => client.getAttempt(id, BigInt(index)))), enabled: Boolean(record.data?.attempt_count) });

  if (record.isLoading) return <div className="page"><div className="empty"><div className="loader" />Reading case…</div></div>;
  if (!record.data || record.error) return <div className="page"><div className="empty error"><h2>Case readback failed</h2><p>{record.error?.message ?? "Record unavailable"}</p></div></div>;

  const item = record.data;
  const refresh = () => { void record.refetch(); void certificate.refetch(); void evidence.refetch(); void attempts.refetch(); };
  const writesReady = wallet.isConnected && wallet.isCorrectNetwork;
  const issuerCanSubmit = writesReady && wallet.address?.toLowerCase() === item.issuer.toLowerCase() && ["AWAITING_RECORD", "UNRESOLVED"].includes(item.status);
  const ownerCanCancel = writesReady && item.status === "AWAITING_RECORD" && wallet.address?.toLowerCase() === item.owner.toLowerCase();
  async function cancel() {
    setBusy(true); setActionError("");
    const result = await client.cancelCase(id, setProgress);
    if (result.ok) refresh(); else setActionError(result.error);
    setBusy(false);
  }

  return <div className="page narrow">
    <Link className="back-link" href="/"><ArrowLeft size={16} />All cases</Link>
    <section className="case-header"><div><div className="eyebrow">CASE {String(item.id).padStart(4, "0")}</div><h1>{item.cycle_id}</h1></div><StatusBadge status={item.status} /></section>
    <div className="detail-grid">
      <section className="panel"><div className="panel-title">Locked policy</div><p className="policy">{item.policy}</p><dl className="data-grid"><div><dt>Policy version</dt><dd>{item.policy_version}</dd></div><div><dt>Policy hash</dt><dd><code>{item.policy_hash}</code></dd></div><div><dt>Service window</dt><dd>{item.cycle_start} → {item.cycle_end}</dd></div><div><dt>Record schema</dt><dd>{item.record_schema}</dd></div><div><dt>Asset hash</dt><dd><code>{item.asset_hash}</code></dd></div></dl></section>
      <aside className="panel actors"><div className="panel-title">Bound actors</div><dl><dt>Owner</dt><dd><code>{item.owner}</code></dd><dt>Issuer wallet</dt><dd><code>{item.issuer}</code></dd><dt>Service provider</dt><dd><code>{item.provider}</code></dd></dl><p className="trust-note">The owner selected this issuer wallet. Its signature does not by itself verify the controller&apos;s legal identity.</p><a className="text-link" href={`${EXPLORER_URL}/address/${configuredContractAddress()}`} target="_blank" rel="noreferrer">Explorer readback <ExternalLink size={15} /></a></aside>
    </div>
    {!wallet.isConnected && <div className="notice">Connect wallet to continue</div>}
    {wallet.isConnected && !wallet.isCorrectNetwork && <div className="notice warning">Switch the connected wallet to GenLayer Studionet before writing.</div>}
    {issuerCanSubmit && <ServiceRecordForm caseId={item.id} nextVersion={item.latest_evidence_version + 1} onDone={refresh} />}
    {ownerCanCancel && issuerCanSubmit && <button className="button danger" disabled={busy} onClick={() => void cancel()}>Cancel case</button>}
    {writesReady && item.status === "SUBMITTED" && <EvaluatePanel caseId={item.id} onDone={refresh} />}
    {writesReady && item.status !== "SUBMITTED" && !issuerCanSubmit && <CaseActions wallet={wallet.address} caseRecord={item} busy={busy} onCancel={() => void cancel()} onSubmit={() => undefined} onEvaluate={() => undefined} />}
    {actionError && <div className="notice error">{actionError}</div>}
    {progress && <TransactionTimeline {...progress} />}
    {evidence.data && evidence.data.length > 0 && <section className="panel history"><div className="panel-title">Canonical record revisions</div>{evidence.data.map(entry => <div className="history-row" key={entry.revision_index}><strong>v{entry.version}</strong><code>{entry.record_digest}</code><span>{entry.evaluated ? "Evaluated" : "Awaiting evaluation"}<br />Issuer {entry.issuer.slice(0, 10)}…</span></div>)}</section>}
    {attempts.data && attempts.data.length > 0 && <section className="panel history"><div className="panel-title">Resolution attempts</div>{attempts.data.map(entry => <div className="history-row" key={entry.attempt_index}><strong>{entry.outcome}</strong><code>{entry.record_digest}<br />{entry.fingerprint}</code><span>{entry.findings.reason}</span></div>)}</section>}
    {certificate.data && <CertificateCard certificate={certificate.data} />}
    {item.status === "UNRESOLVED" && <div className="notice warning"><strong>UNRESOLVED</strong> The exact record was insufficient, expired, contradictory, or unsafe to decide. Only the bound issuer may submit a strictly newer revision.</div>}
  </div>;
}
