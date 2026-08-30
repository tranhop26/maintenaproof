import { Check, Circle, LoaderCircle, X } from "lucide-react";
import type { TransactionStage } from "@/lib/contract/types";

const order: TransactionStage[] = ["AWAITING_SIGNATURE", "PENDING", "FINALIZED", "EXECUTION_SUCCESS", "READBACK_CONFIRMED"];
const labels: Partial<Record<TransactionStage, string>> = {
  AWAITING_SIGNATURE: "Awaiting wallet signature", PENDING: "Transaction pending",
  FINALIZED: "Finalized by consensus", EXECUTION_SUCCESS: "Action completed",
  READBACK_CONFIRMED: "Contract readback confirmed", EXECUTION_ERROR: "Contract execution failed",
};

export function TransactionTimeline({ stage, hash }: { stage: TransactionStage; hash?: string }) {
  const error = stage === "EXECUTION_ERROR";
  const current = order.indexOf(stage);
  return <section className="timeline" aria-live="polite"><div className="eyebrow">TRANSACTION STATE</div>{error ? <div className="timeline-row error"><X size={18} /><span>Contract execution failed</span></div> : order.map((item, index) => {
    if (index > current) return null;
    const active = index === current && current < order.length - 1;
    return <div className="timeline-row" key={item}>{active ? <LoaderCircle className="spin" size={18} /> : index < current || item === "READBACK_CONFIRMED" ? <Check size={18} /> : <Circle size={18} />}<span>{labels[item]}</span></div>;
  })}{hash && <code className="hash">{hash}</code>}</section>;
}
