# MaintenaProof V2 Evidence Binding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mutable URL evidence with issuer-authenticated canonical service records whose exact bytes, digest, freshness, replay domain, validator verdict, and certificate are bound on-chain.

**Architecture:** The owner binds separate issuer and provider wallets when creating a case. The issuer submits bounded typed record fields in a signed transaction; the contract builds canonical JSON, derives the digest and deterministic submission time, and stores the exact record. Any wallet can request semantic evaluation, but deterministic normalization and certificate hashing bind every result to that record digest.

**Tech Stack:** Python GenLayer Intelligent Contract (`py-genlayer` pinned runner), `gltest`/pytest direct tests, TypeScript, Next.js 16, React 19, GenLayer JS SDK, Vitest/Testing Library, ESLint.

## Global Constraints

- Contract classification remains `INTENTIONALLY_FROZEN`; V1 stays preserved and V2 requires a new address.
- Record schema is exactly `maintenaproof.service-record.v2`.
- Issuer identity comes only from `gl.message.sender_address`; callers never submit an issuer field or digest.
- Canonical JSON uses `json.dumps(value, sort_keys=True, separators=(",", ":"))` and SHA-256 lowercase hexadecimal digests.
- Deterministic transaction time comes from `gl.message_raw["datetime"]` and is normalized to `YYYY-MM-DDTHH:MM:SSZ`.
- Evidence failure never defaults to `COMPLIANT` or `NON_COMPLIANT`; unsafe evidence becomes `UNRESOLVED`.
- No GitHub push, contract deployment, Vercel deployment, or production address switch occurs without action-time identity confirmation.
- Do not add secrets, private keys, build output, local task files, or local guardrail files to the public repository.

---

## File structure

- `contracts/maintenance_proof.py`: authoritative V2 data model, canonical record validation, evaluation, state transitions, and readbacks.
- `tests/direct/test_case_lifecycle.py`: V2 actor bindings, policy digest, initial/cancel transitions, and frozen-authority assertions.
- `tests/direct/test_evidence_submission.py`: canonical service record, time, bounds, issuer authorization, digest, and replay tests.
- `tests/direct/test_evaluation.py`: semantic result normalization, expiry, consensus failure, terminal states, and certificate hashing.
- `tests/direct/fixtures.py`: canonical V2 validator-result factories.
- `tests/integration/evidence_urls.py`: remove URL builder; replace with deterministic V2 service-record argument fixture.
- `tests/integration/test_maintenance_proof.py`: collectable Studionet V2 flow and negative cases.
- `frontend/lib/contract/types.ts`: V2 contract readback and write types.
- `frontend/lib/contract/validation.ts`: V2 client-side bounded input validation.
- `frontend/lib/contract/client.ts`: V2 SDK method mapping and authoritative transition checks.
- `frontend/components/create-case-form.tsx`: separate issuer/provider inputs and revised evidence copy.
- `frontend/components/evidence-form.tsx`: structured service-record submission form.
- `frontend/components/certificate-card.tsx`: issuer, provider, record digest, policy hash, and fingerprint display.
- `frontend/app/cases/[id]/page.tsx`: V2 case, record, attempt, and action rendering.
- `frontend/tests/**`: V2 validation, client, component, integration, and readback tests.
- `docs/DESIGN.md`, `docs/RECOVERY.md`, `docs/EVIDENCE.md`, `README.md`: V2 trust statement, migration limits, and proof requirements.

---

### Task 1: V2 case bindings and lifecycle

**Files:**
- Modify: `tests/direct/test_case_lifecycle.py`
- Modify: `contracts/maintenance_proof.py`

**Interfaces:**
- Produces: `create_case(asset_hash, issuer, provider, policy, policy_version, cycle_id, cycle_start, cycle_end) -> int`
- Produces: `get_case(case_id) -> canonical JSON` containing `issuer`, `provider`, `policy_hash`, `record_schema`, and `AWAITING_RECORD`.
- Consumes: `_canonical`, `_valid_identifier`, `_valid_iso_date`, `_require` already in the contract.

- [ ] **Step 1: Replace lifecycle fixtures and write failing V2 binding tests**

