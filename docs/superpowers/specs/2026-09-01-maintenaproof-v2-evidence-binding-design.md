# MaintenaProof V2 Evidence Binding Design

**Status:** Approved in conversation on 2026-09-01; written specification awaiting final review before implementation.

## Purpose

MaintenaProof V2 determines whether an immutable maintenance service record,
authenticated by a case-bound issuer and bound to the correct asset, policy,
cycle, schema, version, and replay domain, semantically proves every locked
maintenance obligation.

The contract does not claim to prove that physical work occurred independently
of its issuer. It proves which issuer attested to which immutable record and
stores the GenLayer validator-agreed interpretation of that exact record.

## Selected architecture

V2 uses an issuer-authenticated on-chain record rather than a mutable evidence
URL. The owner creates a case and binds an issuer wallet. That issuer submits a
canonical JSON service record in a signed GenLayer transaction. The contract
derives issuer identity from `gl.message.sender_address`, canonicalizes the
record, computes its digest, stores the canonical record and digest, and then
allows any wallet to request validator evaluation.

The selected architecture is preferred over two alternatives:

1. **Selected: canonical record stored by the issuer on-chain.** This provides
   deterministic evidence bytes, transaction-authenticated issuer identity,
   simple readback, and no dependency on an external availability layer.
2. **Rejected for the MVP: HTTPS snapshot plus digest.** A digest improves
   integrity, but availability and rendering/canonicalization differences can
   still prevent validators from observing identical bytes.
3. **Deferred: external signed document plus signature recovery.** This supports
   records issued outside GenLayer, but it requires a verified cryptographic
   signature primitive and key-management model that are unnecessary when the
   issuer can submit the record directly.

Large binary attachments remain off-chain. Each attachment is referenced by an
immutable URI and a digest inside the canonical service record. V2 validators
evaluate the signed canonical record; attachment-content adjudication is not a
promoted capability unless attachment fetching and digest verification are
implemented and proven separately.

## Decision and consequence

**Decision statement:** For one case and one evidence revision, GenLayer decides
whether the exact canonical record submitted by the locked issuer demonstrates
all obligations in the locked policy, affirmatively demonstrates one or more
missing or failed obligations, or is insufficient/unsafe to decide.

**Consequence statement:** The Intelligent Contract records a resolution attempt
and moves the case to `COMPLIANT`, `NON_COMPLIANT`, or `UNRESOLVED`.
`COMPLIANT` creates a certificate fingerprint bound to the issuer, record digest,
policy hash, case, cycle, evidence version, outcome, and normalized findings.
`NON_COMPLIANT` is terminal. `UNRESOLVED` is safe and non-terminal, allowing only
the locked issuer to submit a strictly newer record.

## Trust matrix

| Actor | Cannot trust | Manipulation capability | Contract defense | Required test/evidence |
|---|---|---|---|---|
| Owner | Issuer/provider | Issuer can make unsupported service claims | Bind issuer, asset, policy hash, cycle, and schema at case creation; validator semantic review; no favorable default | Wrong issuer and mismatched record tests |
| Issuer | Owner | Owner can apply a record to the wrong asset, policy, or cycle | Canonical record must match every immutable case binding | Cross-case, asset, policy, and cycle replay tests |
| Evaluator | Owner and issuer | Either party can time or repeat evaluation | Evaluator supplies only `case_id`; any wallet may call; terminal/evaluated revisions reject repeats | Third-party trigger and double-evaluation tests |
| Validators | Evidence submitter | Submitter can omit, contradict, or fabricate claims | Evaluate the exact stored canonical record; bind agreed result to record digest; unsafe output becomes `UNRESOLVED` | Insufficient, contradictory, malformed, and digest-mismatch tests |
| Verifier | Frontend | UI can display fabricated certificate data | Certificate and record are read from the contract; UI links the contract and displays the digest and issuer | Production readback and browser test |
| Future deployment operator | Current deployment | Frozen source cannot be patched | Deploy reviewed V2 to a new address; preserve V1 manifest and address | Manifest, source hash, deployment receipt, recovery documentation |

