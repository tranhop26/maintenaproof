# MaintenaProof V2 design

## Trust and decision

| Actor | Manipulation capability | Contract defense |
|---|---|---|
| Owner | Selects asset, issuer, provider, policy, and cycle | Bind all fields and the policy digest at creation |
| Issuer | Can make unsupported service claims | Sender-authenticated issuance, bounded canonical record, semantic validator review, no favorable default |
| Provider | May differ from the issuer | Store service responsibility separately from record issuance |
| Evaluator | Can time or repeat calls | Permissionless evaluation; deterministic expiry; terminal/evaluated revisions reject repeats |
| Validators | Can receive malformed or misleading claims | Evaluate exact stored JSON; normalize every identity/digest field; unsafe output becomes `UNRESOLVED` |
| Frontend | Could display fabricated data | Read record, attempt, and certificate from the contract and expose recomputable digests |

The decision is whether the exact canonical record issued by the locked issuer
demonstrates every obligation in the locked policy, affirmatively demonstrates
a missing/failed obligation, or is insufficient/unsafe. No actor-facing method
accepts an outcome.

## Record and replay binding

`submit_service_record` accepts service date, UTC issuance/expiry timestamps,
nonce, completed actions, measurements, attachment references/digests, and
notes. The contract supplies chain ID, contract address, case ID, issuer,
provider, asset, policy hash/version, cycle, schema, action, and version. It
stores the exact canonical JSON and computes `sha256(record_json)`.

Replay protection is:

```text
sha256(
  record_schema | chain_id | contract_address | case_id |
  ISSUE_SERVICE_RECORD | issuer | version | record_digest | nonce
)
```

Transaction time comes from `gl.message_raw["datetime"]`. Submission rejects
future-issued, already-expired, or out-of-cycle records. Expiry before evaluation
is deterministically recorded as `UNRESOLVED / EVIDENCE_EXPIRED` without model
evaluation.

Validators receive the exact stored record JSON, record digest, policy,
submission time, and evaluation time. They do not fetch a URL. Every identity,
digest, schema, version, and timestamp in their result must exactly match storage.

## Certificate binding

For a compliant result, the fingerprint is SHA-256 of canonical JSON containing
chain ID, contract address, case ID, issuer, provider, record digest/schema/
version, asset hash, policy hash/version, cycle, outcome, completed/missing/
contradiction findings, service date, issued time, and expiry time. Free-form
reason wording is excluded. `get_certificate` exposes every fingerprint field.

## State machine

| From | Actor | Method | To |
|---|---|---|---|
| none | Owner | `create_case` | `AWAITING_RECORD` |
| `AWAITING_RECORD` | Owner | `cancel_case` | `CANCELLED` |
| `AWAITING_RECORD` | Issuer | `submit_service_record` | `SUBMITTED` |
| `UNRESOLVED` | Issuer | `submit_service_record` with newer version | `SUBMITTED` |
| `SUBMITTED` | Any wallet | `evaluate` | `COMPLIANT`, `NON_COMPLIANT`, or `UNRESOLVED` |

`COMPLIANT`, `NON_COMPLIANT`, and `CANCELLED` are terminal. The frontend waits
for finalization, checks execution success, and verifies the transition through
readback.

## Scope

The issuer is a wallet selected by the owner, not a verified company identity.
Attachments are digest-referenced but their bytes are not fetched or verified.
The contract is `INTENTIONALLY_FROZEN`; there is no proxy, outcome override, or
privileged storage rewrite.