```python
def create_case(contract, issuer, provider):
    return contract.create_case(
        "a" * 64, to_hex(issuer), to_hex(provider), VALID_POLICY,
        "hvac-v1", "cycle-2026-q3", "2026-07-01", "2026-09-30",
    )

def test_owner_binds_issuer_provider_and_policy_digest(...):
    case_id = create_case(contract, direct_bob, direct_charlie)
    case = json.loads(contract.get_case(case_id))
    assert case["status"] == "AWAITING_RECORD"
    assert case["issuer"] == to_hex(direct_bob)
    assert case["provider"] == to_hex(direct_charlie)
    assert case["policy_hash"] == hashlib.sha256(VALID_POLICY.encode()).hexdigest()
    assert case["record_schema"] == "maintenaproof.service-record.v2"
```

- [ ] **Step 2: Run lifecycle tests and verify RED**

Run: `pytest tests/direct/test_case_lifecycle.py -q`

Expected: failures because `create_case` still accepts a hostname, has no issuer/policy hash/schema, and returns `DRAFT`.

- [ ] **Step 3: Implement the minimal V2 case schema and lifecycle**

Update `MaintenanceCase`, validate nonzero issuer and provider, compute `policy_hash` from the exact stored policy string, remove hostname validation/storage, and use `AWAITING_RECORD`. Update `cancel_case` to require `AWAITING_RECORD`.

- [ ] **Step 4: Run lifecycle tests and verify GREEN**

Run: `pytest tests/direct/test_case_lifecycle.py -q`

Expected: all lifecycle tests pass.

- [ ] **Step 5: Commit the independently testable case-model change**

```powershell
git add contracts/maintenance_proof.py tests/direct/test_case_lifecycle.py
git commit -m "feat: bind v2 issuer and policy identity"
```

---

### Task 2: Canonical issuer-authenticated service records

**Files:**
- Modify: `tests/direct/test_evidence_submission.py`
- Modify: `contracts/maintenance_proof.py`

**Interfaces:**
- Consumes: V2 `MaintenanceCase` from Task 1.
- Produces: `submit_service_record(case_id, version, service_date, issued_at, expires_at, nonce, completed_json, measurements_json, attachments_json, notes) -> str`.
- Produces: `get_evidence(case_id, revision_index) -> canonical JSON` with exact stored record, digest, issuer, timestamps, nonce, replay domain, and evaluated flag.

- [ ] **Step 1: Write failing canonical record and issuer tests**

Add a helper with fixed values and tests asserting:

```python
digest = contract.submit_service_record(
    0, 1, "2026-08-15", "2026-08-16T10:00:00Z",
    "2026-09-30T23:59:59Z", "record-001",
    json.dumps(["replace intake filter", "verify outlet pressure 80-120 psi"]),
    json.dumps([{"name": "outlet pressure", "value": "100", "unit": "psi"}]),
    json.dumps([{"uri": "ipfs://bafy-record", "sha256": "b" * 64}]),
    "Technician service record",
)
evidence = json.loads(contract.get_evidence(0, 0))
assert evidence["issuer"] == to_hex(direct_bob)
assert digest == hashlib.sha256(evidence["record_json"].encode()).hexdigest()
assert evidence["record_digest"] == digest
assert evidence["submitted_at"].endswith("Z")
```

Also add separate tests for unauthorized sender, old version, duplicate replay domain, invalid timestamps, expired-at-submission, future-issued record, out-of-cycle service date, malformed arrays, duplicate completed items, invalid measurement schema, invalid attachment digest, oversized strings, and canonical record size.

- [ ] **Step 2: Run evidence tests and verify RED**

Run: `pytest tests/direct/test_evidence_submission.py -q`

Expected: failures because `submit_service_record` and V2 evidence fields do not exist.

- [ ] **Step 3: Implement bounded parsers, deterministic time, canonicalization, digest, and replay binding**

Add focused helpers:

```python
def _parse_utc_timestamp(value: str) -> datetime: ...
def _transaction_timestamp() -> tuple[datetime, str]: ...
def _parse_completed(value: str) -> list[str]: ...
def _parse_measurements(value: str) -> list[dict]: ...
def _parse_attachments(value: str) -> list[dict]: ...
def _record_replay_domain(case_id: int, issuer: str, version: int,
                          digest: str, nonce: str) -> str: ...
```

