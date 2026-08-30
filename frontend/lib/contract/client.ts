import type {
  Address,
  CaseRecord,
  Certificate,
  CreateCaseInput,
  EvidenceRecord,
  GenLayerClientPort,
  ProgressSink,
  ResolutionAttempt,
  SubmitEvidenceInput,
  WriteResult,
} from "@/lib/contract/types";
import {
  assertCreateCaseInput,
  assertEvidenceInput,
} from "@/lib/contract/validation";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

function parseReadback<T>(value: unknown): T {
  if (typeof value !== "string") {
    throw new Error("Contract readback was not canonical JSON");
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error("Contract readback JSON could not be parsed");
  }
}

export class MaintenaProofClient {
  constructor(
    private readonly sdk: GenLayerClientPort,
    private readonly contractAddress: Address,
    private readonly walletAddress?: Address,
  ) {}

  private configured(): void {
    if (!ADDRESS.test(this.contractAddress)) {
      throw new Error("Contract address is not configured");
    }
  }

  private connected(): Address {
    if (!this.walletAddress) throw new Error("Wallet is not connected");
    return this.walletAddress;
  }

  private async read(functionName: string, args: readonly unknown[]) {
    this.configured();
    return this.sdk.readContract({
      address: this.contractAddress,
      functionName,
      args,
    });
  }

  async listCases(): Promise<CaseRecord[]> {
    const count = Number(await this.read("case_count", []));
    return Promise.all(
      Array.from({ length: count }, (_, id) => this.getCase(BigInt(id))),
    );
  }

  async getCase(caseId: bigint): Promise<CaseRecord> {
    return parseReadback<CaseRecord>(await this.read("get_case", [caseId]));
  }

  async getEvidence(caseId: bigint, index: bigint): Promise<EvidenceRecord> {
    return parseReadback<EvidenceRecord>(
      await this.read("get_evidence", [caseId, index]),
    );
  }

  async getAttempt(caseId: bigint, index: bigint): Promise<ResolutionAttempt> {
    return parseReadback<ResolutionAttempt>(
      await this.read("get_attempt", [caseId, index]),
    );
  }

  async getCertificate(caseId: bigint): Promise<Certificate> {
    return parseReadback<Certificate>(
      await this.read("get_certificate", [caseId]),
    );
  }

  private async write(
    functionName: string,
    args: readonly unknown[],
    expected: (record: CaseRecord) => boolean,
    caseId: bigint,
    onProgress: ProgressSink,
  ): Promise<WriteResult> {
    this.configured();
    this.connected();
    let hash: Address | undefined;
    try {
      onProgress({ stage: "AWAITING_SIGNATURE" });
      hash = await this.sdk.writeContract({
        address: this.contractAddress,
        functionName,
        args,
        value: 0n,
      });
      onProgress({ stage: "PENDING", hash });
      const receipt = await this.sdk.waitForTransactionReceipt({
        hash,
        status: "FINALIZED",
        retries: 120,
        interval: 5_000,
      });
      if (receipt.statusName !== "FINALIZED") {
        throw new Error(`Transaction stopped at ${receipt.statusName ?? "UNKNOWN"}`);
      }
      onProgress({ stage: "FINALIZED", hash });
      if (
        receipt.txExecutionResultName !== "SUCCESS" &&
        receipt.txExecutionResultName !== "FINISHED_WITH_RETURN"
      ) {
        onProgress({ stage: "EXECUTION_ERROR", hash });
        return {
          ok: false,
          hash,
          error: `Contract execution: ${receipt.txExecutionResultName ?? "UNKNOWN"}`,
        };
      }
      onProgress({ stage: "EXECUTION_SUCCESS", hash });
      const caseRecord = await this.getCase(caseId);
      if (!expected(caseRecord)) {
        onProgress({
          stage: "EXECUTION_ERROR",
          hash,
          message: "Authoritative readback did not match the requested transition",
        });
        return { ok: false, hash, error: "Contract readback mismatch" };
      }
      onProgress({ stage: "READBACK_CONFIRMED", hash });
      return { ok: true, hash, caseRecord };
    } catch (error) {
      onProgress({
        stage: "EXECUTION_ERROR",
        hash,
        message: error instanceof Error ? error.message : "Unknown write error",
      });
      return {
        ok: false,
        hash,
        error: error instanceof Error ? error.message : "Unknown write error",
      };
    }
  }

  async createCase(
    input: CreateCaseInput,
    onProgress: ProgressSink,
  ): Promise<WriteResult> {
    assertCreateCaseInput(input);
    this.connected();
    const caseId = BigInt(Number(await this.read("case_count", [])));
    return this.write(
      "create_case",
      [
        input.assetHash,
        input.provider,
        input.evidenceHostname,
        input.policy,
        input.policyVersion,
        input.cycleId,
        input.cycleStart,
        input.cycleEnd,
      ],
      (record) =>
        record.id === Number(caseId) &&
        record.status === "DRAFT" &&
        record.owner.toLowerCase() === this.walletAddress?.toLowerCase(),
      caseId,
      onProgress,
    );
  }

  async cancelCase(caseId: bigint, onProgress: ProgressSink) {
    return this.write(
      "cancel_case",
      [caseId],
      (record) => record.status === "CANCELLED",
      caseId,
      onProgress,
    );
  }

  async submitEvidence(input: SubmitEvidenceInput, onProgress: ProgressSink) {
    const current = await this.getCase(input.caseId);
    assertEvidenceInput(input, current.evidence_hostname);
    return this.write(
      "submit_evidence",
      [input.caseId, input.url, input.version],
      (record) =>
        record.status === "SUBMITTED" &&
        record.latest_evidence_version === Number(input.version),
      input.caseId,
      onProgress,
    );
  }

  async evaluate(caseId: bigint, onProgress: ProgressSink) {
    return this.write(
      "evaluate",
      [caseId],
      (record) =>
        record.status === "COMPLIANT" ||
        record.status === "NON_COMPLIANT" ||
        record.status === "UNRESOLVED",
      caseId,
      onProgress,
    );
  }
}
