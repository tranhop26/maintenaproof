import { describe, expect, it } from "vitest";

import {
  assertCreateCaseInput,
  assertEvidenceInput,
} from "@/lib/contract/validation";
import type { CreateCaseInput } from "@/lib/contract/types";

const valid = {
  assetHash: "a".repeat(64),
  provider: `0x${"1".repeat(40)}` as const,
  evidenceHostname: "httpbin.org",
  policy: "Replace the filter and verify outlet pressure is within range.",
  policyVersion: "hvac-v1",
  cycleId: "cycle-2026-q3",
  cycleStart: "2026-07-01",
  cycleEnd: "2026-09-30",
};

describe("contract validation mirror", () => {
  it("accepts a valid locked case", () => {
    expect(() => assertCreateCaseInput(valid)).not.toThrow();
  });

  it.each([
    ["asset hash", { assetHash: "ABC" }],
    ["provider", { provider: `0x${"0".repeat(40)}` }],
    ["hostname", { evidenceHostname: "sub/httpbin.org" }],
    ["policy", { policy: "short" }],
    ["cycle", { cycleStart: "2026-10-01" }],
    ["date", { cycleEnd: "2026-02-31" }],
  ])("rejects invalid %s", (_, mutation) => {
    expect(() =>
      assertCreateCaseInput({ ...valid, ...mutation } as CreateCaseInput),
    ).toThrow();
  });

  it("requires exact HTTPS evidence hostname and bounded version", () => {
    expect(() =>
      assertEvidenceInput(
        { caseId: 0n, url: "https://httpbin.org/report", version: 1n },
        "httpbin.org",
      ),
    ).not.toThrow();
    expect(() =>
      assertEvidenceInput(
        { caseId: 0n, url: "https://evil.example/report", version: 1n },
        "httpbin.org",
      ),
    ).toThrow(/hostname/i);
  });
});
