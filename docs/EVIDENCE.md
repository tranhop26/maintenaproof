# MaintenaProof verification evidence

Verification status: **V2 DEPLOYED AND PROMOTED; FINALIZED DISTINCT-ACTOR
COMPLIANT FLOW, NEGATIVE ISSUER AUTHORIZATION, DIGEST RECOMPUTATION, AND
CERTIFICATE RECOMPUTATION VERIFIED; LIVE EXPIRED-EVIDENCE SAFE DEFAULT
VERIFIED AS UNRESOLVED.**

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

## V2 live distinct-actor proof

- Production case: [case 0](https://maintenaproof.vercel.app/cases/0)
- Owner: `0x9b164C92A8528529c4B7f16378a6666fDf79CF1e`
- Issuer/provider: `0x86cd4F675eB7CC08e86243C6C9974a74e5acF049`
- Evaluator: `0xDaD75232B33D06Fab153E28E742078D7e185918f`
- Create case: [`0xbb0b…dcc0`](https://explorer-studio.genlayer.com/tx/0xbb0bf9cce3cdd343aa72992ecd400a6bf971b3ddab9ecf6122d122b6182fdcc0) — `FINALIZED`, `SUCCESS`
- Unauthorized owner submission: [`0xd8be…c27a`](https://explorer-studio.genlayer.com/tx/0xd8be95f97e694df4bc6e1d34a7a9357b9823465070e77b4506108340d0b2c27a) — `FINALIZED`, `ERROR`; readback remained `AWAITING_RECORD` with zero evidence
- Issuer submission: [`0x4da1…f9f3`](https://explorer-studio.genlayer.com/tx/0x4da125c25d1332e2376575f21f3840682f977dff0534b7997679b139dc9bf9f3) — `FINALIZED`, `SUCCESS`
- Evaluation: [`0x2f35…ce62`](https://explorer-studio.genlayer.com/tx/0x2f35de10ce699c8f4f30b595a2e56b84dd70b7308d96b70365a576b8c0a8ce62) — `FINALIZED`, `SUCCESS`, `COMPLIANT`
- Stored and independently recomputed record digest: `39bc57ba9f516c4cf2d94fbdd2fac95c02dd1abbb80bf50124dfcd399b352e6e`
- Stored and independently recomputed certificate fingerprint: `133f202c2c92b9e7a0886bb93de77422d4ee5c66c3951aa0bf97df71f4c70b24`
- Final readback: `case_count = 1`, case status `COMPLIANT`, evidence `evaluated = true`

## V2 live safe-default proof

- Production case: [case 1](https://maintenaproof.vercel.app/cases/1)
- Owner: `0xd4C4473581315dbe9a8b7874438ac6f9798B51F5`
- Issuer/provider: `0x771CDDa91db42d81Fb17fA6Fc6F133d336D7823D`
- Evaluator: `0xC3a69B7A6cBb0E3eF83e109d3E7201803a8B815c`
- Create case: [`0x5f84…6f8d`](https://explorer-studio.genlayer.com/tx/0x5f84238a774a543e6d5de8a8e2e2874a4089f59951c8eb522061f08554c26f8d) — `FINALIZED`, `SUCCESS`
- Issuer submission: [`0xc780…8a4d`](https://explorer-studio.genlayer.com/tx/0xc780f83627308c9c02a45216ea11799e2b78fcfa8dead0244bdfdc8293dc8a4d) — `FINALIZED`, `SUCCESS`
- Evaluation: [`0xac6c…0ada`](https://explorer-studio.genlayer.com/tx/0xac6cdc53b5c27a25d544902a9777f1f46483cef3917105780df4858e87ca0ada) — `FINALIZED`, `SUCCESS`, `UNRESOLVED`
- Safe-default reason: `EVIDENCE_EXPIRED`; the evidence expired at `2026-09-02T02:14:45Z` before evaluation.
- Stored and independently recomputed record digest: `7b9f72563c4dcbdeb7e6a3e7525e55f37fcf4f240f8fe1bbc228989639f985cb`
- Final readback: `case_count = 2`, case status `UNRESOLVED`, evidence `evaluated = true`, certificate fingerprint empty, and `get_certificate` unavailable.

## V2 proof matrix

| Claim | Current evidence | External evidence required before promotion |
|---|---|---|
| Owner locks issuer, provider, policy hash, cycle, and schema | Direct tests plus finalized `create_case` readback | Verified |
| Only issuer can submit | Finalized unauthorized execution failure plus unchanged readback | Verified |
| Exact record bytes are immutable and digest-recomputable | Finalized submission plus independent SHA-256 recomputation | Verified |
| Verdict binds issuer/digest/schema/policy/timestamps | Finalized evaluation plus attempt readback | Verified |
| Certificate is independently recomputable | Compliant transaction plus independent fingerprint recomputation | Verified |
| Expired/unsafe evidence cannot receive a favorable default | Finalized expired-evidence evaluation, `EVIDENCE_EXPIRED` attempt readback, and direct tests | Verified with live `UNRESOLVED` case |
| Frontend does not fabricate durable success | Production compliant certificate and unresolved no-certificate readbacks match contract evidence | Verified for compliant and safe-default flows |

Current checkpoints on 2026-09-02:

- Contract lint and validation: pass; 9 public methods.
- Direct contract tests: 86 passed, including independent recomputation vectors.
- Frontend tests: 36 passed; 2 environment-gated live tests skipped.
- Frontend lint, typecheck, and production build: pass.
- Studionet integration suite: 2 environment-gated tests collect successfully.
- V2 deployment, the four-transaction compliant actor flow, and the
  three-transaction expired-evidence flow are finalized. Production renders the
  authoritative compliant certificate and the `UNRESOLVED` no-certificate case.

## Legacy V1 evidence

The existing address
[`0xffa…1F84`](https://explorer-studio.genlayer.com/address/0xffa5207C24e8Cd115c734eef23f2d891A4781F84),
deployment transaction
[`0x25fc…34d66`](https://explorer-studio.genlayer.com/tx/0x25fc98f44aa81afafe815b06f5fadf7a6d5cff4aef1eb69d509c119f42034d66),
and historical transactions in the previous evidence package prove only the V1
URL-based workflow. They do not prove issuer authentication, immutable evidence
bytes, digest-bound verdicts, or V2 certificate fields. The production site has
since been promoted to the separately deployed V2 address documented above.

## Remaining evidence

The principal review request and the promoted compliant, negative authorization,
and safe `UNRESOLVED` branches now have finalized live evidence. The limitations
below remain explicit and are not claimed as solved by these flows.

## Known limitations

- Issuer wallet authentication is not legal-identity verification.
- The contract does not observe or prove the physical maintenance event.
- Attachment bytes are not fetched or checked against declared digests.
- Asset hashes do not independently prove physical equipment identity.
- A frozen deployment requires a new address for fixes.
