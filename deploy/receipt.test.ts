import assert from "node:assert/strict";
import test from "node:test";

import { successfulExecution } from "./receipt.ts";

test("fails closed when a finalized receipt has no execution result", () => {
  assert.equal(successfulExecution({}), false);
});

test("accepts normalized and raw Studionet execution success", () => {
  assert.equal(successfulExecution({ txExecutionResultName: "FINISHED_WITH_RETURN" }), true);
  assert.equal(
    successfulExecution({
      consensus_data: { leader_receipt: [{ execution_result: "SUCCESS" }] },
    }),
    true,
  );
});

test("rejects normalized and raw execution errors", () => {
  assert.equal(successfulExecution({ txExecutionResultName: "ERROR" }), false);
  assert.equal(
    successfulExecution({
      consensus_data: { leader_receipt: [{ execution_result: "ERROR" }] },
    }),
    false,
  );
});
