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

function evidenceUrl(provider: Address): string {
  const report = JSON.stringify({
    asset_hash: "a".repeat(64), cycle_id: "cycle-e2e", evidence_version: 1,
    provider, service_date: "2026-08-15",
    completed: ["replace intake filter", "verify outlet pressure 80-120 psi"],
  });
  return `https://httpbin.org/base64/${encodeURIComponent(Buffer.from(report).toString("base64"))}`;
}

describe.skipIf(!configured)("deployed frontend-to-contract flow", () => {
  it("uses distinct actors and confirms certificate readback", async () => {
    const owner = adapter(ownerKey!); const provider = adapter(providerKey!); const evaluator = adapter(evaluatorKey!);
    const stages: TransactionStage[] = [];
    const created = await owner.client.createCase({
      assetHash: "a".repeat(64), provider: provider.account.address,
      evidenceHostname: "httpbin.org",
      policy: "Replace the intake filter and verify outlet pressure is 80-120 psi.",
      policyVersion: "hvac-v1", cycleId: "cycle-e2e",
      cycleStart: "2026-07-01", cycleEnd: "2026-09-30",
    }, p => stages.push(p.stage));
    expect(created.ok).toBe(true); if (!created.ok) return;
    const caseId = BigInt(created.caseRecord.id);
    const submitted = await provider.client.submitEvidence({ caseId, url: evidenceUrl(provider.account.address), version: 1n }, () => undefined);
    expect(submitted.ok).toBe(true);
    const evaluated = await evaluator.client.evaluate(caseId, () => undefined);
    expect(evaluated.ok).toBe(true);
    const certificate = await evaluator.client.getCertificate(caseId);
    expect(certificate.fingerprint).toBe(evaluated.ok ? evaluated.caseRecord.certificate_fingerprint : "");
    expect(stages).toContain("FINALIZED");
    expect(stages).toContain("READBACK_CONFIRMED");
  }, 300_000);
});
