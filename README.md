# MaintenaProof

MaintenaProof V2 is a GenLayer application for evaluating an issuer-signed,
immutable service record against a policy locked by an equipment owner. The
Intelligent Contract stores the exact canonical record, its SHA-256 digest, the
validator-agreed outcome, and a recomputable certificate fingerprint.

## Decision and consequence

For one case and record revision, GenLayer decides whether the exact record
demonstrates every locked obligation, affirmatively demonstrates a missing or
failed obligation, or is insufficient or unsafe to decide.

- `COMPLIANT`: terminal; creates a digest-bound certificate fingerprint.
- `NON_COMPLIANT`: terminal; requires an affirmative missing/failed obligation.
- `UNRESOLVED`: safe and non-terminal; the issuer may submit a newer record.
- Consensus failure: atomic failure; the case remains `SUBMITTED`.

The state machine is `AWAITING_RECORD → SUBMITTED → COMPLIANT |
NON_COMPLIANT | UNRESOLVED`. An owner can cancel only while awaiting the first
record. Any wallet may request evaluation.

## Trust model

The owner binds separate issuer and provider wallets. The issuer transaction
authenticates which wallet issued the record; it does not prove the legal
identity controlling that wallet or independently prove the physical service
event. The provider identifies the party responsible for service. Validators
assess only the exact record stored on-chain—no mutable evidence URL is fetched.

The contract constructs canonical JSON from validated typed inputs and contract
context. Its replay domain binds schema, chain, contract, case, action, issuer,
version, record digest, and nonce. A certificate binds the issuer, provider,
record digest/schema/version, asset, policy hash/version, cycle, outcome,
normalized findings, and service timestamps.

See [design](docs/DESIGN.md), [recovery](docs/RECOVERY.md), and
[verification evidence](docs/EVIDENCE.md).

## Deployment status

V2 is deployed on Studionet at
[`0x5Cae…8e89`](https://explorer-studio.genlayer.com/address/0x5CaeAfaB4C12F905D9fbd37461d02AbFE4b78e89).
Its [deployment transaction](https://explorer-studio.genlayer.com/tx/0xb5b683a01a3e9a96018c023dbbf555216ca5122ee25f4a08edc0be64f8b31dc1)
is finalized, and finalized-state readback returned `case_count = 0`. The V2
frontend has not yet been promoted to the production Vercel site.

The existing Studionet contract
[`0xffa…1F84`](https://explorer-studio.genlayer.com/address/0xffa5207C24e8Cd115c734eef23f2d891A4781F84)
and [maintenaproof.vercel.app](https://maintenaproof.vercel.app) are **legacy V1**
deployments based on mutable public-URL evidence. Their certificates do not
have V2 issuer/digest guarantees. The V1 manifest remains under `deployments/`.

## Setup and verification

Requirements: Python 3.12+, Node.js 22+, and pnpm 10.

```powershell
python -m pip install -r requirements.txt
pnpm install --frozen-lockfile
$env:PYTHONUTF8='1'
genvm-lint check contracts/maintenance_proof.py
pytest tests/direct -v
pytest --collect-only tests/integration -q
pnpm typecheck:deploy
node --test deploy/receipt.test.ts
pnpm --dir frontend test
pnpm --dir frontend lint
pnpm --dir frontend typecheck
pnpm --dir frontend build
```

Real Studio tests deploy and transact and must run only after confirming the
active wallet and network:

```powershell
pytest tests/integration -v
pnpm --dir frontend test:integration
```

Never commit private keys, tokens, `.env` files, or build output.

## Run

```powershell
pnpm --dir frontend dev
```

The owner creates a case, the bound issuer submits structured service data, any
wallet requests evaluation, and readers verify the on-chain record digest and
certificate. Durable UI state advances only after `FINALIZED`, successful
execution, and authoritative readback.

## Known limitations

- Wallet issuance is not legal-identity verification or physical-event proof.
- Attachment URIs and their declared digests are stored, but V2 does not fetch
  attachment bytes or prove their content matches the digest.
- Asset hashes bind records consistently but do not independently identify
  physical equipment.
- No escrow, stake, payment, notification service, or account database.
- A frozen deployment cannot be patched; recovery requires a new address.
- Validator interpretation is nondeterministic; unsafe evidence resolves to
  `UNRESOLVED` rather than receiving a favorable default.