## Case and evidence model

### MaintenanceCase

V2 replaces `evidence_hostname` with immutable issuer and schema bindings and
adds a deterministic policy digest.

```text
id: u256
owner: Address
issuer: Address
provider: Address
asset_hash: 64 lowercase hexadecimal characters
policy: UTF-8 text, 20..2000 characters
policy_hash: sha256(the exact stored UTF-8 policy string)
policy_version: printable identifier, 1..64 characters
cycle_id: printable identifier, 1..64 characters
cycle_start: ISO date
cycle_end: ISO date
record_schema: "maintenaproof.service-record.v2"
status: AWAITING_RECORD | SUBMITTED | COMPLIANT | NON_COMPLIANT | UNRESOLVED | CANCELLED
latest_evidence_version: u256
evidence_count: u256
attempt_count: u256
certificate_fingerprint: lowercase SHA-256 or empty
```

The provider is the party responsible for service. The issuer is the wallet
authorized to attest to service records. They may be the same address but are
stored separately so the certificate does not confuse service responsibility
with record issuance. V2 proves issuance by a wallet address; it does not prove
the off-chain legal identity controlling that wallet. The case owner selects the
issuer wallet, and the UI and certificate must describe it as an issuer wallet
rather than a verified company identity.

### Canonical service record input

The write interface accepts typed fields rather than trusting a caller-supplied
JSON digest:

```text
submit_service_record(
  case_id: int,
  version: int,
  service_date: str,
  issued_at: str,
  expires_at: str,
  nonce: str,
  completed_json: str,
  measurements_json: str,
  attachments_json: str,
  notes: str,
) -> str  # record digest
```

`completed_json`, `measurements_json`, and `attachments_json` must decode to
bounded JSON arrays:

- `completed_json`: 1..32 unique strings, each 1..256 printable characters.
- `measurements_json`: 0..32 objects, each with exactly `name`, `value`, and
  `unit`; `name` and `unit` are 1..64 printable characters and `value` is a
  1..128 printable-character string.
- `attachments_json`: 0..16 objects, each with exactly `uri` and `sha256`;
  `uri` is 1..512 printable characters and `sha256` is 64 lowercase
  hexadecimal characters.
- `nonce`: 1..128 printable characters and unique within the full replay
  domain.
- `notes`: 0..2000 printable characters.
- The resulting canonical record JSON is at most 32,000 UTF-8 bytes.

The contract constructs and stores canonical JSON with exactly these keys:

```json
{
  "action": "ISSUE_SERVICE_RECORD",
  "asset_hash": "...",
  "attachments": [],
  "case_id": 0,
  "chain_id": 61999,
  "completed_actions": [],
  "contract_address": "0x...",
  "cycle_id": "...",
  "expires_at": "2026-09-30T23:59:59Z",
  "issued_at": "2026-08-16T10:00:00Z",
  "issuer": "0x...",
  "measurements": [],
  "nonce": "...",
  "notes": "...",
  "policy_hash": "...",
  "policy_version": "...",
  "provider": "0x...",
  "record_schema": "maintenaproof.service-record.v2",
  "record_version": 1,
  "service_date": "2026-08-15"
}
```

`chain_id`, `contract_address`, `case_id`, `issuer`, case bindings, schema, and
version are taken from contract context and storage rather than from untrusted
input. The record digest is `sha256(canonical_record_json)`.

### EvidenceRecord

```text
case_id: u256
revision_index: u256
version: u256
issuer: Address
record_digest: str
record_json: str
service_date: str
issued_at: str
expires_at: str
submitted_at: str
nonce: str
replay_domain: str
evaluated: bool
```

### Replay binding

The replay domain is:

```text
sha256(
  record_schema | chain_id | contract_address | case_id |
  "ISSUE_SERVICE_RECORD" | issuer | version | record_digest | nonce
)
```

The same replay domain cannot be stored twice. A record from another chain,
contract, case, action, issuer, version, digest, or nonce cannot be substituted.

