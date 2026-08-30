import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import type { CaseRecord } from "@/lib/contract/types";

export function CaseCard({ record }: { record: CaseRecord }) {
  return <Link className="case-card" href={`/cases/${record.id}`}><div className="case-card-top"><span className="case-number">CASE {String(record.id).padStart(4, "0")}</span><StatusBadge status={record.status} /></div><h3>{record.cycle_id}</h3><p>{record.policy}</p><div className="case-meta"><span>{record.evidence_hostname}</span><span>{record.cycle_start} → {record.cycle_end}</span><ArrowUpRight size={18} /></div></Link>;
}
