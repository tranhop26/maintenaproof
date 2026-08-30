# MaintenaProof verification evidence

Verification status: **CONTRACT AND LIVE FLOWS VERIFIED; VERCEL PENDING** because
`VERCEL_TOKEN` is not present in the execution environment.

## Actor-to-readback matrix

| Actor | Action | Contract method | Transaction | Result | Authoritative readback | Source/test |
|---|---|---|---|---|---|---|
| Owner `0xD300…Feb7A` | Create locked case 0 | `create_case` | [`0x169d…09d03`](https://explorer-studio.genlayer.com/tx/0x169d982cb7b1b1a74665db19f99a6094b723901ad7c6f08b1c43c72064409d03) | `FINALIZED`, success | case 0 `DRAFT` | `frontend/tests/integration/live-contract-flow.test.ts` |
| Provider `0xb480…48F17` | Submit evidence v1 | `submit_evidence` | [`0x986c…d01f`](https://explorer-studio.genlayer.com/tx/0x986c6140111cae88fc815202e3ff3e1c162195824fd248f68cd20b1aaa3fd01f) | `FINALIZED`, success | case 0 `SUBMITTED`, evidence v1 | `frontend/tests/integration/live-contract-flow.test.ts` |
| Evaluator `0xC80E…C2722` | Request decision | `evaluate` | [`0x03e5…3394a`](https://explorer-studio.genlayer.com/tx/0x03e591f56db57e54c896115fff94e9fea8baab1c63b38a57aa3de2c5ef03394a) | `FINALIZED`, success | case 0 `COMPLIANT`; fingerprint `4dcc133b…53fc3d` | `frontend/tests/integration/live-contract-flow.test.ts` |
| Reader | Verify certificate | `get_certificate(0)` | Read-only | successful | contract address, policy, evidence v1 and fingerprint all match | CLI readback + live adapter test |
| Owner `0x68cc…17E67` | Create authorization-test case 1 | `create_case` | [`0x227b…3fcf2`](https://explorer-studio.genlayer.com/tx/0x227b94d98d70f690557de4b81472fac38154e13981e1bcf89fb1223e83f3fcf2) | `FINALIZED`, success | case 1 `DRAFT` | `frontend/tests/integration/live-contract-flow.test.ts` |
| Unauthorized owner | Attempt provider-only submission | `submit_evidence` | [`0xb210…0e9f3`](https://explorer-studio.genlayer.com/tx/0xb210c9e631afeafcf69a80c8a506dc8576ddcbfaf48c646dd01fc4c6b510e9f3) | `FINALIZED`, execution error `only provider` | case 1 remains `DRAFT`; evidence count remains 0 | `frontend/tests/integration/live-contract-flow.test.ts` |

## Source and deployment identity

- Repository: <https://github.com/tranhop26/maintenaproof>
- Deployed source commit: `27fa37d01f24c8804b1c65caa7e2941feba65b5d`
- Verified receipt/live-test implementation commit: `93620903ebceb380b6b5480e7e257e56042ec4d2` (local, pending the required push confirmation).
- Contract source SHA-256: `446022445b74eaff650e56d6837aa91896681d4ba3247028355cc2c57f66cb70`
- Transaction-embedded source SHA-256: exact match.
- Classification: `INTENTIONALLY_FROZEN`.
- Contract: [`0xffa5207C24e8Cd115c734eef23f2d891A4781F84`](https://explorer-studio.genlayer.com/address/0xffa5207C24e8Cd115c734eef23f2d891A4781F84)
- Deployment: [`0x25fc98f44aa81afafe815b06f5fadf7a6d5cff4aef1eb69d509c119f42034d66`](https://explorer-studio.genlayer.com/tx/0x25fc98f44aa81afafe815b06f5fadf7a6d5cff4aef1eb69d509c119f42034d66), `FINALIZED`, `MAJORITY_AGREE`.
- Deployment manifest: `deployments/studionet-0xffa5207c24e8cd115c734eef23f2d891a4781f84.json`.
- Initial readback: `case_count = 0`; post-live-flow readback: `case_count = 2`.
- Vercel URL: pending; no token was available, so no deployment is claimed.

## Verification results

Observed on 2026-08-30:

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
- A frozen deployment cannot be patched in place; recovery uses a new address.
- Vercel production and browser QA against that public URL remain unverified
  until the environment supplies `VERCEL_TOKEN`.