## Timestamp and freshness rules

- `service_date` is a valid ISO date inside the locked service cycle.
- `issued_at` and `expires_at` use exactly `YYYY-MM-DDTHH:MM:SSZ` and must parse
  as valid UTC timestamps.
- The calendar date of `issued_at` is not earlier than `service_date` and not
  later than `cycle_end`.
- `expires_at` is not earlier than `issued_at`.
- The contract obtains deterministic transaction time from
  `gl.message_raw["datetime"]`. It stores that value as `submitted_at`; callers
  cannot supply or override it.
- Submission rejects records whose `issued_at` is later than transaction time or
  whose `expires_at` is earlier than transaction time.
- Evaluation compares its deterministic transaction time with the stored
  `expires_at`. A record that expires after submission but before evaluation is
  recorded as `UNRESOLVED` with reason `EVIDENCE_EXPIRED`.
- Prompts receive the stored submission time and the deterministic evaluation
  time, but time comparisons are enforced by deterministic contract code rather
  than delegated to the model.

## Validator protocol

Before entering the nondeterministic validator function, `evaluate` copies the
case fields, canonical record JSON, and record digest into local values. The
validator prompt evaluates only that exact record against the locked policy.

The response contains exactly:

```text
outcome, case_id, issuer, provider, asset_hash, record_digest,
record_schema, record_version, policy_hash, policy_version, cycle_id,
service_date, issued_at, expires_at, completed, missing,
contradictions, reason
```

Normalization deterministically rejects to `UNRESOLVED` when:

- keys or types are malformed;
- identity, digest, schema, version, asset, policy, or cycle fields mismatch;
- dates are invalid or inconsistent;
- `COMPLIANT` has no completed obligations, has missing obligations, or has
  contradictions;
- `NON_COMPLIANT` has no affirmative missing/failed obligation or has unresolved
  contradictions;
- the record is insufficient to match every locked obligation.

The comparative equivalence principle requires exact equality of every identity
and digest field, outcome, dates, and obligation lists. Free-form reason wording
may differ only after all decision-bearing fields are equivalent. Protocol
consensus failure writes no attempt and leaves the case `SUBMITTED`.

## Certificate binding

For a compliant decision, the contract computes:

```text
sha256(canonical_json({
  chain_id,
  contract_address,
  case_id,
  issuer,
  provider,
  record_digest,
  record_schema,
  record_version,
  asset_hash,
  policy_hash,
  policy_version,
  cycle_id,
  outcome,
  completed,
  missing,
  contradictions,
  service_date,
  issued_at,
  expires_at
}))
```

The free-form reason is excluded. The certificate readback returns every field
needed to recompute the fingerprint, including the record digest and issuer.

## State machine

| From | Actor | Method | Preconditions | On-chain effect | To | Replay behavior |
|---|---|---|---|---|---|---|
| none | Owner | `create_case` | Valid actors, asset, policy, schema, cycle | Store immutable case | `AWAITING_RECORD` | New case ID |
| `AWAITING_RECORD` | Owner | `cancel_case` | Caller is owner | Mark cancelled | `CANCELLED` | Further writes rejected |
| `AWAITING_RECORD` | Issuer | `submit_service_record` | Caller is locked issuer; v1; valid bound record | Store canonical record and digest | `SUBMITTED` | Duplicate domain rejected |
| `UNRESOLVED` | Issuer | `submit_service_record` | Strictly newer version; valid bound record | Append revision | `SUBMITTED` | Old/duplicate version rejected |
| `SUBMITTED` | Any wallet | `evaluate` | Latest revision not evaluated | Store attempt and decision | `COMPLIANT`, `NON_COMPLIANT`, or `UNRESOLVED` | Evaluated/terminal revision rejected |

No method accepts an outcome from the owner, issuer, provider, evaluator,
frontend, or backend. `COMPLIANT`, `NON_COMPLIANT`, and `CANCELLED` are terminal.

## Frontend behavior

