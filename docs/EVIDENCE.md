# MaintenaProof verification evidence

Verification status: **V2 LOCAL REVIEW IN PROGRESS; DEPLOYMENT NOT AUTHORIZED OR
PERFORMED**.

## V2 proof matrix

| Claim | Current evidence | External evidence required before promotion |
|---|---|---|
| Owner locks issuer, provider, policy hash, cycle, and schema | Direct lifecycle tests | Finalized `create_case` transaction and readback |
| Only issuer can submit | Direct authorization tests and collectable live negative test | Finalized unauthorized execution failure; unchanged readback |
| Exact record bytes are immutable and digest-recomputable | Canonical record/digest direct tests | Finalized submission plus `get_evidence` recomputation |
| Verdict binds issuer/digest/schema/policy/timestamps | Binding-mutation and safe-normalization direct tests | Finalized evaluation plus attempt readback |
| Certificate is independently recomputable | Direct certificate vector | Compliant transaction and certificate recomputation |
| Expired/unsafe evidence cannot receive a favorable default | Expiry, malformed, contradictory, and consensus-failure direct tests | `UNRESOLVED` live observation |
| Frontend does not fabricate durable success | Adapter execution/readback tests | Production wallet flow and explorer/readback comparison |

Current local checkpoints on 2026-09-01:

- Contract lint and validation: pass; 9 public methods.
- Direct contract tests: 86 passed, including independent recomputation vectors.
- Frontend tests: 36 passed; 2 environment-gated live tests skipped.
- Frontend lint, typecheck, and production build: pass.
- Studionet integration suite: collection pending final full verification; no
  V2 deployment transactions have been created.

## Legacy V1 evidence

The existing address
[`0xffa…1F84`](https://explorer-studio.genlayer.com/address/0xffa5207C24e8Cd115c734eef23f2d891A4781F84),
deployment transaction
[`0x25fc…34d66`](https://explorer-studio.genlayer.com/tx/0x25fc98f44aa81afafe815b06f5fadf7a6d5cff4aef1eb69d509c119f42034d66),
and historical transactions in the previous evidence package prove only the V1
URL-based workflow. They do not prove issuer authentication, immutable evidence
bytes, digest-bound verdicts, or V2 certificate fields. The existing production
site is likewise legacy until a separately confirmed V2 promotion.

## Evidence required after authorization

Before calling V2 deployed or production-ready, record the exact reviewed
commit/source hash, deployment wallet, contract address, deployment transaction,
manifest, zero-case readback, actor transaction hashes, execution results,
record digest recomputation, certificate fingerprint recomputation, GitHub
remote/account, and Vercel team/project/deployment. Every promoted transaction
must be `FINALIZED` with successful execution and matching post-transaction
readback.

## Known limitations

- Issuer wallet authentication is not legal-identity verification.
- The contract does not observe or prove the physical maintenance event.
- Attachment bytes are not fetched or checked against declared digests.
- Asset hashes do not independently prove physical equipment identity.
- A frozen deployment requires a new address for fixes.
