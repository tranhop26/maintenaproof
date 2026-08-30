# MaintenaProof MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, verify, and prepare for deployment a complete GenLayer MVP that issues immutable on-chain equipment-maintenance compliance certificates from validator-judged public evidence.

**Architecture:** A single intentionally frozen GenLayer Intelligent Contract owns actor authorization, evidence revisions, semantic evaluation, state transitions, outcomes, and certificate readback. A responsive Next.js application uses a typed GenLayerJS adapter and wallet provider; it never computes an outcome or advances durable state ahead of the contract. Python direct/integration tests and TypeScript adapter/UI tests cover deterministic and nondeterministic branches, followed by action-time identity checks, authorized deployments, and live browser evidence.

**Tech Stack:** Python 3.12+, `genlayer-py` v0.18, `genlayer-test` v0.29, `genvm-linter`, GenVM runner `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`, Next.js 16, React 19, TypeScript 5.9, `genlayer-js` 1.1.x, TanStack Query 5, Vitest, Testing Library, Playwright, pnpm.

## Global Constraints

- The contract is `INTENTIONALLY_FROZEN`: no proxy, privileged upgrade, owner outcome override, or storage rewrite.
- The Intelligent Contract is the only source of truth for actors, evidence revisions, workflow state, outcomes, and certificates.
- No stake, escrow, payment, backend adjudicator, notification service, or off-chain account database.
- `asset_hash` is exactly 64 lowercase hexadecimal characters.
- `provider` is a non-zero GenLayer address.
- `evidence_hostname` is a lowercase ASCII DNS hostname of 3-253 characters with no scheme, port, path, query, wildcard, user information, or IP literal.
- `evidence_url` is HTTPS, at most 1,000 characters, and its hostname exactly equals the locked hostname.
- `policy` is 20-2,000 UTF-8 characters; `policy_version` and `cycle_id` are 1-64 restricted printable characters.
- `cycle_start` and `cycle_end` are zero-padded ISO `YYYY-MM-DD`, with start not after end.
- `evidence_version` is 1 through `2^32-1` and strictly increases per case.
- Evidence is public. Missing, unreachable, malformed, stale, mismatched, contradictory, or insufficient evidence never becomes approval.
- A protocol consensus failure writes no state; an agreed insufficiency writes `UNRESOLVED`.
- Frontend writes distinguish disconnected, awaiting signature, pending, `FINALIZED`, execution `SUCCESS`/`ERROR`, and authoritative readback.
- No sentinel contract address is committed to production source or `.env`; `.env.example` contains names and empty values only.
- Do not push GitHub, deploy a contract, or deploy Vercel until the exact active identities and proposed external action are shown to and confirmed by the user at action time.

## File Structure

```text
.env.example                              Non-secret environment contract
.github/workflows/ci.yml                  Lint, direct tests, frontend tests/build
contracts/maintenance_proof.py            Intelligent Contract and consensus boundary
deploy/deployScript.ts                    Contract deployment and manifest emission
deployments/.gitkeep                      Keeps manifest directory in source
docs/RECOVERY.md                          Frozen-contract recovery/cutover runbook
docs/EVIDENCE.md                          Fixed proof matrix populated after live verification
docs/superpowers/specs/...                Approved design
docs/superpowers/plans/...                This execution plan
frontend/app/layout.tsx                   App shell and providers
frontend/app/page.tsx                     Contract-backed case dashboard
frontend/app/cases/new/page.tsx           Create-case flow
frontend/app/cases/[id]/page.tsx          Case, evidence, evaluation, certificate readback
frontend/components/...                   Focused wallet, form, status, and certificate UI
frontend/lib/contract/client.ts            Typed GenLayerJS boundary
frontend/lib/contract/types.ts             Canonical domain and transaction-stage types
frontend/lib/contract/validation.ts        Client-side mirror validation only
frontend/lib/genlayer/config.ts            Network/address configuration
frontend/lib/genlayer/wallet.tsx           Wallet context and chain switching
frontend/lib/hooks/use-cases.ts            Reads, writes, and reconciliation
frontend/tests/...                         Adapter, component, and post-deploy integration tests
gltest.config.yaml                         Studio test configuration
package.json                               Root deploy/build commands
pyproject.toml                             Pytest markers/configuration
requirements.txt                           Pinned Python test/lint dependencies
tests/direct/...                           In-memory contract tests
tests/integration/...                      Studio contract tests
```

---

### Task 1: Contract Tooling and Immutable Case Creation

