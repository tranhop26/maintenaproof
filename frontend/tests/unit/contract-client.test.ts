import { describe, expect, it, vi } from "vitest";

import { MaintenaProofClient } from "@/lib/contract/client";
import type { CreateCaseInput, GenLayerClientPort, SubmitServiceRecordInput, TransactionStage } from "@/lib/contract/types";

const address = `0x${"a".repeat(40)}` as const;
const owner = `0x${"1".repeat(40)}` as const;
const issuer = `0x${"2".repeat(40)}` as const;
const provider = `0x${"3".repeat(40)}` as const;
const caseRecord = {
  asset_hash: "a".repeat(64), attempt_count: 0, certificate_fingerprint: "",
  cycle_end: "2026-09-30", cycle_id: "cycle-2026-q3", cycle_start: "2026-07-01",
  evidence_count: 0, id: 0, issuer, latest_evidence_version: 0, owner,
  policy: "Replace the filter and verify outlet pressure is within range.",
  policy_hash: "d".repeat(64), policy_version: "hvac-v1", provider,
  record_schema: "maintenaproof.service-record.v2", status: "AWAITING_RECORD" as const,
};
const createInput: CreateCaseInput = {
  assetHash: caseRecord.asset_hash, issuer, provider, policy: caseRecord.policy,
  policyVersion: caseRecord.policy_version, cycleId: caseRecord.cycle_id,
  cycleStart: caseRecord.cycle_start, cycleEnd: caseRecord.cycle_end,
};
const recordInput: SubmitServiceRecordInput = {
  caseId: 0n, version: 1n, serviceDate: "2026-08-15",
  issuedAt: "2026-08-16T10:00:00Z", expiresAt: "2026-09-30T23:59:59Z",
  nonce: "record-001", completedActions: ["replace filter"],
  measurements: [{ name: "pressure", value: "100", unit: "psi" }],
  attachments: [{ uri: "ipfs://record", sha256: "b".repeat(64) }], notes: "Issued record",
};

function port(overrides: Partial<GenLayerClientPort> = {}): GenLayerClientPort {
  return {
    readContract: vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(JSON.stringify(caseRecord)),
    writeContract: vi.fn().mockResolvedValue(`0x${"b".repeat(64)}`),
    waitForTransactionReceipt: vi.fn().mockResolvedValue({ statusName: "FINALIZED", txExecutionResultName: "SUCCESS" }),
    ...overrides,
  };
}

describe("V2 contract adapter", () => {
  it("maps create_case in exact V2 argument order and confirms readback", async () => {
    const sdk = port();
    const stages: TransactionStage[] = [];
    const result = await new MaintenaProofClient(sdk, address, owner).createCase(createInput, p => stages.push(p.stage));
    expect(result.ok).toBe(true);
    expect(sdk.writeContract).toHaveBeenCalledWith({
      address, functionName: "create_case",
      args: [createInput.assetHash, issuer, provider, createInput.policy, createInput.policyVersion, createInput.cycleId, createInput.cycleStart, createInput.cycleEnd],
      value: 0n,
    });
    expect(stages).toEqual(["AWAITING_SIGNATURE", "PENDING", "FINALIZED", "EXECUTION_SUCCESS", "READBACK_CONFIRMED"]);
  });

  it("serializes structured service record arrays for issuer submission", async () => {
    const submitted = { ...caseRecord, status: "SUBMITTED" as const, evidence_count: 1, latest_evidence_version: 1 };
    const sdk = port({ readContract: vi.fn().mockResolvedValue(JSON.stringify(submitted)) });
    const result = await new MaintenaProofClient(sdk, address, issuer).submitServiceRecord(recordInput, () => undefined);
    expect(result.ok).toBe(true);
    expect(sdk.writeContract).toHaveBeenCalledWith({
      address, functionName: "submit_service_record",
      args: [0n, 1n, recordInput.serviceDate, recordInput.issuedAt, recordInput.expiresAt, recordInput.nonce, JSON.stringify(recordInput.completedActions), JSON.stringify(recordInput.measurements), JSON.stringify(recordInput.attachments), recordInput.notes],
      value: 0n,
    });
  });

  it("rejects service submission from a wallet other than the bound issuer", async () => {
    const sdk = port({ readContract: vi.fn().mockResolvedValue(JSON.stringify(caseRecord)) });
    const client = new MaintenaProofClient(sdk, address, owner);
    await expect(client.submitServiceRecord(recordInput, () => undefined)).rejects.toThrow(/issuer/i);
    expect(sdk.writeContract).not.toHaveBeenCalled();
  });

  it("does not claim success for execution error or readback mismatch", async () => {
    const executionSdk = port({ waitForTransactionReceipt: vi.fn().mockResolvedValue({ statusName: "FINALIZED", txExecutionResultName: "ERROR" }) });
    expect((await new MaintenaProofClient(executionSdk, address, owner).createCase(createInput, () => undefined)).ok).toBe(false);
    const mismatchSdk = port({ readContract: vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(JSON.stringify({ ...caseRecord, status: "SUBMITTED" })) });
    expect(await new MaintenaProofClient(mismatchSdk, address, owner).createCase(createInput, () => undefined)).toMatchObject({ ok: false, error: "Contract readback mismatch" });
  });

  it("rejects disconnected/unconfigured clients and malformed JSON", async () => {
    const sdk = port();
    await expect(new MaintenaProofClient(sdk, address).createCase(createInput, () => undefined)).rejects.toThrow(/wallet/i);
    await expect(new MaintenaProofClient(sdk, "" as `0x${string}`, owner).getCase(0n)).rejects.toThrow(/contract address/i);
    const malformed = new MaintenaProofClient(port({ readContract: vi.fn().mockResolvedValue("not-json") }), address, owner);
    await expect(malformed.getCase(0n)).rejects.toThrow(/readback/i);
  });
});
