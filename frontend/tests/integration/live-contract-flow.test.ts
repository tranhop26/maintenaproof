import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { privateKeyToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";

import { MaintenaProofClient } from "@/lib/contract/client";
import type { Address, GenLayerClientPort, TransactionStage } from "@/lib/contract/types";

const contractAddress = process.env.MAINTENAPROOF_CONTRACT_ADDRESS as Address | undefined;
const ownerKey = process.env.E2E_OWNER_PRIVATE_KEY as `0x${string}` | undefined;
const providerKey = process.env.E2E_PROVIDER_PRIVATE_KEY as `0x${string}` | undefined;
const evaluatorKey = process.env.E2E_EVALUATOR_PRIVATE_KEY as `0x${string}` | undefined;
const configured = Boolean(contractAddress && ownerKey && providerKey && evaluatorKey);

function adapter(key: `0x${string}`) {
  const account = privateKeyToAccount(key);
  const sdk = createClient({ chain: studionet, account }) as unknown as GenLayerClientPort;
  return { account, client: new MaintenaProofClient(sdk, contractAddress!, account.address) };
}

function serviceRecord(caseId: bigint) {
  return {
    caseId, version: 1n, serviceDate: "2026-08-15",
    issuedAt: "2026-08-16T10:00:00Z", expiresAt: "2026-09-30T23:59:59Z",
    nonce: `e2e-${caseId}`, completedActions: [
      "replace intake filter", "verify outlet pressure 80-120 psi",
    ],
    measurements: [{ name: "outlet pressure", value: "100", unit: "psi" }],
    attachments: [], notes: "E2E issuer record",
  };
}

describe.skipIf(!configured)("deployed frontend-to-contract flow", () => {
  it("uses distinct actors and confirms safe authoritative readback", async () => {
    const owner = adapter(ownerKey!); const provider = adapter(providerKey!); const evaluator = adapter(evaluatorKey!);
    const stages: TransactionStage[] = [];
    const created = await owner.client.createCase({
      assetHash: "a".repeat(64), issuer: provider.account.address,
      provider: provider.account.address,
      policy: "Replace the intake filter and verify outlet pressure is 80-120 psi.",
      policyVersion: "hvac-v1", cycleId: "cycle-e2e",
      cycleStart: "2026-07-01", cycleEnd: "2026-09-30",
    }, p => stages.push(p.stage));
    expect(created.ok).toBe(true); if (!created.ok) return;
    const caseId = BigInt(created.caseRecord.id);
    const submitted = await provider.client.submitServiceRecord(serviceRecord(caseId), () => undefined);
    expect(submitted.ok).toBe(true);
    const evaluated = await evaluator.client.evaluate(caseId, () => undefined);
    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) return;
    expect(["COMPLIANT", "UNRESOLVED"]).toContain(evaluated.caseRecord.status);
    if (evaluated.caseRecord.status === "COMPLIANT") {
      const certificate = await evaluator.client.getCertificate(caseId);
      expect(certificate.fingerprint).toBe(evaluated.caseRecord.certificate_fingerprint);
    } else {
      expect(evaluated.caseRecord.certificate_fingerprint).toBe("");
    }
    expect(stages).toContain("FINALIZED");
    expect(stages).toContain("READBACK_CONFIRMED");
  }, 300_000);

  it("rejects an owner replaying the provider submission role", async () => {
    const owner = adapter(ownerKey!); const provider = adapter(providerKey!);
    const created = await owner.client.createCase({
      assetHash: "b".repeat(64), issuer: provider.account.address,
      provider: provider.account.address,
      policy: "Replace the intake filter and verify outlet pressure is 80-120 psi.",
      policyVersion: "hvac-v1", cycleId: "cycle-e2e-authz",
      cycleStart: "2026-07-01", cycleEnd: "2026-09-30",
    }, () => undefined);
    expect(created.ok).toBe(true); if (!created.ok) return;
    const caseId = BigInt(created.caseRecord.id);
    await expect(owner.client.submitServiceRecord(
      serviceRecord(caseId), () => undefined,
    )).rejects.toThrow(/issuer/i);
    expect((await owner.client.getCase(caseId)).status).toBe("AWAITING_RECORD");
  }, 180_000);
});