**Files:**
- Create: `requirements.txt`
- Create: `pyproject.toml`
- Create: `gltest.config.yaml`
- Create: `tests/__init__.py`
- Create: `tests/direct/__init__.py`
- Create: `tests/direct/conftest.py`
- Create: `tests/direct/test_case_lifecycle.py`
- Create: `contracts/maintenance_proof.py`

**Interfaces:**
- Consumes: Approved validation constraints from the design spec.
- Produces: `MaintenanceProof.create_case(...) -> int`, `cancel_case(case_id)`, `case_count() -> int`, and `get_case(case_id) -> str` returning canonical JSON.

- [ ] **Step 1: Add the Python toolchain and failing creation tests**

Use the official boilerplate dependency pins in `requirements.txt`:

```text
genlayer-py @ git+https://github.com/genlayerlabs/genlayer-py@v0.18
genlayer-test @ git+https://github.com/genlayerlabs/genlayer-testing-suite@v0.29
genvm-linter @ git+https://github.com/genlayerlabs/genvm-linter@main
pytest>=8.3,<9
python-dotenv>=1.0.1
```

Configure `pyproject.toml` with `testpaths = ["tests/direct"]` and an `integration` marker. In `test_case_lifecycle.py`, first add these exact behaviors:

```python
def test_owner_creates_locked_draft(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    case_id = contract.create_case(
        "a" * 64, to_hex(direct_bob), "httpbin.org",
        "Replace the intake filter and verify outlet pressure is 80-120 psi.",
        "hvac-v1", "cycle-2026-q3", "2026-07-01", "2026-09-30",
    )
    case = json.loads(contract.get_case(case_id))
    assert case["status"] == "DRAFT"
    assert case["owner"] == to_hex(direct_alice)
    assert case["provider"] == to_hex(direct_bob)
    assert case["policy_version"] == "hvac-v1"

def test_zero_provider_and_invalid_cycle_revert(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("provider required"):
        contract.create_case("a" * 64, "0x" + "0" * 40, "httpbin.org", "x" * 20, "v1", "c1", "2026-07-01", "2026-09-30")
    with direct_vm.expect_revert("invalid cycle"):
        contract.create_case("a" * 64, to_hex(direct_alice), "httpbin.org", "x" * 20, "v1", "c1", "2026-10-01", "2026-09-30")
```

Add parameterized cases for asset hash length/charset, hostname syntax, policy length, restricted identifiers, impossible dates, and case-not-found readback.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `pytest tests/direct/test_case_lifecycle.py -v`

Expected: collection or deploy failure because `contracts/maintenance_proof.py` does not exist.

- [ ] **Step 3: Implement the minimal immutable case model**

Start the contract with the pinned runner and focused storage types:

```python
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
from dataclasses import dataclass
import hashlib
import json
import re

@allow_storage
@dataclass
class MaintenanceCase:
    id: u256
    owner: Address
    provider: Address
    asset_hash: str
    evidence_hostname: str
    policy: str
    policy_version: str
    cycle_id: str
    cycle_start: str
    cycle_end: str
    status: str
    latest_evidence_version: u256
    evidence_count: u256
    attempt_count: u256
    certificate_fingerprint: str

class MaintenanceProof(gl.Contract):
    next_case_id: u256
    cases: TreeMap[u256, MaintenanceCase]

    def __init__(self):
        self.next_case_id = u256(0)
```

Implement small deterministic helpers `_require`, `_canonical`, `_valid_iso_date`, `_valid_hostname`, `_valid_identifier`, and `_get_case`. `create_case` validates every global constraint, stores `gl.message.sender_address` as owner, initializes `DRAFT`, and increments `next_case_id`. Do not add an admin field.

- [ ] **Step 4: Add cancellation tests and implementation**

Test owner cancellation, non-owner rejection, cancellation after submission rejection (initially simulate status only through the later public method once Task 2 lands), and second cancellation rejection. Implement `cancel_case` so only the owner can move `DRAFT -> CANCELLED`; expose no reverse transition.

- [ ] **Step 5: Verify and commit the foundation**

Run:

```powershell
genvm-lint check contracts/maintenance_proof.py
pytest tests/direct/test_case_lifecycle.py -v
```

Expected: contract lint exits 0 and all lifecycle tests pass.

Commit: `feat: add immutable maintenance cases`

---

### Task 2: Provider Evidence Revisions and Replay Protection

**Files:**
- Modify: `contracts/maintenance_proof.py`
- Create: `tests/direct/test_evidence_submission.py`
- Modify: `tests/direct/test_case_lifecycle.py`

