import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CaseActions } from "@/components/case-actions";
import type { CaseRecord } from "@/lib/contract/types";

const owner = `0x${"1".repeat(40)}` as const;
const provider = `0x${"2".repeat(40)}` as const;
const issuer = `0x${"3".repeat(40)}` as const;
const stranger = `0x${"4".repeat(40)}` as const;
const base: CaseRecord = {
  asset_hash: "a".repeat(64), attempt_count: 0,
  certificate_fingerprint: "", cycle_end: "2026-09-30",
  cycle_id: "cycle-q3", cycle_start: "2026-07-01", evidence_count: 0,
  id: 0, issuer, latest_evidence_version: 0,
  owner, policy: "Replace filter and verify outlet pressure.",
  policy_hash: "d".repeat(64), policy_version: "v1", provider,
  record_schema: "maintenaproof.service-record.v2", status: "AWAITING_RECORD",
};
const handlers = {
  onCancel: vi.fn(), onSubmit: vi.fn(), onEvaluate: vi.fn(), busy: false,
};

describe("actor-aware actions", () => {
  it("requires a wallet", () => {
    render(<CaseActions wallet={null} caseRecord={base} {...handlers} />);
    expect(screen.getByText("Connect wallet to continue")).toBeVisible();
  });

  it("shows owner cancellation only while awaiting a record", () => {
    render(<CaseActions wallet={owner} caseRecord={base} {...handlers} />);
    expect(screen.getByRole("button", { name: /cancel case/i })).toBeVisible();
    expect(screen.queryByRole("button", { name: /submit evidence/i })).toBeNull();
  });

  it("shows locked issuer submission for awaiting and unresolved cases", () => {
    const { rerender } = render(
      <CaseActions wallet={issuer} caseRecord={base} {...handlers} />,
    );
    expect(screen.getByRole("button", { name: /submit service record/i })).toBeVisible();
    rerender(
      <CaseActions
        wallet={issuer}
        caseRecord={{ ...base, status: "UNRESOLVED" }}
        {...handlers}
      />,
    );
    expect(screen.getByRole("button", { name: /submit service record/i })).toBeVisible();
    rerender(<CaseActions wallet={provider} caseRecord={base} {...handlers} />);
    expect(screen.queryByRole("button", { name: /submit service record/i })).toBeNull();
  });

  it("allows permissionless evaluation only after submission", () => {
    render(
      <CaseActions
        wallet={stranger}
        caseRecord={{ ...base, status: "SUBMITTED" }}
        {...handlers}
      />,
    );
    expect(screen.getByRole("button", { name: /evaluate record/i })).toBeVisible();
  });

  it("shows read-only terminal state", () => {
    render(
      <CaseActions
        wallet={owner}
        caseRecord={{ ...base, status: "COMPLIANT" }}
        {...handlers}
      />,
    );
    expect(screen.getByText("This case is finalized and read-only.")).toBeVisible();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
