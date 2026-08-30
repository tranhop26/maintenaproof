import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import type {
  DecodedDeployData,
  GenLayerChain,
  GenLayerClient,
  TransactionHash,
} from "genlayer-js/types";
import { TransactionStatus } from "genlayer-js/types";

import { successfulExecution } from "./receipt.js";

const RUNNER =
  "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6";

export default async function main(client: GenLayerClient<GenLayerChain>) {
  const contractPath = path.resolve("contracts/maintenance_proof.py");
  const contractCode = readFileSync(contractPath);
  await client.initializeConsensusSmartContract();

  const deploymentTransaction = await client.deployContract({
    code: new Uint8Array(contractCode),
    args: [],
  });
  const receipt = await client.waitForTransactionReceipt({
    hash: deploymentTransaction as TransactionHash,
    status: TransactionStatus.FINALIZED,
    retries: 240,
    interval: 5_000,
  });
  const studioReceipt = receipt as typeof receipt & {
    status?: string | number;
    data?: { contract_address?: string };
    consensus_data?: {
      leader_receipt?: Array<{ execution_result?: string }>;
    };
  };
  const finalized =
    receipt.statusName === "FINALIZED" ||
    studioReceipt.status === "FINALIZED" ||
    studioReceipt.status === 7;
  if (!finalized) {
    throw new Error(
      `Deployment did not finalize: ${String(receipt.statusName ?? studioReceipt.status)}`,
    );
  }
  if (!successfulExecution(studioReceipt)) {
    throw new Error(
      `Deployment execution failed: ${receipt.txExecutionResultName ?? studioReceipt.consensus_data?.leader_receipt?.[0]?.execution_result ?? "UNKNOWN"}`,
    );
  }

  const contractAddress = (
    (receipt.txDataDecoded as DecodedDeployData | undefined)?.contractAddress ??
    studioReceipt.data?.contract_address
  ) as `0x${string}` | undefined;
  if (!contractAddress) {
    throw new Error("Finalized deployment receipt has no contract address");
  }
  const caseCount = await client.readContract({
    address: contractAddress,
    functionName: "case_count",
    args: [],
  });
  if (caseCount !== 0 && caseCount !== 0n) {
    throw new Error(`Unexpected initial readback: ${String(caseCount)}`);
  }

  const manifest = {
    network: "studionet",
    chainId: 61_999,
    classification: "INTENTIONALLY_FROZEN",
    runner: RUNNER,
    sourceSha256: createHash("sha256").update(contractCode).digest("hex"),
    deployer: client.account?.address,
    contractAddress,
    deploymentTransaction,
    deployedAt: new Date().toISOString(),
    readback: { caseCount: Number(caseCount) },
  };
  if (!manifest.deployer) {
    throw new Error("Deployment client has no active deployer account");
  }
  mkdirSync("deployments", { recursive: true });
  const manifestPath = path.join(
    "deployments",
    `studionet-${contractAddress.toLowerCase()}.json`,
  );
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}
