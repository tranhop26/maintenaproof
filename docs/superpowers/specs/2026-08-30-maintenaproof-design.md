# MaintenaProof MVP Design

Date: 2026-08-30
Status: Approved design, pending implementation plan
Contract classification: `INTENTIONALLY_FROZEN`

## 1. Product scope

MaintenaProof issues an on-chain maintenance-compliance certificate for one equipment maintenance cycle. The owner locks the asset reference, provider identity, evidence hostname, policy, policy version, and cycle boundaries. The provider publishes and submits a public maintenance report. GenLayer validators independently fetch the same report and decide whether it proves compliance with the locked policy.

The MVP has no escrow, stake, payment, backend adjudicator, notification system, or off-chain account database. The Intelligent Contract is the only authoritative source for actors, evidence revisions, state transitions, final decisions, and certificates.

## 2. Problem and trust model

An equipment owner cannot simply trust a service provider's assertion that required maintenance was completed. The provider cannot trust the owner to preserve the original acceptance policy or acknowledge valid work. A verifier cannot trust a frontend rendering controlled by either party.

| Actor | Cannot trust | Can manipulate | Contract defense | Test or evidence |
|---|---|---|---|---|
| Equipment owner | Service provider | Policy, asset identity, acceptance criteria | Lock the policy, policy version, asset hash, provider, source hostname, and cycle when the case is created | Direct tests for immutability and owner-only creation/cancellation |
| Service provider | Equipment owner | Evidence URL, report content, report revision | Provider-only submission; validators fetch and judge; owner has no outcome override | Authorization, source-host, revision, and outcome tests |
| Evaluation caller | Both parties | Call timing, retry, or replay attempts | Permissionless evaluation reads only submitted evidence; each case/revision can be evaluated once; terminal states reject writes | Third-party evaluator and replay tests |
| Public verifier | Frontend/operator | Displayed status and certificate details | Contract read methods expose the canonical case, outcome, fingerprint, and revision history | Integration and browser readback evidence |

The design does not claim that an asset hash alone proves a physical device's real-world identity. It binds all records consistently to the same declared asset. Collusion between the owner, provider, and evidence host is a known limitation.

## 3. GenLayer decision and on-chain consequence

Decision statement:

> Does the submitted public evidence, for the locked provider, asset, cycle, policy version, and evidence revision, demonstrate that every required maintenance obligation was completed within the stated cycle?

Allowed semantic outcomes are action-bound:

- `COMPLIANT`: the evidence proves every required obligation.
- `NON_COMPLIANT`: reachable evidence proves that one or more obligations were not satisfied.
- `UNRESOLVED`: evidence is unavailable, malformed, stale, mismatched, contradictory, or insufficient to establish either conclusive outcome.

On-chain consequence:

- `COMPLIANT` stores a terminal certificate with the agreed evidence fingerprint and normalized findings.
- `NON_COMPLIANT` stores a terminal rejection record with the agreed fingerprint and findings.
- `UNRESOLVED` stores a safe non-terminal resolution attempt and permits a strictly newer evidence revision.
- A protocol-level consensus failure changes no state; the case stays `SUBMITTED` and may be retried. The frontend must not relabel that failure as a stored `UNRESOLVED` result.

## 4. Evidence binding

Each evaluation is bound to:

- Network chain identifier and deployed contract address.
- Case identifier and action/revision domain.
- Asset identifier hash and maintenance cycle identifier.
- Provider wallet and locked evidence hostname.
- Policy text and policy version.
- Evidence URL and strictly increasing evidence version.
- Report-declared subject, provider identity, schema/content version, service observation date, and report issue date.
- Cycle start/end dates encoded in the case rather than inferred from an unavailable chain clock.
- A canonical agreed record and fingerprint stored with the resolution attempt.

The deterministic replay domain is `sha256(chain_id | contract_address | case_id | evidence_version | evidence_url)`. The agreed evidence fingerprint is separately computed from the canonical decision-bearing result. The replay-domain hash prevents the same submitted action from executing twice; the evidence fingerprint makes the exact agreed result auditable without rejecting a legitimate newer report that happens to repeat earlier findings.