- The create form collects issuer and provider separately and explains their
  roles.
- The record form is shown only to the connected issuer and accepts bounded
  service-record fields, not a public URL.
- A preview displays the canonical identity bindings before wallet submission.
- The case page displays record digest, issuer, version, dates, nonce, evaluation
  status, and canonical record details from contract readback.
- The certificate displays issuer, provider, record digest, policy hash, evidence
  version, fingerprint, contract address, and explorer link.
- UI copy says "issuer-authenticated maintenance record" and does not claim that
  the contract independently observed physical maintenance.
- Transaction stages remain distinct: awaiting signature, pending, finalized,
  execution success/error, and readback confirmed.
- Durable UI state advances only after successful canonical contract readback.

## Error and recovery behavior

- Unauthorized, malformed, mismatched, stale-version, duplicate-domain, and
  invalid-transition writes revert without state changes.
- Evidence insufficiency and unsafe validator output become recorded
  `UNRESOLVED`, never approval.
- Protocol consensus failure records nothing and permits the same submitted
  revision to be evaluated again.
- Readback or frontend reconciliation failure does not resubmit a successful
  write automatically; the UI re-reads state idempotently.
- The V1 contract remains preserved as an intentionally frozen historical
  deployment. V2 is also `INTENTIONALLY_FROZEN`; a defect requires reviewed V3
  deployment and migration by reference, not privileged storage mutation.

## Required tests

Contract tests must cover:

- case validation and separate issuer/provider bindings;
- issuer-only record submission;
- deterministic canonicalization and digest recomputation;
- bounded structured arrays and attachment digest validation;
- wrong case, chain, contract, issuer, provider, asset, policy, schema, cycle,
  version, date, digest, and nonce behavior;
- replay across case/action/version and duplicate domain rejection;
- malformed, insufficient, contradictory, compliant, and affirmatively
  non-compliant validator results;
- consensus failure with no state writes;
- strictly newer revision after `UNRESOLVED`;
- terminal-state and double-evaluation rejection;
- permissionless evaluation by an unrelated wallet;
- certificate fingerprint recomputation from readback;
- no privileged upgrade or outcome override.

Frontend tests must cover:

- issuer/provider form fields and validation;
- canonical record submission mapping;
- wrong-wallet action visibility;
- digest and issuer readback rendering;
- certificate fingerprint fields;
- transaction success, execution error, and readback mismatch;
- production build with a real non-placeholder contract address.

Live Studionet evidence must include `COMPLIANT`, `NON_COMPLIANT`, `UNRESOLVED`,
unauthorized issuer, replay/digest rejection, and evaluation by an unrelated
wallet. Every transaction must be `FINALIZED`; successful promoted flows must
show execution `SUCCESS` plus post-transaction contract readback.

## Migration and deployment

V1 cannot be patched. V2 deployment therefore requires a new contract address.
The frontend must not switch addresses until the deployment transaction is
finalized, the deployed source hash matches the reviewed commit, initial
readback succeeds, and the user confirms the deployment wallet, GitHub account,
repository remote, Vercel project, and Vercel team at action time.

The repository must preserve the V1 manifest and add a separate V2 manifest.
Documentation must label V1 certificates as legacy URL-based evidence and must
not imply they have V2 issuer/digest guarantees.

## Acceptance criteria

Implementation is ready for deployment review only when:

1. All new contract behavior was developed with observed failing regression
   tests followed by passing tests.
2. Contract lint and validation pass for every public method.
3. Direct, integration, frontend unit, lint, typecheck, and production build
   commands pass.
4. A verifier can recompute the record digest and certificate fingerprint from
   contract readback without consulting the frontend.
5. No mutable URL or caller-asserted issuer can determine a certificate.
6. Failure or insufficient evidence never becomes `COMPLIANT` or
   `NON_COMPLIANT` by default.
7. README, design, recovery, deployment, and evidence documentation match the
   actual source and known limitations.
8. No push, contract deployment, or Vercel deployment occurs without the
   required action-time identity confirmation.