**Interfaces:**
- Consumes: `MaintenanceCase`, `_get_case`, validation helpers, and canonical JSON reads from Task 1.
- Produces: `submit_evidence(case_id: int, evidence_url: str, evidence_version: int)`, `get_evidence(case_id, revision_index) -> str`, and replay-domain hashes.

- [ ] **Step 1: Write failing provider and URL tests**

Create a `create_draft(...)` fixture and test:

```python
def test_locked_provider_submits_first_revision(direct_vm, contract, direct_bob):
    direct_vm.sender = direct_bob
    contract.submit_evidence(0, VALID_HTTPBIN_REPORT_URL, 1)
    case = json.loads(contract.get_case(0))
    evidence = json.loads(contract.get_evidence(0, 0))
    assert case["status"] == "SUBMITTED"
    assert case["latest_evidence_version"] == 1
    assert evidence["version"] == 1
    assert evidence["evaluated"] is False
    assert len(evidence["replay_domain"]) == 64
```

Add failing tests for owner/third-party submission, `http://`, hostname mismatch, port/userinfo/IP/wildcard tricks, URL over 1,000 characters, version zero, same/lower version after `UNRESOLVED`, duplicate replay domain, and submission from terminal states.

- [ ] **Step 2: Run the submission tests and verify RED**

Run: `pytest tests/direct/test_evidence_submission.py -v`

Expected: `AttributeError` because `submit_evidence` and `get_evidence` are absent.

- [ ] **Step 3: Implement append-only evidence storage**

Add:

```python
@allow_storage
@dataclass
class EvidenceRecord:
    case_id: u256
    revision_index: u256
    version: u256
    url: str
    replay_domain: str
    evaluated: bool

evidence: TreeMap[str, EvidenceRecord]
used_replay_domains: TreeMap[str, bool]
```

Use `_evidence_key(case_id, revision_index) -> str`. Parse the URL without following redirects: require the literal prefix `https://`, derive the authority before `/`, `?`, or `#`, and require it to equal `evidence_hostname`. Compute:

```python
domain = hashlib.sha256(
    f"{gl.message.chain_id}|{gl.message.contract_address.as_hex}|{case_id}|{evidence_version}|{evidence_url}".encode()
).hexdigest()
```

Allow initial submission only from `DRAFT`; allow a newer revision only from `UNRESOLVED`. Store the record before setting `SUBMITTED`, and never overwrite an earlier revision.

- [ ] **Step 4: Add readback and transition regression tests**

Assert evidence index bounds, append order after `UNRESOLVED`, and that rejected calls preserve the previous status/count/version. Update the Task 1 cancellation-after-submission test to use `submit_evidence` instead of internal state manipulation.

- [ ] **Step 5: Verify and commit evidence handling**

Run:

```powershell
genvm-lint check contracts/maintenance_proof.py
pytest tests/direct/test_case_lifecycle.py tests/direct/test_evidence_submission.py -v
```

Expected: all tests pass.

Commit: `feat: bind provider evidence revisions`

---

### Task 3: GenLayer Semantic Evaluation and Safe Outcomes

**Files:**
- Modify: `contracts/maintenance_proof.py`
- Create: `tests/direct/test_evaluation.py`
- Create: `tests/direct/fixtures.py`

**Interfaces:**
- Consumes: current `SUBMITTED` case and latest `EvidenceRecord`.
- Produces: permissionless `evaluate(case_id) -> str`, `get_attempt(case_id, attempt_index) -> str`, and `get_certificate(case_id) -> str`.

- [ ] **Step 1: Define canonical mocked reports and failing outcome tests**

In `tests/direct/fixtures.py`, provide canonical JSON strings for:

```python
def compliant_result(provider_hex: str) -> dict:
    return {
    "outcome": "COMPLIANT",
    "asset_hash": "a" * 64,
    "cycle_id": "cycle-2026-q3",
    "provider": provider_hex,
    "evidence_version": 1,
    "service_date": "2026-08-15",
    "completed": ["replace intake filter", "verify outlet pressure 80-120 psi"],
    "missing": [],
    "contradictions": [],
    "reason": "Both locked obligations are evidenced within the cycle.",
    }
```

Add analogous `NON_COMPLIANT_RESULT` with a concrete missing obligation and `UNRESOLVED_RESULT` with an empty decision-bearing field plus a reason category. Tests must show an unrelated `direct_charlie` can evaluate and that owner/provider identity does not select the outcome.

- [ ] **Step 2: Run outcome tests and verify RED**

Run: `pytest tests/direct/test_evaluation.py -v`