Validators independently render the same locked URL. They extract and compare the decision, subject, provider, cycle, evidence version, service date, completed obligations, missing obligations, and a concise reason. The equivalence principle treats different outcome categories as non-equivalent and requires semantic agreement on all decision-bearing metadata. Reason wording is not decision-bearing.

Evidence failure never defaults to approval. Unreachable pages, wrong hostnames, asset/cycle/provider mismatches, missing dates or versions, out-of-cycle service, malformed reports, contradictory claims, and insufficient task coverage resolve to `UNRESOLVED` when validators agree on insufficiency. If validators cannot reach protocol consensus, no state is written.

The stored fingerprint anchors the canonical decision-bearing record observed at evaluation. It does not claim that a mutable webpage can never change later.

## 5. Actors and state machine

Actors:

- Owner: creates a case and may cancel it only while it is `DRAFT`.
- Provider: submits the first evidence and strictly newer revisions after `UNRESOLVED`.
- Evaluator: any wallet may trigger evaluation of a `SUBMITTED` case.
- Verifier: any client may use view methods without authorization.

States:

- `DRAFT`
- `SUBMITTED`
- `COMPLIANT` (terminal)
- `NON_COMPLIANT` (terminal)
- `UNRESOLVED`
- `CANCELLED` (terminal)

| From | Actor | Method | Preconditions | On-chain effect | To | Replay behavior |
|---|---|---|---|---|---|---|
| none | Owner | `create_case` | Valid provider, asset hash, hostname, policy/version, and cycle | Stores immutable case configuration | `DRAFT` | New unique case ID |
| `DRAFT` | Owner | `cancel_case` | Caller is owner | Stores terminal cancellation | `CANCELLED` | Rejected after first cancellation |
| `DRAFT` | Provider | `submit_evidence` | Caller is locked provider; URL host matches; version is positive | Stores evidence revision and replay-domain hash | `SUBMITTED` | Duplicate replay domain rejected |
| `UNRESOLVED` | Provider | `submit_evidence` | Strictly newer evidence version and unused revision | Appends revision without erasing prior attempt | `SUBMITTED` | Old or duplicate revision rejected |
| `SUBMITTED` | Any wallet | `evaluate` | Current revision has not been evaluated | Runs GenLayer judgment and stores agreed record | `COMPLIANT`, `NON_COMPLIANT`, or `UNRESOLVED` | Rejected for evaluated revision or terminal case |

No owner, provider, frontend, or backend method can select or rewrite an outcome.

## 6. Contract surface and storage

Primary writes:

- `create_case(asset_hash, provider, evidence_hostname, policy, policy_version, cycle_id, cycle_start, cycle_end)`
- `cancel_case(case_id)`
- `submit_evidence(case_id, evidence_url, evidence_version)`
- `evaluate(case_id)`

Primary views:

- `case_count()`
- `get_case(case_id)`
- `get_evidence(case_id, revision_index)`
- `get_attempt(case_id, attempt_index)`
- `get_certificate(case_id)`

Storage is append-oriented for evidence revisions and resolution attempts. Final certificate fields are derived only from an agreed `COMPLIANT` result. Read methods return canonical JSON so the frontend can reconcile exact on-chain state.

## 7. Repository architecture

```text
contracts/                 GenLayer Intelligent Contract source
tests/direct/              In-memory logic and mocked web/LLM tests
tests/integration/         Studio deployment and real contract flow tests
frontend/                  Responsive Next.js/TypeScript application
deploy/                    Deployment script and manifest generation
deployments/               Non-secret deployment manifests
docs/                      Design, recovery runbook, and fixed evidence package
```

The frontend uses GenLayerJS through a small typed contract adapter. UI components do not construct outcomes or advance durable workflow state. TanStack Query handles contract reads and invalidation after confirmed writes. Wallet connectivity uses the supported GenLayerJS wallet provider path.

## 8. Frontend experience

MaintenaProof uses a restrained industrial visual language: warm neutral surfaces, graphite typography, safety green for `COMPLIANT`, amber for `UNRESOLVED`, and red only for execution errors or `NON_COMPLIANT`.

Pages:

- Cases dashboard: contract-backed cases and status filters.
- New case: validates and submits immutable configuration.
- Case detail: locked policy, actor-aware actions, evidence revisions, transaction timeline, resolution attempts, readback, and Explorer links.

Every write distinguishes:

1. Wallet disconnected.
2. Ready and authoritative current readback.
3. Awaiting wallet signature.
4. Transaction pending/consensus in progress.
5. Transaction `FINALIZED`.
6. Execution `SUCCESS` or execution `ERROR`.
7. Post-transaction contract readback and reconciliation.

A finalized transaction is not presented as success until its execution result is successful and readback confirms the expected state. The UI contains no sample cases or fabricated transaction data in production mode.

## 9. Error handling and recovery

Deterministic validation rejects unauthorized actors, invalid addresses/hostnames, empty or oversized fields, invalid cycle ordering, non-increasing versions, illegal transitions, duplicate evidence, repeated evaluation, and writes to terminal cases. Input constraints are explicit:

- `asset_hash`: exactly 64 lowercase hexadecimal characters.
- `provider`: non-zero GenLayer address.
- `evidence_hostname`: lowercase ASCII DNS hostname, 3-253 characters, with no scheme, port, path, query, wildcard, user information, or IP literal.
- `evidence_url`: HTTPS only, at most 1,000 characters, with a hostname exactly equal to the locked hostname; redirects are not accepted as a hostname substitute.
- `policy`: 20-2,000 UTF-8 characters; `policy_version` and `cycle_id`: 1-64 restricted printable characters.
- `cycle_start` and `cycle_end`: zero-padded ISO `YYYY-MM-DD`, with start not after end.
- `evidence_version`: integer from 1 through `2^32-1`, strictly increasing per case.

Semantic insufficiency produces an agreed `UNRESOLVED` attempt. Protocol consensus failure is atomic and leaves storage unchanged. The UI exposes retry without optimistic state advancement.

The contract is `INTENTIONALLY_FROZEN`:

- There is no upgrade, proxy, privileged storage rewrite, or owner outcome override.
- A defect response stops new case creation in the frontend and deploys a separately addressed contract version.
- Old cases and certificates remain verifiable at their original address.
- Deployment manifests bind network, deployer, runner hash, source hash, address, transaction hash, and deployment time.
- The recovery runbook documents frontend cutover and old-address retention.

## 10. Test and verification plan

Direct tests cover:

- Owner/provider/evaluator authorization.
- Invalid inputs and source host validation.
- Invalid transitions and terminal-state protection.
- Missing, malformed, stale, mismatched, contradictory, and unreachable evidence.
- `COMPLIANT`, `NON_COMPLIANT`, and `UNRESOLVED` outcomes.
- Consensus disagreement leaving state unchanged.
- Revision monotonicity, duplicate evidence, replay, repeated evaluation, and terminal replay.
- Permissionless evaluation by an unrelated address.
- Absence of privileged upgrade or outcome override paths.

Integration tests deploy the real contract to a GenLayer Studio environment and exercise case creation, provider submission, third-party evaluation, transaction status/execution checks, and readback. Frontend integration tests exercise the typed adapter and state reconciliation. After authorized deployment, a browser test uses the live frontend and connected wallet for at least one successful transaction and one important rejected transaction.

Required verification commands include contract lint, frontend lint/typecheck, production build, all direct tests, all integration tests, and browser/live-chain verification.

## 11. Deployment and evidence gates

Before GitHub push, contract deployment, or Vercel deployment, inspect and present the active Git author, GitHub account/remote owner, deployment wallet, and Vercel team/project. State the exact external action and wait for action-time user confirmation.

The final evidence package must contain:

- Repository URL and exact commit.
- Source hash.
- Studionet contract address, deployment transaction, and Explorer link.
- Vercel URL.
- Lint, build, direct-test, integration-test, and live-browser results.
- Happy-path and important error-path transactions/readbacks.
- Proof matrix mapping actor to action, method, transaction, finalization/execution, readback, and source/test.
- Known limitations.

No token, private key, secret, prompt transcript, raw research, local instruction file, dependency tree, or build cache may be committed or deployed.

## 12. Explicit non-goals and limitations

- No custody, stake, escrow, fees, or payments.
- No notification service, backend database, or username/password accounts.
- No private evidence; submitted URLs must be publicly readable by validators.
- No proof of physical identity beyond the consistently bound declared asset hash and public provider evidence.
- No reopening terminal cases; a new maintenance cycle creates a new case.
- Studionet is a test environment and no result is marketed as production certification.