Construct the record only from contract context, case state, and validated typed inputs. Store the exact canonical JSON before returning the digest. Never accept caller-supplied issuer, schema, binding fields, or digest.

- [ ] **Step 4: Run evidence tests and verify GREEN**

Run: `pytest tests/direct/test_evidence_submission.py -q`

Expected: all service-record tests pass.

- [ ] **Step 5: Run lifecycle plus evidence regression suite**

Run: `pytest tests/direct/test_case_lifecycle.py tests/direct/test_evidence_submission.py -q`

Expected: both files pass with no state-model regression.

- [ ] **Step 6: Commit canonical record support**

```powershell
git add contracts/maintenance_proof.py tests/direct/test_evidence_submission.py
git commit -m "feat: commit issuer-authenticated service records"
```

---

### Task 3: Digest-bound semantic evaluation and certificates

**Files:**
- Modify: `tests/direct/fixtures.py`
- Modify: `tests/direct/test_evaluation.py`
- Modify: `contracts/maintenance_proof.py`

**Interfaces:**
- Consumes: exact canonical `EvidenceRecord` from Task 2.
- Produces: `evaluate(case_id) -> canonical DecisionFindings JSON`.
- Produces: `get_attempt(case_id, attempt_index)` and `get_certificate(case_id)` containing issuer, provider, record digest/schema/version, policy hash, timestamps, and recomputable fingerprint.

- [ ] **Step 1: Replace validator fixtures with V2 decision factories**

```python
def compliant_result(case, evidence):
    return {
        "outcome": "COMPLIANT",
        "case_id": case["id"],
        "issuer": case["issuer"],
        "provider": case["provider"],
        "asset_hash": case["asset_hash"],
        "record_digest": evidence["record_digest"],
        "record_schema": case["record_schema"],
        "record_version": evidence["version"],
        "policy_hash": case["policy_hash"],
        "policy_version": case["policy_version"],
        "cycle_id": case["cycle_id"],
        "service_date": evidence["service_date"],
        "issued_at": evidence["issued_at"],
        "expires_at": evidence["expires_at"],
        "completed": ["replace intake filter", "verify outlet pressure 80-120 psi"],
        "missing": [], "contradictions": [], "reason": "All obligations proven",
    }
```

- [ ] **Step 2: Write failing evaluation and fingerprint tests**

Cover every identity/digest mutation, malformed result, insufficient evidence, affirmative non-compliance, contradiction-only result, expired-before-evaluation, consensus failure with no write, unrelated evaluator, retry after `UNRESOLVED`, terminal double evaluation, and independent fingerprint recomputation from certificate fields.

- [ ] **Step 3: Run evaluation tests and verify RED**

Run: `pytest tests/direct/test_evaluation.py -q`

Expected: V1 result schema and fingerprint fail V2 assertions.

- [ ] **Step 4: Implement deterministic normalization and digest-bound fingerprint**

Copy all storage values to locals before `judge_record`. Do not call web access. Prompt over the stored `record_json`. Short-circuit an expired record to a recorded `UNRESOLVED` decision before model evaluation. Make the equivalence principle compare all decision-bearing identity, digest, timestamp, and obligation fields.

- [ ] **Step 5: Run evaluation tests and full direct suite**

Run: `pytest tests/direct/test_evaluation.py -q`

Run: `pytest tests/direct -q`

Expected: all direct tests pass.

- [ ] **Step 6: Commit evaluation and certificate binding**

```powershell
git add contracts/maintenance_proof.py tests/direct/fixtures.py tests/direct/test_evaluation.py
git commit -m "feat: bind verdicts to immutable record digests"
```

---

### Task 4: V2 TypeScript contract adapter

**Files:**
- Modify: `frontend/tests/unit/validation.test.ts`
- Modify: `frontend/tests/unit/contract-client.test.ts`
- Modify: `frontend/lib/contract/types.ts`
- Modify: `frontend/lib/contract/validation.ts`
- Modify: `frontend/lib/contract/client.ts`

