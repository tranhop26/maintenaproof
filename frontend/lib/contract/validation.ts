import type {
  CreateCaseInput,
  SubmitEvidenceInput,
} from "@/lib/contract/types";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const ZERO = /^0x0{40}$/i;
const IDENTIFIER = /^[\x20-\x7e]{1,64}$/;
const HOSTNAME = /^(?=.{3,253}$)(?=.+\..+)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

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
  if (!ADDRESS.test(input.provider) || ZERO.test(input.provider)) {
    throw new Error("Provider must be a non-zero address");
  }
  if (!HOSTNAME.test(input.evidenceHostname)) {
    throw new Error("Evidence hostname is invalid");
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

export function assertEvidenceInput(
  input: SubmitEvidenceInput,
  lockedHostname: string,
): void {
  if (input.version < 1n || input.version >= 2n ** 32n) {
    throw new Error("Evidence version is outside the contract bounds");
  }
  if (input.url.length > 1_000) throw new Error("Evidence URL is too long");
  let parsed: URL;
  try {
    parsed = new URL(input.url);
  } catch {
    throw new Error("Evidence URL is invalid");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== lockedHostname ||
    parsed.host !== lockedHostname ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error("Evidence URL must use the exact locked HTTPS hostname");
  }
}
