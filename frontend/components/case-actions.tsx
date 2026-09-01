import type { Address, CaseRecord } from "@/lib/contract/types";

interface Props { wallet: Address | null; caseRecord: CaseRecord; busy: boolean; onCancel(): void; onSubmit(): void; onEvaluate(): void }
export function CaseActions({ wallet, caseRecord, busy, onCancel, onSubmit, onEvaluate }: Props) {
  if (!wallet) return <div className="notice">Connect wallet to continue</div>;
  if (["COMPLIANT", "NON_COMPLIANT", "CANCELLED"].includes(caseRecord.status)) return <div className="notice">This case is finalized and read-only.</div>;
  const actor = wallet.toLowerCase();
  return <div className="actions">
    {caseRecord.status === "AWAITING_RECORD" && actor === caseRecord.owner.toLowerCase() && <button className="button danger" disabled={busy} onClick={onCancel}>Cancel case</button>}
    {["AWAITING_RECORD", "UNRESOLVED"].includes(caseRecord.status) && actor === caseRecord.issuer.toLowerCase() && <button className="button primary" disabled={busy} onClick={onSubmit}>Submit service record</button>}
    {caseRecord.status === "SUBMITTED" && <button className="button primary" disabled={busy} onClick={onEvaluate}>Evaluate record</button>}
  </div>;
}