**Interfaces:**
- Produces: `CreateCaseInput` with `issuer` and `provider`.
- Produces: `SubmitServiceRecordInput` matching the contract's typed record arguments.
- Produces: `MaintenaProofClient.submitServiceRecord(input, onProgress)`.
- Consumes: existing `write` lifecycle and receipt/readback verification.

- [ ] **Step 1: Write failing V2 validation tests**

Test valid and invalid issuer/provider addresses, completed-action bounds/duplicates, measurement schema, attachment digest, nonce/notes sizes, timestamp format/order, and record version bounds through `assertServiceRecordInput(input)`.

- [ ] **Step 2: Run validation tests and verify RED**

Run: `pnpm --dir frontend test -- tests/unit/validation.test.ts`

Expected: missing V2 types/validator or old hostname behavior.

- [ ] **Step 3: Implement V2 types and validation**

Define exact readback types from the specification and replace `SubmitEvidenceInput` with:

```typescript
export interface SubmitServiceRecordInput {
  caseId: bigint;
  version: bigint;
  serviceDate: string;
  issuedAt: string;
  expiresAt: string;
  nonce: string;
  completedActions: string[];
  measurements: Array<{ name: string; value: string; unit: string }>;
  attachments: Array<{ uri: string; sha256: string }>;
  notes: string;
}
```

- [ ] **Step 4: Write failing client mapping/readback tests**

Assert `create_case` argument order, `submit_service_record` JSON serialization, `AWAITING_RECORD` readback, issuer wallet transition, transaction execution error handling, and readback mismatch handling.

- [ ] **Step 5: Run client tests and verify RED**

Run: `pnpm --dir frontend test -- tests/unit/contract-client.test.ts`

Expected: old method names and arguments fail.

- [ ] **Step 6: Implement client mapping and verify GREEN**

Run: `pnpm --dir frontend test -- tests/unit/validation.test.ts tests/unit/contract-client.test.ts`

Expected: both unit files pass.

- [ ] **Step 7: Commit the adapter change**

```powershell
git add frontend/lib/contract frontend/tests/unit
git commit -m "feat: map frontend adapter to v2 records"
```

---

### Task 5: Structured issuer workflow and certificate UX

**Files:**
- Modify: `frontend/tests/components/create-case-form.test.tsx`
- Modify: `frontend/tests/components/case-actions.test.tsx`
- Modify: `frontend/tests/components/certificate-card.test.tsx`
- Create: `frontend/tests/components/service-record-form.test.tsx`
- Modify: `frontend/components/create-case-form.tsx`
- Replace: `frontend/components/evidence-form.tsx` with `frontend/components/service-record-form.tsx`
- Modify: `frontend/components/certificate-card.tsx`
- Modify: `frontend/app/cases/[id]/page.tsx`
- Modify: `frontend/app/globals.css`

**Interfaces:**
- Consumes: V2 types/client from Task 4.
- Produces: `<ServiceRecordForm caseId nextVersion onDone />`.
- Produces: case and certificate pages that render authoritative issuer and digest readback.

- [ ] **Step 1: Write failing component tests for V2 copy, fields, authorization, and certificate data**

Assert the create form has issuer and provider labels and no hostname input; the service form submits structured values; only the issuer sees it in `AWAITING_RECORD`/`UNRESOLVED`; certificate text includes issuer wallet, record digest, policy hash, and fingerprint; no UI claims independent physical verification.

- [ ] **Step 2: Run component tests and verify RED**

Run: `pnpm --dir frontend test -- tests/components`

Expected: old URL workflow and certificate fields fail.

- [ ] **Step 3: Implement minimal V2 forms and readback rendering**

Use one row per completed action/measurement/attachment with bounded add/remove controls. The form serializes via the adapter; it does not compute or accept an authoritative digest. Preserve transaction timeline stages and show digest only after confirmed readback.

- [ ] **Step 4: Run component tests and verify GREEN**

Run: `pnpm --dir frontend test -- tests/components`

Expected: component suite passes.

- [ ] **Step 5: Run frontend unit, lint, and typecheck checkpoint**

Run: `pnpm --dir frontend test`

Run: `pnpm --dir frontend lint`

Run: `pnpm --dir frontend typecheck`

Expected: all pass before integration work.

- [ ] **Step 6: Commit the V2 frontend workflow**

