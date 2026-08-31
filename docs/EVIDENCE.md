# MaintenaProof verification evidence

Verification status: **CONTRACT, LIVE FLOWS, AND PRODUCTION FRONTEND VERIFIED**.

## Actor-to-readback matrix

| Actor | Action | Contract method | Transaction | Result | Authoritative readback | Source/test |
|---|---|---|---|---|---|---|
| Owner `0xD300…Feb7A` | Create locked case 0 | `create_case` | [`0x169d…09d03`](https://explorer-studio.genlayer.com/tx/0x169d982cb7b1b1a74665db19f99a6094b723901ad7c6f08b1c43c72064409d03) | `FINALIZED`, success | case 0 `DRAFT` | `frontend/tests/integration/live-contract-flow.test.ts` |
| Provider `0xb480…48F17` | Submit evidence v1 | `submit_evidence` | [`0x986c…d01f`](https://explorer-studio.genlayer.com/tx/0x986c6140111cae88fc815202e3ff3e1c162195824fd248f68cd20b1aaa3fd01f) | `FINALIZED`, success | case 0 `SUBMITTED`, evidence v1 | `frontend/tests/integration/live-contract-flow.test.ts` |
| Evaluator `0xC80E…C2722` | Request decision | `evaluate` | [`0x03e5…3394a`](https://explorer-studio.genlayer.com/tx/0x03e591f56db57e54c896115fff94e9fea8baab1c63b38a57aa3de2c5ef03394a) | `FINALIZED`, success | case 0 `COMPLIANT`; fingerprint `4dcc133b…53fc3d` | `frontend/tests/integration/live-contract-flow.test.ts` |
| Reader | Verify certificate | `get_certificate(0)` | Read-only | successful | contract address, policy, evidence v1 and fingerprint all match | CLI readback + live adapter test |
| Owner `0x68cc…17E67` | Create authorization-test case 1 | `create_case` | [`0x227b…3fcf2`](https://explorer-studio.genlayer.com/tx/0x227b94d98d70f690557de4b81472fac38154e13981e1bcf89fb1223e83f3fcf2) | `FINALIZED`, success | case 1 `DRAFT` | `frontend/tests/integration/live-contract-flow.test.ts` |
| Unauthorized owner | Attempt provider-only submission | `submit_evidence` | [`0xb210…0e9f3`](https://explorer-studio.genlayer.com/tx/0xb210c9e631afeafcf69a80c8a506dc8576ddcbfaf48c646dd01fc4c6b510e9f3) | `FINALIZED`, execution error `only provider` | case 1 remains `DRAFT`; evidence count remains 0 | `frontend/tests/integration/live-contract-flow.test.ts` |
| Browser wallet `0x21b4…2eC7` | Create production-UI case 2 | `create_case` | [`0xa94f…585f6`](https://explorer-studio.genlayer.com/tx/0xa94f4f583741b0157c3771afe2682d0314a0b8e953548378cdbd146369d585f6) | `FINALIZED`, success | case 2 `DRAFT`; owner/provider and immutable bindings match | production browser + CLI readback |
| Browser wallet `0x21b4…2eC7` | Submit wrong-host evidence | client validation before `submit_evidence` | No transaction created | submit disabled | case 2 remains `DRAFT`; evidence count remains 0 | production browser validation |
| Provider `0x21b4…2eC7` | Submit deliberately mismatched public evidence v1 | `submit_evidence` | [`0x2bc3…8085`](https://explorer-studio.genlayer.com/tx/0x2bc3ce539836a518b5baf08baec9edfc963bb047a1db2a448b0bc63189708085) | `FINALIZED`, `SUCCESS` | case 2 `SUBMITTED`; evidence v1; replay domain `a8b370a8…dc88f` | production browser + SDK receipt/readback |
| Evaluator `0x21b4…2eC7` | Evaluate mismatched evidence | `evaluate` | [`0xe446…7f05`](https://explorer-studio.genlayer.com/tx/0xe446948082e92acdd1128d5c9f9f4db7e9e6aacc4477e7dafdc2425392c37f05) | `FINALIZED`, `SUCCESS` | case 2 `UNRESOLVED`; reason `INVALID_OR_UNSAFE_RESULT`; fingerprint `6618c912…a5f3` | production browser + SDK receipt/readback |

## Source and deployment identity

- Repository: <https://github.com/tranhop26/maintenaproof>
- Deployed source commit: `27fa37d01f24c8804b1c65caa7e2941feba65b5d`
- Verified application commit before this evidence-only cleanup: `ef75442036c3cc439be9e084592e9d1169ea8ba3`. The exact submission commit is the immutable Git commit containing this file and is reported with the delivery links.
- Contract source SHA-256: `446022445b74eaff650e56d6837aa91896681d4ba3247028355cc2c57f66cb70`
- Transaction-embedded source SHA-256: exact match.
- Classification: `INTENTIONALLY_FROZEN`.
- Contract: [`0xffa5207C24e8Cd115c734eef23f2d891A4781F84`](https://explorer-studio.genlayer.com/address/0xffa5207C24e8Cd115c734eef23f2d891A4781F84)
- Deployment: [`0x25fc98f44aa81afafe815b06f5fadf7a6d5cff4aef1eb69d509c119f42034d66`](https://explorer-studio.genlayer.com/tx/0x25fc98f44aa81afafe815b06f5fadf7a6d5cff4aef1eb69d509c119f42034d66), `FINALIZED`, `MAJORITY_AGREE`.
- Deployment manifest: `deployments/studionet-0xffa5207c24e8cd115c734eef23f2d891a4781f84.json`.
- Initial readback: `case_count = 0`; current readback: `case_count = 3`, including case 0 `COMPLIANT` and case 2 `UNRESOLVED`.
- Vercel project/team: `maintenaproof` / `tdh-s-projects`.
- Production URL: <https://maintenaproof.vercel.app>.
- Production deployment is performed from the confirmed submission commit with `VERCEL_TOKEN`, checked `READY`, and aliased to the stable production URL. Deployment-specific ID and inspector URL are reported with the delivery links so this file does not become stale after an evidence-only deployment.

## Verification results

Observed on 2026-08-30 and rechecked on 2026-08-31:

- Contract lint: pass (3 checks); contract validation pass (9 public methods).
- Direct contract tests: 68 passed.
- Python Studionet integration: 2 passed in 198.62 s.
- Frontend tests: 25 passed; environment-gated live tests run separately.
- Frontend live adapter happy path: 1 passed in 189.33 s against the deployed contract.
- Frontend live authorization error: 1 passed in 79.38 s against the deployed contract.
- Deployment TypeScript typecheck: pass.
- Frontend lint, typecheck and production build: pass.
- Secret scan: 0 matches.
- Local responsive browser QA: desktop and 375×812, no horizontal overflow,
  console errors, or fabricated cases in unconfigured mode.
- Production browser QA: connected wallet `0x21b4…2eC7`; real contract readback;
  successful create and evidence transactions; wrong-host validation branch;
  live `UNRESOLVED` evaluation; 375×812 with no horizontal overflow; no
  application console errors.

Python Studionet integration exercises valid and mismatched evidence. Because
validator output is nondeterministic, valid evidence may produce either a
certificate or the safe `UNRESOLVED` fallback; mismatched evidence must be
`UNRESOLVED`. The strict `COMPLIANT` path is proven by the frontend live adapter
transactions and certificate readback above.

## Known limitations

- Public HTTPS evidence only; authenticated/private maintenance systems are out
  of scope.
- No escrow, stake, payment, notification service, or backend account database.
- Declared asset hashes bind records but do not independently prove physical
  equipment identity.
- `NON_COMPLIANT` requires affirmative evidence; absence alone is never failure.
- `NON_COMPLIANT` is covered by direct tests but does not have a fixed live
  Studionet transaction in this evidence package.
- A frozen deployment cannot be patched in place; recovery uses a new address.