Expected: failure because `evaluate`, attempts, and certificates are absent.

- [ ] **Step 3: Implement independent fetch, prompt, and equivalence principle**

Inside `evaluate`, copy immutable case/evidence fields to locals before entering nondeterminism. The nondeterministic closure must:

1. Call `gl.nondet.web.render(evidence_url, mode="text")` inside `try/except`.
2. Return canonical `UNRESOLVED` with reason category `FETCH_FAILED` if rendering fails.
3. Ask the LLM for strict JSON with exactly the keys used by `COMPLIANT_RESULT`.
4. Require `COMPLIANT` only when all identity/version/date bindings match and every locked obligation is demonstrated.
5. Use `NON_COMPLIANT` only when reachable, matched evidence affirmatively demonstrates a missing/failed obligation.
6. Use `UNRESOLVED` for malformed, stale, mismatched, contradictory, or insufficient evidence.

Use `gl.eq_principle.prompt_comparative` with this action-bound principle:

```text
Results are equivalent only when outcome categories match; asset_hash, cycle_id,
provider, evidence_version, and service_date identify the same evidence; and the
completed, missing, and contradiction lists express the same obligation findings.
COMPLIANT, NON_COMPLIANT, and UNRESOLVED are never interchangeable. Reason wording
may differ only when all decision-bearing fields remain equivalent.
```

Parse and deterministically validate the agreed JSON again outside the closure. Never let a model-supplied identity replace locked storage values.

- [ ] **Step 4: Store attempts, terminal outcomes, and certificate fingerprint**

Add:

```python
@allow_storage
@dataclass
class ResolutionAttempt:
    case_id: u256
    attempt_index: u256
    evidence_version: u256
    outcome: str
    fingerprint: str
    findings_json: str

attempts: TreeMap[str, ResolutionAttempt]
```

Compute the fingerprint from canonical agreed decision-bearing JSON. Mark the evidence evaluated exactly once. Store `COMPLIANT` and `NON_COMPLIANT` as terminal; store `UNRESOLVED` as non-terminal. `get_certificate` succeeds only for `COMPLIANT` and returns case/configuration, fingerprint, findings, and original contract address.

- [ ] **Step 5: Add adversarial and atomicity tests**

Cover malformed LLM JSON, wrong asset/provider/cycle/version, out-of-cycle service date, missing tasks, explicit failure, contradictions, fetch failure, repeated evaluation, evaluation before submission, evaluation after terminal, and a mocked nondeterministic exception. For the exception case, assert `status == "SUBMITTED"`, `attempt_count == 0`, and `evaluated is False` after the revert. This is the direct-mode regression for protocol/consensus failure atomicity.

- [ ] **Step 6: Verify and commit the contract core**

Run:

```powershell
genvm-lint check contracts/maintenance_proof.py
pytest tests/direct -v
```

Expected: contract lint exits 0 and every direct test passes.

Commit: `feat: add consensus maintenance evaluation`

---

### Task 4: Studio Integration, Deploy Script, and Frozen Recovery

**Files:**
- Create: `tests/integration/__init__.py`
- Create: `tests/integration/test_maintenance_proof.py`
- Create: `tests/integration/evidence_urls.py`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `deploy/deployScript.ts`
- Create: `deployments/.gitkeep`
- Create: `docs/RECOVERY.md`
- Create: `.env.example`

**Interfaces:**
- Consumes: final contract API from Tasks 1-3.
- Produces: Studio integration suite, `pnpm deploy:contract`, and a JSON deployment manifest with source hash and transaction evidence.

- [ ] **Step 1: Write the Studio integration flow before deployment tooling**

Build a stable public evidence page without external writes. `evidence_urls.py` serializes the exact asset hash, provider address, cycle, version, service date, and completed obligations with `json.dumps(payload, sort_keys=True, separators=(",", ":"))`, Base64-encodes those bytes, URL-escapes the result, and returns `"https://httpbin.org/base64/" + encoded`.

The integration test must:

```python
from gltest import create_accounts, get_contract_factory

owner_account, provider_account, evaluator_account = create_accounts(3)
factory = get_contract_factory("MaintenanceProof")
contract = factory.deploy(args=[], account=owner_account)
case_args = [
    "a" * 64,
    provider_account.address,
    "httpbin.org",
    "Replace the intake filter and verify outlet pressure is 80-120 psi.",
    "hvac-v1",
    "cycle-2026-q3",
    "2026-07-01",
    "2026-09-30",
]
evidence_url = build_evidence_url(provider_account.address)
create_receipt = contract.create_case(args=case_args).transact()
assert tx_execution_succeeded(create_receipt)
submit_receipt = contract.connect(provider_account).submit_evidence(args=[0, evidence_url, 1]).transact()
assert tx_execution_succeeded(submit_receipt)
evaluate_receipt = contract.connect(evaluator_account).evaluate(args=[0]).transact(wait_interval=10000, wait_retries=30)
assert tx_execution_succeeded(evaluate_receipt)
assert json.loads(contract.get_case(args=[0]).call())["status"] == "COMPLIANT"
assert json.loads(contract.get_certificate(args=[0]).call())["fingerprint"]
```

Do not collapse owner/provider/evaluator into one address. Add a second integration case whose report deliberately declares the wrong asset hash and assert the exact safe result `UNRESOLVED`; this is evidence mismatch, not affirmative non-compliance.

- [ ] **Step 2: Run integration collection and local/direct verification**

Run: `pytest --collect-only tests/integration -q`

Expected: tests collect successfully. Then run `pytest tests/direct -v` to ensure no contract regression.

- [ ] **Step 3: Implement deployment and manifest generation**

Use `genlayer-js` 1.1.x in the root package. `deployScript.ts` must read `contracts/maintenance_proof.py`, initialize the consensus smart contract, deploy, wait for `FINALIZED`, verify execution success, derive the address from decoded deploy data, read `case_count`, and write:

```ts
const manifest = {
  network: "studionet",
  chainId: 61999,
  classification: "INTENTIONALLY_FROZEN",
  runner: "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6",
  sourceSha256: createHash("sha256").update(contractCode).digest("hex"),
  deployer: client.account.address,
  contractAddress,
  deploymentTransaction: deployTransaction,
  deployedAt: new Date().toISOString(),
  readback: { caseCount },
};
const manifestPath = `deployments/studionet-${contractAddress.toLowerCase()}.json`;
```

Abort rather than emit a manifest if execution or readback fails.

- [ ] **Step 4: Document frozen recovery and environment boundaries**

`docs/RECOVERY.md` must state: stop new case creation in the frontend, preserve the old address and manifests, deploy reviewed source as a new address, verify its source hash/readback, update only the frontend environment, and keep old case links resolvable. `.env.example` contains empty values for `GENLAYER_PRIVATE_KEY`, `NEXT_PUBLIC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_GENLAYER_RPC_URL`, `VERCEL_TOKEN`, and the three post-deploy integration account keys.

- [ ] **Step 5: Verify and commit deployment readiness**

Run:

```powershell
pnpm install
pnpm exec tsc --noEmit
pytest --collect-only tests/integration -q
git diff --check
```

Expected: all commands exit 0; no deployment is performed.

Commit: `chore: add Studio deployment workflow`

---

### Task 5: Typed Frontend Contract Adapter and Transaction Truthfulness

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/lib/contract/types.ts`
- Create: `frontend/lib/contract/validation.ts`
- Create: `frontend/lib/contract/client.ts`
- Create: `frontend/lib/genlayer/config.ts`
- Create: `frontend/tests/unit/validation.test.ts`
- Create: `frontend/tests/unit/contract-client.test.ts`

**Interfaces:**
- Consumes: canonical JSON view methods and write signatures from the contract.
- Produces: `MaintenaProofClient`, `CaseRecord`, `EvidenceRecord`, `ResolutionAttempt`, `Certificate`, and `TransactionProgress` types used by all frontend hooks/components.

- [ ] **Step 1: Scaffold only the frontend test/build toolchain**

Pin Next.js 16, React 19, TypeScript 5.9, `genlayer-js` 1.1.x, TanStack Query 5, Vitest 3, Testing Library, Playwright, Tailwind 4, Lucide, and `clsx`. Add scripts: `dev`, `lint`, `typecheck`, `test`, `test:integration`, and `build`.

- [ ] **Step 2: Write failing validation and receipt-state tests**

Use a narrow injectable `GenLayerClientPort` rather than mocking global modules:

```ts
export interface GenLayerClientPort {
  readContract(input: ReadInput): Promise<unknown>;
  writeContract(input: WriteInput): Promise<`0x${string}`>;
  waitForTransactionReceipt(input: WaitInput): Promise<GenLayerReceipt>;
}

