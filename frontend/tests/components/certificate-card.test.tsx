import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CertificateCard } from "@/components/certificate-card";
import type { Certificate } from "@/lib/contract/types";

const contractAddress = `0x${"a".repeat(40)}` as const;
const issuer = `0x${"1".repeat(40)}` as const;
const provider = `0x${"2".repeat(40)}` as const;
const certificate: Certificate = {
  asset_hash: "b".repeat(64), case_id: 4, chain_id: 61999,
  completed: ["replace filter"], contract_address: contractAddress,
  contradictions: [],
  cycle_end: "2026-09-30", cycle_id: "cycle-q3", cycle_start: "2026-07-01",
  evidence_version: 1, expires_at: "2026-09-30T23:59:59Z",
  findings: {
    asset_hash: "b".repeat(64), case_id: 4, completed: ["replace filter"],
    contradictions: [], cycle_id: "cycle-q3", expires_at: "2026-09-30T23:59:59Z",
    issued_at: "2026-08-16T10:00:00Z", issuer, missing: [], outcome: "COMPLIANT",
    policy_hash: "c".repeat(64), policy_version: "v1", provider,
    reason: "All obligations evidenced.", record_digest: "d".repeat(64),
    record_schema: "maintenaproof.service-record.v2", record_version: 1,
    service_date: "2026-08-15",
  },
  fingerprint: "f".repeat(64), issued_at: "2026-08-16T10:00:00Z", issuer,
  missing: [], outcome: "COMPLIANT", policy: "Replace filter",
  policy_hash: "c".repeat(64), policy_version: "v1", provider,
  record_digest: "d".repeat(64), record_schema: "maintenaproof.service-record.v2",
  record_version: 1, service_date: "2026-08-15",
};

describe("CertificateCard", () => {
  it("renders immutable fingerprint and explorer contract link", () => {
    render(<CertificateCard certificate={certificate} />);
    expect(screen.getByText(certificate.fingerprint)).toBeVisible();
    expect(screen.getByText(certificate.issuer)).toBeVisible();
    expect(screen.getByText(certificate.provider)).toBeVisible();
    expect(screen.getByText(certificate.record_digest)).toBeVisible();
    expect(screen.getByText(certificate.policy_hash)).toBeVisible();
    expect(screen.getByText(/issuer wallet attests/i)).toBeVisible();
    expect(screen.getByRole("link", { name: /view contract/i })).toHaveAttribute(
      "href", expect.stringContaining(contractAddress),
    );
  });
});
