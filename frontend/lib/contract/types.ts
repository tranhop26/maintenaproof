export type Address = `0x${string}`;

export type CaseStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "COMPLIANT"
  | "NON_COMPLIANT"
  | "UNRESOLVED"
  | "CANCELLED";

export type TransactionStage =
  | "DISCONNECTED"
  | "READY"
  | "AWAITING_SIGNATURE"
  | "PENDING"
  | "FINALIZED"
  | "EXECUTION_SUCCESS"
  | "EXECUTION_ERROR"
  | "READBACK_CONFIRMED";

export interface TransactionProgress {
  stage: TransactionStage;
  hash?: Address;
  message?: string;
}

export type ProgressSink = (progress: TransactionProgress) => void;

export interface CaseRecord {
  asset_hash: string;
  attempt_count: number;
  certificate_fingerprint: string;
  cycle_end: string;
  cycle_id: string;
  cycle_start: string;
  evidence_count: number;
  evidence_hostname: string;
  id: number;
  latest_evidence_version: number;
  owner: Address;
  policy: string;
  policy_version: string;
  provider: Address;
  status: CaseStatus;
}

export interface EvidenceRecord {
  case_id: number;
  evaluated: boolean;
  replay_domain: string;
  revision_index: number;
  url: string;
  version: number;
}

export interface DecisionFindings {
  asset_hash: string;
  completed: string[];
  contradictions: string[];
  cycle_id: string;
  evidence_version: number;
  missing: string[];
  outcome: "COMPLIANT" | "NON_COMPLIANT" | "UNRESOLVED";
  policy_version: string;
  provider: Address;
  reason: string;
  report_issue_date: string;
  service_date: string;
}

export interface ResolutionAttempt {
  attempt_index: number;
  case_id: number;
  evaluator: Address;
  evidence_version: number;
  findings: DecisionFindings;
  fingerprint: string;
  outcome: DecisionFindings["outcome"];
}

export interface Certificate {
  asset_hash: string;
  case_id: number;
  contract_address: Address;
  cycle_end: string;
  cycle_id: string;
  cycle_start: string;
  evidence_version: number;
  findings: DecisionFindings;
  fingerprint: string;
  policy: string;
  policy_version: string;
  provider: Address;
}

export interface CreateCaseInput {
  assetHash: string;
  provider: Address;
  evidenceHostname: string;
  policy: string;
  policyVersion: string;
  cycleId: string;
  cycleStart: string;
  cycleEnd: string;
}

export interface SubmitEvidenceInput {
  caseId: bigint;
  url: string;
  version: bigint;
}

export interface ReadInput {
  address: Address;
  functionName: string;
  args: readonly unknown[];
}

export type WriteInput = ReadInput & { value?: bigint };
export interface WaitInput {
  hash: Address;
  status: "FINALIZED";
  retries?: number;
  interval?: number;
}
export interface GenLayerReceipt {
  status?: string | number;
  statusName?: string;
  txExecutionResultName?: string;
  consensus_data?: {
    leader_receipt?: Array<{ execution_result?: string }>;
  };
}

export interface GenLayerClientPort {
  readContract(input: ReadInput): Promise<unknown>;
  writeContract(input: WriteInput): Promise<Address>;
  waitForTransactionReceipt(input: WaitInput): Promise<GenLayerReceipt>;
}

export type WriteResult =
  | { ok: true; hash: Address; caseRecord: CaseRecord }
  | { ok: false; hash?: Address; error: string };
