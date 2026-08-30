import { describe, expect, it, vi } from "vitest";

import { MaintenaProofClient } from "@/lib/contract/client";
import type {
  CreateCaseInput,
  GenLayerClientPort,
  TransactionStage,
} from "@/lib/contract/types";

const address = `0x${"a".repeat(40)}` as const;
const owner = `0x${"1".repeat(40)}` as const;
const provider = `0x${"2".repeat(40)}` as const;
const caseRecord = {
  asset_hash: "a".repeat(64),
  attempt_count: 0,
  certificate_fingerprint: "",
  cycle_end: "2026-09-30",
  cycle_id: "cycle-2026-q3",
  cycle_start: "2026-07-01",
  evidence_count: 0,
  evidence_hostname: "httpbin.org",
  id: 0,
  latest_evidence_version: 0,
  owner,
  policy: "Replace the filter and verify outlet pressure is within range.",
  policy_version: "hvac-v1",
  provider,
  status: "DRAFT",
};
const input: CreateCaseInput = {
  assetHash: "a".repeat(64),
  provider,
  evidenceHostname: "httpbin.org",
  policy: caseRecord.policy,
  policyVersion: "hvac-v1",
  cycleId: "cycle-2026-q3",
  cycleStart: "2026-07-01",
  cycleEnd: "2026-09-30",
};

function port(overrides: Partial<GenLayerClientPort> = {}): GenLayerClientPort {
  return {
    readContract: vi
      .fn()
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(JSON.stringify(caseRecord)),
    writeContract: vi.fn().mockResolvedValue(`0x${"b".repeat(64)}`),
    waitForTransactionReceipt: vi.fn().mockResolvedValue({
      statusName: "FINALIZED",
      txExecutionResultName: "SUCCESS",
    }),
    ...overrides,
  };
}

describe("truthful write progress", () => {
  it("reports finalization, execution, then authoritative readback", async () => {
    const stages: TransactionStage[] = [];
    const client = new MaintenaProofClient(port(), address, owner);

    const result = await client.createCase(input, (progress) =>
      stages.push(progress.stage),
    );

    expect(result.ok).toBe(true);
    expect(stages).toEqual([
      "AWAITING_SIGNATURE",
      "PENDING",
      "FINALIZED",
      "EXECUTION_SUCCESS",
      "READBACK_CONFIRMED",
    ]);
  });

  it("does not claim success for a finalized execution error", async () => {
    const stages: TransactionStage[] = [];
    const client = new MaintenaProofClient(
      port({
        waitForTransactionReceipt: vi.fn().mockResolvedValue({
          statusName: "FINALIZED",
          txExecutionResultName: "ERROR",
        }),
      }),
      address,
      owner,
    );

    const result = await client.createCase(input, (p) => stages.push(p.stage));

    expect(result.ok).toBe(false);
    expect(result.hash).toMatch(/^0x/);
    expect(stages).toEqual([
      "AWAITING_SIGNATURE",
      "PENDING",
      "FINALIZED",
      "EXECUTION_ERROR",
    ]);
  });

  it("terminates progress when the wallet rejects before a hash exists", async () => {
    const stages: TransactionStage[] = [];
    const client = new MaintenaProofClient(
      port({ writeContract: vi.fn().mockRejectedValue(new Error("User rejected")) }),
      address,
      owner,
    );

    const result = await client.createCase(input, p => stages.push(p.stage));

    expect(result.ok).toBe(false);
    expect(stages).toEqual(["AWAITING_SIGNATURE", "EXECUTION_ERROR"]);
  });

  it("rejects disconnected and unconfigured clients before writing", async () => {
    const sdk = port();
    await expect(
      new MaintenaProofClient(sdk, address).createCase(input, () => undefined),
    ).rejects.toThrow(/wallet/i);
    await expect(
      new MaintenaProofClient(sdk, "" as `0x${string}`, owner).getCase(0n),
    ).rejects.toThrow(/contract address/i);
    expect(sdk.writeContract).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON readback", async () => {
    const client = new MaintenaProofClient(
      port({ readContract: vi.fn().mockResolvedValue("not-json") }),
      address,
      owner,
    );
    await expect(client.getCase(0n)).rejects.toThrow(/readback/i);
  });
});
