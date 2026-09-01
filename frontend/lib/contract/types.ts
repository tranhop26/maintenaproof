export type Address = `0x${string}`;

export type CaseStatus =
  | "AWAITING_RECORD"
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
  id: number;
  issuer: Address;
  latest_evidence_version: number;
  owner: Address;
  policy: string;
  policy_hash: string;
  policy_version: string;
  provider: Address;
  record_schema: string;
  status: CaseStatus;
}

export interface EvidenceRecord {
  case_id: number;
  evaluated: boolean;
  expires_at: string;
  issued_at: string;
  issuer: Address;
  nonce: string;
  record_digest: string;
  record_json: string;
  replay_domain: string;
  revision_index: number;
  service_date: string;
  submitted_at: string;
  version: number;
}

export interface DecisionFindings {
  asset_hash: string;
  case_id: number;
  completed: string[];
  contradictions: string[];
  cycle_id: string;
  expires_at: string;
  issued_at: string;
  issuer: Address;
  missing: string[];
  outcome: "COMPLIANT" | "NON_COMPLIANT" | "UNRESOLVED";
  policy_hash: string;
  policy_version: string;
  provider: Address;
  reason: string;
  record_digest: string;
  record_schema: string;
  record_version: number;
  service_date: string;
}

export interface ResolutionAttempt {
  attempt_index: number;
  case_id: number;
  evaluator: Address;
  evidence_version: number;
  expires_at: string;
  findings: DecisionFindings;
  fingerprint: string;
  issued_at: string;
  issuer: Address;
  outcome: DecisionFindings["outcome"];
  policy_hash: string;
  policy_version: string;
  provider: Address;
  record_digest: string;
  record_schema: string;
  record_version: number;
  service_date: string;
}

export interface Certificate {
  asset_hash: string;
  case_id: number;
  chain_id: number;
  completed: string[];
  contract_address: Address;
  contradictions: string[];
  cycle_end: string;
  cycle_id: string;
  cycle_start: string;
  evidence_version: number;
  expires_at: string;
  findings: DecisionFindings;
  fingerprint: string;
  issued_at: string;
  issuer: Address;
  missing: string[];
  outcome: "COMPLIANT";
  policy: string;
  policy_hash: string;
  policy_version: string;
  provider: Address;
  record_digest: string;
  record_schema: string;
  record_version: number;
  service_date: string;
}

export interface CreateCaseInput {
  assetHash: string;
  issuer: Address;
  provider: Address;
  policy: string;
  policyVersion: string;
  cycleId: string;
  cycleStart: string;
  cycleEnd: string;
}

export interface ServiceMeasurement {
  name: string;
  value: string;
  unit: string;
}

export interface ServiceAttachment {
  uri: string;
  sha256: string;
}

export interface SubmitServiceRecordInput {
  caseId: bigint;
  version: bigint;
  serviceDate: string;
  issuedAt: string;
  expiresAt: string;
  nonce: string;
  completedActions: string[];
  measurements: ServiceMeasurement[];
  attachments: ServiceAttachment[];
  notes: string;
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
