import type {
  CreateCaseInput,
  SubmitServiceRecordInput,
} from "@/lib/contract/types";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const ZERO = /^0x0{40}$/i;
const IDENTIFIER = /^[\x20-\x7e]{1,64}$/;
const PRINTABLE = /^[\x20-\x7e]*$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function assertCreateCaseInput(input: CreateCaseInput): void {
  if (!/^[0-9a-f]{64}$/.test(input.assetHash)) {
    throw new Error("Asset hash must be 64 lowercase hex characters");
  }
  if (!ADDRESS.test(input.issuer) || ZERO.test(input.issuer)) {
    throw new Error("Issuer must be a non-zero address");
  }
  if (!ADDRESS.test(input.provider) || ZERO.test(input.provider)) {
    throw new Error("Provider must be a non-zero address");
  }
  if (input.policy.length < 20 || input.policy.length > 2_000) {
    throw new Error("Policy must contain 20 to 2,000 characters");
  }
  if (!IDENTIFIER.test(input.policyVersion) || !IDENTIFIER.test(input.cycleId)) {
    throw new Error("Policy version and cycle ID are invalid");
  }
  if (!validDate(input.cycleStart) || !validDate(input.cycleEnd)) {
    throw new Error("Cycle date is invalid");
  }
  if (input.cycleStart > input.cycleEnd) {
    throw new Error("Cycle start must not follow cycle end");
  }
}

function boundedPrintable(value: string, minimum: number, maximum: number): boolean {
  return value.length >= minimum && value.length <= maximum && PRINTABLE.test(value);
}

function validTimestamp(value: string): boolean {
  if (!TIMESTAMP.test(value)) return false;
  return new Date(value).toISOString().replace(".000Z", "Z") === value;
}

export function assertServiceRecordInput(input: SubmitServiceRecordInput): void {
  if (input.version < 1n || input.version >= 2n ** 32n) {
    throw new Error("Evidence version is outside the contract bounds");
  }
  if (!validDate(input.serviceDate)) throw new Error("Service date is invalid");
  if (!validTimestamp(input.issuedAt)) throw new Error("Issued timestamp is invalid");
  if (!validTimestamp(input.expiresAt)) throw new Error("Expiry timestamp is invalid");
  if (input.serviceDate > input.issuedAt.slice(0, 10)) {
    throw new Error("Issue date cannot precede service date");
  }
  if (input.expiresAt < input.issuedAt) throw new Error("Expiry cannot precede issue");
  if (!boundedPrintable(input.nonce, 1, 128)) throw new Error("Nonce is invalid");
  if (!boundedPrintable(input.notes, 0, 2_000)) throw new Error("Notes are invalid");
  if (input.completedActions.length < 1 || input.completedActions.length > 32) {
    throw new Error("Completed actions are outside bounds");
  }
  if (!input.completedActions.every(value => boundedPrintable(value, 1, 256))) {
    throw new Error("Completed action is invalid");
  }
  if (new Set(input.completedActions).size !== input.completedActions.length) {
    throw new Error("Completed actions contain duplicates");
  }
  if (input.measurements.length > 32 || !input.measurements.every(item =>
    boundedPrintable(item.name, 1, 64) &&
    boundedPrintable(item.unit, 1, 64) &&
    boundedPrintable(item.value, 1, 128)
  )) throw new Error("Measurement is invalid");
  if (input.attachments.length > 16 || !input.attachments.every(item =>
    boundedPrintable(item.uri, 1, 512) && /^[0-9a-f]{64}$/.test(item.sha256)
  )) throw new Error("Attachment is invalid");
}
