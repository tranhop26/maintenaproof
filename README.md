# MaintenaProof

MaintenaProof is a GenLayer MVP for independently verifiable equipment
maintenance. An asset owner and a locked service provider cannot safely trust
each other to decide whether public service evidence satisfies a fixed policy.
The Intelligent Contract—not the UI or a backend—stores the actors, evidence
revisions, validator-agreed outcome, and certificate.

## Decision and consequence

Any wallet may ask GenLayer validators to evaluate the latest submitted public
evidence. The contract deterministically revalidates the agreed JSON against the
locked asset, provider, cycle, version, date window, and safe outcome rules.

- `COMPLIANT`: terminal state and immutable certificate fingerprint.
- `NON_COMPLIANT`: terminal state when matched evidence affirmatively proves a
  missing or failed obligation.
- `UNRESOLVED`: non-terminal safe result for missing, malformed, stale,
  mismatched, contradictory, or insufficient evidence; the provider may submit
  a strictly newer revision.
- Consensus/protocol failure: the transaction fails atomically and leaves the
  case `SUBMITTED` with no attempt written.

The full state machine is `DRAFT → SUBMITTED → COMPLIANT | NON_COMPLIANT |
UNRESOLVED`; `UNRESOLVED → SUBMITTED` permits a newer evidence revision, and an
owner may move only `DRAFT → CANCELLED`.

## Architecture

```text
Next.js UI + browser wallet
        │ read/write, no verdict logic
        ▼
Typed GenLayerJS adapter
        │ waits FINALIZED → checks execution → verifies readback
        ▼
MaintenanceProof Intelligent Contract
        ├─ authorization and state machine
        ├─ append-only evidence/replay binding
        ├─ web fetch + comparative validator consensus
        └─ attempts and certificate readback
```

The contract is `INTENTIONALLY_FROZEN`: there is no proxy, admin outcome
override, or storage migration. Recovery is a reviewed new deployment with old
addresses preserved; see [docs/RECOVERY.md](docs/RECOVERY.md).

Studionet deployment: [`0xffa5207C24e8Cd115c734eef23f2d891A4781F84`](https://explorer-studio.genlayer.com/address/0xffa5207C24e8Cd115c734eef23f2d891A4781F84), deployed in transaction [`0x25fc…34d66`](https://explorer-studio.genlayer.com/tx/0x25fc98f44aa81afafe815b06f5fadf7a6d5cff4aef1eb69d509c119f42034d66). The public manifest is under `deployments/` and the observed proof matrix is in [docs/EVIDENCE.md](docs/EVIDENCE.md).

Production frontend: [maintenaproof.vercel.app](https://maintenaproof.vercel.app).

## Setup

Requirements: Python 3.12+, Node.js 22+, and pnpm 10.

```powershell
python -m pip install -r requirements.txt
pnpm install
Copy-Item .env.example .env.local
```

Fill only the variables needed for the current operation. Never commit real
keys or tokens. The frontend requires `NEXT_PUBLIC_CONTRACT_ADDRESS` after the
contract is deployed; `NEXT_PUBLIC_GENLAYER_RPC_URL` may select the Studio RPC.

## Verify

```powershell
$env:PYTHONUTF8='1'
genvm-lint check contracts/maintenance_proof.py
pytest tests/direct -v
pytest --collect-only tests/integration -q
pnpm typecheck:deploy
pnpm --dir frontend test
pnpm --dir frontend lint
pnpm --dir frontend typecheck
pnpm --dir frontend build
```

The real Studio suites deploy and transact, so run them only with the confirmed
deployment identity and environment:

```powershell
pytest tests/integration -v
pnpm --dir frontend test:integration
```

## Run and use

```powershell
pnpm --dir frontend dev
```

Connect a wallet on Studionet. The owner creates a case; the locked provider
submits an HTTPS evidence URL on the exact configured hostname; any wallet can
request evaluation; all actors read the resulting status, attempt, and optional
certificate from the contract. The UI distinguishes disconnected, awaiting
signature, pending, finalized, execution success/error, and confirmed readback.

## Deploy

After confirming the active wallet and Studionet selection:

```powershell
pnpm deploy:contract
```

The script waits for `FINALIZED`, checks zero-case readback, and writes a public
manifest under `deployments/`. After confirming the Vercel account/team/project:

```powershell
vercel link --yes --project maintenaproof --scope tdh-s-projects --token $env:VERCEL_TOKEN
vercel deploy --prod --yes --scope tdh-s-projects --token $env:VERCEL_TOKEN
```

## Known limitations

- Evidence must be public HTTPS text on one exact hostname; authenticated or
  private maintenance systems are out of scope.
- No escrow, stake, payment, notification service, or backend account database.
- `NON_COMPLIANT` requires affirmative evidence; absence alone is never failure.
- A frozen deployment cannot be patched in place; recovery uses a new address.
- Validator output is nondeterministic by design; even apparently valid public
  evidence may safely resolve to `UNRESOLVED` rather than being approved.
