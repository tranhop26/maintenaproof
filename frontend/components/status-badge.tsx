import type { CaseStatus } from "@/lib/contract/types";

export function StatusBadge({ status }: { status: CaseStatus }) {
  return <span className={`status status-${status.toLowerCase().replace("_", "-")}`}>{status.replace("_", " ")}</span>;
}
