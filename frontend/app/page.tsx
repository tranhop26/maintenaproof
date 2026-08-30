"use client";

import Link from "next/link";
import { ArrowRight, FileCheck2, Plus } from "lucide-react";
import { CaseCard } from "@/components/case-card";
import { configuredContractAddress } from "@/lib/genlayer/config";
import { useCases } from "@/lib/hooks/use-cases";

export default function Dashboard() {
  const query = useCases(); const configured = configuredContractAddress();
  return <div className="page"><section className="hero"><div><div className="eyebrow">EQUIPMENT COMPLIANCE · ON-CHAIN</div><h1>Maintenance evidence,<br /><em>settled without trust.</em></h1><p>Lock a service policy, bind a provider, and let GenLayer validators establish whether public evidence proves the work.</p><div className="hero-actions"><Link className="button primary" href="/cases/new"><Plus size={17} />Create case</Link><a className="text-link" href="#cases">View records <ArrowRight size={15} /></a></div></div><div className="trust-card"><FileCheck2 size={28} /><span>CONTRACT SOURCE OF TRUTH</span><strong>No backend verdicts.</strong><p>Every actor, revision, decision and certificate is read directly from the Intelligent Contract.</p></div></section><section id="cases" className="records"><div className="section-heading"><div><div className="eyebrow">PUBLIC REGISTER</div><h2>Maintenance cases</h2></div>{query.data && <span>{query.data.length} ON-CHAIN RECORD{query.data.length === 1 ? "" : "S"}</span>}</div>{!configured ? <div className="empty error"><h3>Contract not configured</h3><p>Set NEXT_PUBLIC_CONTRACT_ADDRESS to a deployed MaintenaProof address. No sample records are substituted.</p></div> : query.isLoading ? <div className="empty"><div className="loader" /><p>Reading contract state…</p></div> : query.error ? <div className="empty error"><h3>Readback failed</h3><p>{query.error.message}</p></div> : query.data?.length === 0 ? <div className="empty"><h3>No cases yet</h3><p>Create the first immutable maintenance case.</p></div> : <div className="case-grid">{query.data?.map(record => <CaseCard key={record.id} record={record} />)}</div>}</section></div>;
}