export type ReadInput = {
  address: `0x${string}`;
  functionName: string;
  args: readonly unknown[];
};
export type WriteInput = ReadInput & { value?: bigint };
export type WaitInput = {
  hash: `0x${string}`;
  status: "FINALIZED";
  retries?: number;
  interval?: number;
};
export type GenLayerReceipt = {
  statusName?: string;
  txExecutionResultName?: string;
};
```

Test that `createCase` emits progress in this order:

```ts
expect(stages).toEqual([
  "AWAITING_SIGNATURE",
  "PENDING",
  "FINALIZED",
  "EXECUTION_SUCCESS",
  "READBACK_CONFIRMED",
]);
```

Also test finalized-with-error, readback mismatch, disconnected wallet, missing contract address, invalid asset/date/hostname/URL, and JSON parse failures.

- [ ] **Step 3: Implement exact domain types and validation mirror**

Define literal states `DRAFT | SUBMITTED | COMPLIANT | NON_COMPLIANT | UNRESOLVED | CANCELLED` and transaction stages `DISCONNECTED | READY | AWAITING_SIGNATURE | PENDING | FINALIZED | EXECUTION_SUCCESS | EXECUTION_ERROR | READBACK_CONFIRMED`. Client validation mirrors contract constraints for usability but its errors must never be treated as authoritative outcomes.

- [ ] **Step 4: Implement the adapter with post-finalization execution and readback checks**

`MaintenaProofClient` methods:

```ts
listCases(): Promise<CaseRecord[]>
getCase(caseId: bigint): Promise<CaseRecord>
getEvidence(caseId: bigint, index: bigint): Promise<EvidenceRecord>
getAttempt(caseId: bigint, index: bigint): Promise<ResolutionAttempt>
getCertificate(caseId: bigint): Promise<Certificate>
createCase(input: CreateCaseInput, onProgress: ProgressSink): Promise<WriteResult>
cancelCase(caseId: bigint, onProgress: ProgressSink): Promise<WriteResult>
submitEvidence(input: SubmitEvidenceInput, onProgress: ProgressSink): Promise<WriteResult>
evaluate(caseId: bigint, onProgress: ProgressSink): Promise<WriteResult>
```

Every write waits for `TransactionStatus.FINALIZED`, checks `txExecutionResultName === ExecutionResult.FINISHED_WITH_RETURN`, then reads the case and validates the expected transition. Preserve the transaction hash in both success and error results.

- [ ] **Step 5: Run tests/build boundary and commit**

Run:

```powershell
pnpm --dir frontend test
pnpm --dir frontend typecheck
pnpm --dir frontend lint
```

Expected: all commands pass.

Commit: `feat: add truthful GenLayer client adapter`

---

### Task 6: Wallet, Contract Hooks, and Responsive Application UI

**Files:**
- Create: `frontend/app/globals.css`
- Create: `frontend/app/layout.tsx`
- Create: `frontend/app/providers.tsx`
- Create: `frontend/app/page.tsx`
- Create: `frontend/app/cases/new/page.tsx`
- Create: `frontend/app/cases/[id]/page.tsx`
- Create: `frontend/lib/genlayer/wallet.tsx`
- Create: `frontend/lib/hooks/use-cases.ts`
- Create: `frontend/components/app-shell.tsx`
- Create: `frontend/components/wallet-button.tsx`
- Create: `frontend/components/status-badge.tsx`
- Create: `frontend/components/transaction-timeline.tsx`
- Create: `frontend/components/case-card.tsx`
- Create: `frontend/components/case-actions.tsx`
- Create: `frontend/components/create-case-form.tsx`
- Create: `frontend/components/evidence-form.tsx`
- Create: `frontend/components/evaluate-panel.tsx`
- Create: `frontend/components/certificate-card.tsx`
- Create: `frontend/tests/components/transaction-timeline.test.tsx`
- Create: `frontend/tests/components/case-actions.test.tsx`
- Create: `frontend/tests/components/certificate-card.test.tsx`

**Interfaces:**
- Consumes: Task 5 adapter and types.
- Produces: complete actor-aware UI with wallet connection and contract-backed read/write flows.

- [ ] **Step 1: Write failing UI-state tests**

Test these visible requirements:

```tsx
render(<CaseActions wallet={null} caseRecord={draftCase} />);
expect(screen.getByText("Connect wallet to continue")).toBeVisible();

render(<TransactionTimeline stage="FINALIZED" execution="pending" />);
expect(screen.getByText("Finalized by consensus")).toBeVisible();
expect(screen.queryByText("Action completed")).not.toBeInTheDocument();

