# MaintenaProof design

MaintenaProof lets an equipment owner lock a maintenance policy while a named
service provider supplies public evidence. Neither party controls the verdict:
GenLayer validators fetch the bound evidence and the Intelligent Contract
stores the authoritative result.

## Trust and decision

| Actor | Cannot trust | Can manipulate | Contract defense |
|---|---|---|---|
| Owner | Provider | Policy and asset reference | Lock policy, asset hash, provider, hostname and cycle at case creation |
| Provider | Owner | Evidence URL and revision | Provider-only submission; strictly increasing versions; validator judgment |
| Evaluator | Both parties | Call timing and replay | Permissionless evaluation of one submitted revision; terminal writes rejected |
| Verifier | Frontend | Displayed result | Canonical contract readback and certificate fingerprint |

The decision is whether the latest public report proves every locked
maintenance obligation for the bound asset, provider, cycle, policy version and
evidence revision.

- `COMPLIANT`: terminal certificate and decision fingerprint.
- `NON_COMPLIANT`: terminal rejection only when evidence affirmatively proves a
  missing obligation.
- `UNRESOLVED`: safe, non-terminal result for unavailable, malformed,
  mismatched, contradictory or insufficient evidence.
- Protocol consensus failure: the transaction writes no attempt or state
  transition; the case remains `SUBMITTED`.

No owner, provider, evaluator, frontend or backend method can select or rewrite
an outcome.

## Evidence binding

Each revision binds the chain, contract, case, action, asset hash, provider,
hostname, policy and version, maintenance cycle, evidence URL and monotonically
increasing evidence version. The public report supplies its service observation
date and report issue date; both must fall inside the immutable cycle window.
The submission transaction supplies the on-chain submission time.

Replay protection is
`sha256(chain_id | contract_address | case_id | version | evidence_url)`.
Validators compare all decision-bearing fields semantically. The contract
normalizes the agreed result and stores a fingerprint that excludes only free
form reason wording. Evidence failure never defaults to approval.

## State machine

| From | Actor | Method | To | Replay behavior |
|---|---|---|---|---|
| none | Owner | `create_case` | `DRAFT` | New case ID |
| `DRAFT` | Owner | `cancel_case` | `CANCELLED` | Rejected after cancellation |
| `DRAFT` | Provider | `submit_evidence` | `SUBMITTED` | Duplicate or old revision rejected |
| `UNRESOLVED` | Provider | `submit_evidence` | `SUBMITTED` | Requires a strictly newer revision |
| `SUBMITTED` | Any wallet | `evaluate` | `COMPLIANT`, `NON_COMPLIANT`, or `UNRESOLVED` | Evaluated or terminal revision rejected |

The frontend waits for `FINALIZED`, checks execution success, then confirms the
expected transition through contract readback. It never advances durable state
optimistically and contains no production sample records.

## Recovery and scope

The contract is `INTENTIONALLY_FROZEN`: no proxy, admin override or privileged
storage rewrite exists. Recovery deploys reviewed source to a new address while
preserving the old address and manifests; see `docs/RECOVERY.md`.

The MVP has no escrow, stake, payment, backend adjudicator, private evidence,
notification service or off-chain account database. Asset hashes bind records
consistently but do not independently prove physical equipment identity.
