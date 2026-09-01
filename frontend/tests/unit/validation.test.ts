import { describe, expect, it } from "vitest";

import { assertCreateCaseInput, assertServiceRecordInput } from "@/lib/contract/validation";
import type { CreateCaseInput, SubmitServiceRecordInput } from "@/lib/contract/types";

const issuer = `0x${"1".repeat(40)}` as const;
const provider = `0x${"2".repeat(40)}` as const;
const validCase: CreateCaseInput = {
  assetHash: "a".repeat(64), issuer, provider,
  policy: "Replace the filter and verify outlet pressure is within range.",
  policyVersion: "hvac-v1", cycleId: "cycle-2026-q3",
  cycleStart: "2026-07-01", cycleEnd: "2026-09-30",
};
const validRecord: SubmitServiceRecordInput = {
  caseId: 0n, version: 1n, serviceDate: "2026-08-15",
  issuedAt: "2026-08-16T10:00:00Z", expiresAt: "2026-09-30T23:59:59Z",
  nonce: "record-001",
  completedActions: ["replace intake filter", "verify outlet pressure 80-120 psi"],
  measurements: [{ name: "outlet pressure", value: "100", unit: "psi" }],
  attachments: [{ uri: "ipfs://bafy-record", sha256: "b".repeat(64) }],
  notes: "Technician service record",
};

describe("V2 contract validation mirror", () => {
  it("accepts separate issuer/provider bindings and a structured record", () => {
    expect(() => assertCreateCaseInput(validCase)).not.toThrow();
    expect(() => assertServiceRecordInput(validRecord)).not.toThrow();
  });

  it.each([
    ["asset hash", { assetHash: "ABC" }],
    ["issuer", { issuer: `0x${"0".repeat(40)}` }],
    ["provider", { provider: `0x${"0".repeat(40)}` }],
    ["policy", { policy: "short" }],
    ["cycle", { cycleStart: "2026-10-01" }],
    ["date", { cycleEnd: "2026-02-31" }],
  ])("rejects invalid case %s", (_, mutation) => {
    expect(() => assertCreateCaseInput({ ...validCase, ...mutation } as CreateCaseInput)).toThrow();
  });

  it.each([
    ["version", { version: 0n }],
    ["service date", { serviceDate: "2026-02-31" }],
    ["issued timestamp", { issuedAt: "2026-08-16" }],
    ["expiry order", { expiresAt: "2026-08-15T09:00:00Z" }],
    ["completed actions", { completedActions: [] }],
    ["duplicate action", { completedActions: ["same", "same"] }],
    ["measurement", { measurements: [{ name: "", value: "1", unit: "psi" }] }],
    ["attachment", { attachments: [{ uri: "ipfs://x", sha256: "B".repeat(64) }] }],
    ["nonce", { nonce: "" }],
    ["notes", { notes: "n".repeat(2_001) }],
  ])("rejects invalid service record %s", (_, mutation) => {
    expect(() => assertServiceRecordInput({ ...validRecord, ...mutation } as SubmitServiceRecordInput)).toThrow();
  });
});
