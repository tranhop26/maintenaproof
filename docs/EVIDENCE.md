# MaintenaProof verification evidence

Verification status: **V2 DEPLOYED TO STUDIONET; DEPLOYMENT FINALIZED AND
ZERO-CASE READBACK VERIFIED. LIVE ACTOR-FLOW EVIDENCE IS STILL PENDING.**

## V2 Studionet deployment

- Contract: [`0x5Cae…8e89`](https://explorer-studio.genlayer.com/address/0x5CaeAfaB4C12F905D9fbd37461d02AbFE4b78e89)
- Deployment transaction: [`0xb5b6…31dc1`](https://explorer-studio.genlayer.com/tx/0xb5b683a01a3e9a96018c023dbbf555216ca5122ee25f4a08edc0be64f8b31dc1)
- Deployer: `0x21b45103dd05c43969daF3CbB4277391777e2eC7`
- Network: Studionet, chain `61999`
- Finalized readback: `case_count = 0`
- Reviewed commit: `a54523b630f76f6ac4c40f87dbb1622677240f9a`
- Reviewed source SHA-256: `8dfa67c391611303b2cc4217e0754bac79ae59588e93ca2bf87d10ee4f3a9829`
- Explorer source SHA-256 after LF normalization: `4e19a9eeea0d4d9a568f55bee916405d134f1479632af4bfb97d5b54872e8793`
- Manifest: `deployments/studionet-0x5caeafab4c12f905d9fbd37461d02abfe4b78e89.json`

## V2 frontend promotion

- GitHub branch: [`feat/immutable-evidence-v2`](https://github.com/tranhop26/maintenaproof/tree/feat/immutable-evidence-v2)
- Vercel project: `tdh-s-projects/maintenaproof`
- Production deployment: `dpl_8bwVwxdxE9zQ7MVndjSFwEnoySuV` (`READY`)
- Production site: [maintenaproof.vercel.app](https://maintenaproof.vercel.app)
- Public contract configuration: `0x5CaeAfaB4C12F905D9fbd37461d02AbFE4b78e89`
- Production readback: dashboard displayed `0 ON-CHAIN RECORDS` and no
  fabricated fallback data; V2 create-case fields rendered successfully.

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
- Studionet integration suite: 2 environment-gated tests collect successfully.
- V2 deployment is finalized and its zero-case readback is verified. The live
  actor-flow evidence listed below has not yet been created.

## Legacy V1 evidence

The existing address
[`0xffa…1F84`](https://explorer-studio.genlayer.com/address/0xffa5207C24e8Cd115c734eef23f2d891A4781F84),
deployment transaction
[`0x25fc…34d66`](https://explorer-studio.genlayer.com/tx/0x25fc98f44aa81afafe815b06f5fadf7a6d5cff4aef1eb69d509c119f42034d66),
and historical transactions in the previous evidence package prove only the V1
URL-based workflow. They do not prove issuer authentication, immutable evidence
bytes, digest-bound verdicts, or V2 certificate fields. The existing production
site is likewise legacy until a separately confirmed V2 promotion.

## Remaining evidence before production promotion

Before calling V2 production-ready, record the actor transaction hashes,
execution results, record digest recomputation, certificate fingerprint
recomputation, GitHub remote/account, and Vercel team/project/deployment. Every
promoted transaction must be `FINALIZED` with successful execution and matching
post-transaction readback.

## Known limitations

- Issuer wallet authentication is not legal-identity verification.
- The contract does not observe or prove the physical maintenance event.
- Attachment bytes are not fetched or checked against declared digests.
- Asset hashes do not independently prove physical equipment identity.
- A frozen deployment requires a new address for fixes.