```powershell
git add frontend
git commit -m "feat: add issuer service record workflow"
```

---

### Task 6: Integration fixtures, deployment safety, and documentation

**Files:**
- Modify: `tests/integration/evidence_urls.py`
- Modify: `tests/integration/test_maintenance_proof.py`
- Modify: `frontend/tests/integration/live-contract-flow.test.ts`
- Modify: `frontend/tests/e2e/readback.spec.ts`
- Modify: `deploy/deployScript.ts` only if the new public interface changes validation assumptions.
- Modify: `README.md`
- Modify: `docs/DESIGN.md`
- Modify: `docs/RECOVERY.md`
- Modify: `docs/EVIDENCE.md`
- Modify: `.github/workflows/ci.yml` only if commands or file names change.

**Interfaces:**
- Consumes: complete V2 contract and frontend.
- Produces: collectable V2 live tests without committed private keys.
- Produces: explicit legacy V1 and pending V2 deployment documentation.

- [ ] **Step 1: Replace URL fixtures with canonical V2 record arguments and update collectable live tests**

The test fixture returns service date, timestamps, nonce, completed actions,
measurements, attachments, and notes. Tests read the on-chain digest after
submission and never predeclare the authoritative digest.

- [ ] **Step 2: Run integration collection and verify failures are only the expected pre-update references**

Run: `pytest --collect-only tests/integration -q`

Run: `pnpm --dir frontend test -- tests/integration`

Expected before implementation: old URL/type references fail or live tests skip for missing environment; after update, collection succeeds and environment-gated tests skip cleanly when keys/address are absent.

- [ ] **Step 3: Update documentation and migration claims**

Document the trust matrix, exact decision/consequence, issuer-wallet limitation, canonical record/digest, deterministic freshness, replay domain, frozen V1 status, new-address requirement, and proof matrix slots. Do not insert a placeholder V2 address into source or `.env`; keep V1 address explicitly labeled legacy until deployment is authorized and verified.

- [ ] **Step 4: Run repository hygiene checks**

Run: `git status --short`

Run: `git diff --check`

Run a tracked/untracked secret-pattern scan that reports filenames and line numbers but never prints environment variable values.

- [ ] **Step 5: Commit integration and documentation readiness**

```powershell
git add tests/integration frontend/tests/integration frontend/tests/e2e deploy README.md docs .github/workflows/ci.yml
git commit -m "docs: prepare v2 verification and migration evidence"
```

---

### Task 7: Full verification and independent review

**Files:**
- Verify all modified files; change only files required to fix observed failures.

**Interfaces:**
- Consumes: Tasks 1-6.
- Produces: a deployment-review-ready local commit range, not a deployment.

- [ ] **Step 1: Run contract lint and validation**

Run: `genvm-lint check contracts/maintenance_proof.py`

Run the repository's GenLayer contract validation command if distinct from lint.

- [ ] **Step 2: Run Python suites**

Run: `pytest tests/direct -v`

Run: `pytest --collect-only tests/integration -q`

- [ ] **Step 3: Run deployment TypeScript checks**

Run: `pnpm typecheck:deploy`

Run: `node --test deploy/receipt.test.ts`

- [ ] **Step 4: Run complete frontend verification**

Run: `pnpm --dir frontend test`

Run: `pnpm --dir frontend lint`

Run: `pnpm --dir frontend typecheck`

Run: `pnpm --dir frontend build`

- [ ] **Step 5: Recompute test vectors independently**

Use a short read-only verification script or test to recompute `record_digest`, replay domain, policy hash, and certificate fingerprint from canonical readback fixtures. It must fail when any issuer, record byte, case, policy, version, or outcome field changes.

- [ ] **Step 6: Review the full diff against the approved specification**

Compare `git diff 570d49c..HEAD` with every acceptance criterion in the spec. Fix all critical/important findings with a new failing regression test first, then rerun the relevant and full verification commands.

- [ ] **Step 7: Stop at the external-action gate**

Report exact local commit, source hash, tests/build/lint results, known limitations, and the proposed new Studionet deployment action. Ask for the exact deployment wallet and confirmation before deploying. After deployment, separately confirm GitHub account/remote before push and Vercel project/team before production deployment.
