import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CertificateCard } from "@/components/certificate-card";
import type { Certificate } from "@/lib/contract/types";

const contractAddress = `0x${"a".repeat(40)}` as const;
const certificate: Certificate = {
  asset_hash: "b".repeat(64), case_id: 4, contract_address: contractAddress,
  cycle_end: "2026-09-30", cycle_id: "cycle-q3", cycle_start: "2026-07-01",
  evidence_version: 1,
  findings: {
    asset_hash: "b".repeat(64), completed: ["replace filter"], contradictions: [],
    cycle_id: "cycle-q3", evidence_version: 1, missing: [], outcome: "COMPLIANT",
    provider: `0x${"2".repeat(40)}`, reason: "All obligations evidenced.",
    service_date: "2026-08-15",
  },
  fingerprint: "f".repeat(64), policy: "Replace filter", policy_version: "v1",
  provider: `0x${"2".repeat(40)}`,
};

describe("CertificateCard", () => {
  it("renders immutable fingerprint and explorer contract link", () => {
    render(<CertificateCard certificate={certificate} />);
    expect(screen.getByText(certificate.fingerprint)).toBeVisible();
    expect(screen.getByRole("link", { name: /view contract/i })).toHaveAttribute(
      "href", expect.stringContaining(contractAddress),
    );
  });
});