render(<CertificateCard caseRecord={compliantCase} certificate={certificate} />);
expect(screen.getByText(certificate.fingerprint)).toBeVisible();
expect(screen.getByRole("link", { name: /view contract/i })).toHaveAttribute("href", expect.stringContaining(contractAddress));
```

Add actor tests: owner sees cancel only in `DRAFT`; locked provider sees submit in `DRAFT`/`UNRESOLVED`; unrelated address sees evaluate only in `SUBMITTED`; terminal cases expose readback only.

- [ ] **Step 2: Implement wallet context and hooks**

Wallet context must expose `address`, `isConnected`, `isCorrectNetwork`, `connect`, `switchNetwork`, and account/chain change listeners. Do not read browser storage for keys. `useCases` and `useCase(id)` use TanStack Query; mutations route all progress through `TransactionProgress`, invalidate only after readback, and retain the hash when errors occur.

- [ ] **Step 3: Implement the industrial visual system and application shell**

Use CSS variables for warm neutral canvas, graphite text, safety green, amber, and red. Meet WCAG AA contrast, keyboard focus visibility, mobile layout at 375px, tablet at 768px, and wide layout at 1280px. Avoid decorative stock imagery, fake metrics, gradients that reduce text contrast, and generic blockchain marketing copy.

- [ ] **Step 4: Implement the three contract-backed pages**

Dashboard reads `case_count` then each case; an unconfigured address shows a setup error rather than sample data. New case submits all immutable fields and routes to the readback case ID. Case detail shows locked policy, revisions, attempts, actor-valid actions, transaction timeline, Explorer links, and certificate only after `COMPLIANT` readback.

- [ ] **Step 5: Verify UI behavior and production build**

Run:

```powershell
pnpm --dir frontend test
pnpm --dir frontend lint
pnpm --dir frontend typecheck
pnpm --dir frontend build
```

Expected: tests and checks pass; build produces all three routes without fabricated runtime data.

Commit: `feat: build MaintenaProof contract interface`

---

### Task 7: Frontend-to-Contract Integration and CI

**Files:**
- Create: `frontend/tests/integration/live-contract-flow.test.ts`
- Create: `frontend/tests/e2e/readback.spec.ts`
- Create: `frontend/playwright.config.ts`
- Create: `.github/workflows/ci.yml`
- Modify: `.gitignore`
- Modify: `.env.example`

**Interfaces:**
- Consumes: deployed-address environment and the same `MaintenaProofClient` used by UI pages.
- Produces: real Studio adapter flow, read-only browser regression, and pre-deploy CI.

- [ ] **Step 1: Write the opt-in live adapter integration test**

Require `MAINTENAPROOF_CONTRACT_ADDRESS`, `E2E_OWNER_PRIVATE_KEY`, `E2E_PROVIDER_PRIVATE_KEY`, and `E2E_EVALUATOR_PRIVATE_KEY`; skip with a clear reason when absent. Create separate GenLayer accounts, build three adapters, then create a case, submit a `httpbin.org/base64/...` report, evaluate from the unrelated account, and assert `FINALIZED`, execution success, expected terminal state, and matching certificate fingerprint readback. Never print keys or account objects.

- [ ] **Step 2: Add a browser readback regression**

Playwright opens `/`, asserts no fake cases, opens a known case detail from `E2E_CASE_ID`, and verifies status, fingerprint, transaction/explorer link, and responsive layout at 375x812 and 1280x800. The write transaction remains an action-time live browser verification after deploy because wallet approval must use the user's confirmed wallet context.

- [ ] **Step 3: Add CI without secret-dependent deployment**

CI runs contract lint, `pytest tests/direct -v`, frontend unit/component tests, lint, typecheck, and build. It collects but does not execute Studio integration or deployment. Cache dependencies only; never upload `.env`, manifests containing unverified addresses, test reports with secrets, or build artifacts to the repository.

- [ ] **Step 4: Verify test selection and commit**

Run:

```powershell
pytest tests/direct -v
pytest --collect-only tests/integration -q
pnpm --dir frontend test
pnpm --dir frontend typecheck
pnpm --dir frontend lint
pnpm --dir frontend build
```

Expected: all local checks pass and integration tests collect.

Commit: `test: add contract flow integration coverage`

---

### Task 8: README, Evidence Framework, and Pre-Deployment Verification Gate

**Files:**
- Create: `README.md`
- Create: `docs/EVIDENCE.md`
- Modify: `.gitignore`
- Modify: `.env.example`

**Interfaces:**
- Consumes: all implemented commands, contract methods, UI flows, and deployment manifest schema.
- Produces: concise reviewer documentation and a fixed proof package ready to populate only with observed evidence.

- [ ] **Step 1: Write concise operational documentation**

README sections: problem/trust model, decision/consequence, architecture, state machine including consensus-failure distinction, setup, environment variables, direct tests, Studio integration, frontend, contract deploy, Vercel deploy, usage, intentionally frozen recovery, and known limitations. Keep commands copyable and never include a real secret.

- [ ] **Step 2: Create the fixed evidence table without invented claims**

`docs/EVIDENCE.md` starts with verification status `INCOMPLETE` and this table:

```markdown
| Actor | Action | Contract method | Transaction hash | FINALIZED / execution | Readback | Source/test |
|---|---|---|---|---|---|---|
```

Before live execution, rows must explicitly say `Not yet executed`; do not invent hashes, addresses, URLs, or passing results. Include exact sections for commit/source hash, deployment manifest, Vercel URL, lint/build/test commands, happy path, important error path, and known limitations.

- [ ] **Step 3: Run the complete pre-deployment verification suite**

Run from a clean worktree:

```powershell
genvm-lint check contracts/maintenance_proof.py
pytest tests/direct -v
pytest --collect-only tests/integration -q
pnpm exec tsc --noEmit
pnpm --dir frontend test
pnpm --dir frontend lint
pnpm --dir frontend typecheck
pnpm --dir frontend build
git diff --check
git status --short
```

Fix every failure with a regression test and rerun the full command set.

- [ ] **Step 4: Audit repository hygiene and commit**

Inspect all staged/untracked paths with `git status --short` and `git diff --cached --stat`. Search tracked content for private keys, seed phrases, bearer tokens, `VERCEL_TOKEN=`, non-empty secret assignments, local instruction files, raw research, AI prompts, `node_modules`, `.next`, caches, and build output. Remove unsafe material from the staging set without deleting user-owned files.

Commit: `docs: add MaintenaProof operations and evidence guide`

- [ ] **Step 5: Stop at the external-action confirmation gate**

Read-only checks only:

```powershell
git config user.name
git config user.email
gh auth status
git remote -v
genlayer account list
genlayer network
vercel whoami
vercel project ls
```

Present the exact Git author, active GitHub account and intended repository owner/remote, selected deployment wallet address, Studionet network, Vercel account/team/project, source commit, and the three proposed external actions. Wait for the user's explicit action-time confirmation before any GitHub repository creation/push, contract deployment, or Vercel deployment.

---

### Task 9: Authorized Deployment, Live Browser Proof, and Final Evidence

**Files:**
- Create after observation: the exact path emitted by `` `deployments/studionet-${contractAddress.toLowerCase()}.json` ``
- Modify after observation: `docs/EVIDENCE.md`
- Modify after observation: `README.md`

**Interfaces:**
- Consumes: explicit action-time user confirmation and verified identity context from Task 8.
- Produces: repository URL/commit, deployed contract/readback, Vercel URL, live successful/error transactions, and completed proof matrix.

- [ ] **Step 1: Perform only the separately confirmed external actions**

Push the reviewed commit to the confirmed GitHub repository, deploy `contracts/maintenance_proof.py` from that exact source to confirmed Studionet wallet, wait for `FINALIZED`, require execution success, and verify `case_count() == 0`. Save the runtime manifest. Deploy the frontend to the confirmed Vercel team/project with the verified address and RPC URL.

- [ ] **Step 2: Run real Studio and frontend-to-contract integration**

Run Python Studio integration and the TypeScript live adapter test against the deployed address. Preserve only transaction hashes, public addresses, statuses, and readbacks; never persist private keys or token-bearing command output.

- [ ] **Step 3: Exercise the deployed application in a real browser**

With the confirmed connected wallet, create one valid case through the frontend, observe awaiting-signature/pending/finalized/execution/readback states, submit/evaluate evidence using the required actor wallets, and record a successful terminal transaction. Trigger one important deterministic error through the UI, such as unauthorized submission or invalid transition, and verify state remains unchanged. Inspect console errors, responsive layout, Explorer links, and contract readback.

- [ ] **Step 4: Verify source/address correspondence and populate evidence**

Compare the Explorer-displayed contract source and runner header to the exact committed file and source SHA-256. Populate every proof-matrix cell from observed evidence. Mark any unexercised promoted branch as a known limitation rather than complete.

- [ ] **Step 5: Rerun fixed verification and publish only with renewed confirmation if needed**

Rerun lint, build, direct tests, Studio integration, frontend live integration, secret scan, and source hash. Commit the public manifest/evidence updates locally. Because this creates a new commit, show the new exact commit and request confirmation again before pushing that evidence commit or redeploying the frontend.
