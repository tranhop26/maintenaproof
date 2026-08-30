# MaintenaProof verification evidence

Verification status: **INCOMPLETE — external actions not yet authorized or
executed.**

## Actor-to-readback matrix

| Actor | Action | Contract method | Transaction hash | FINALIZED / execution | Readback | Source/test |
|---|---|---|---|---|---|---|
| Owner | Create locked case | `create_case` | Not yet executed | Not yet executed | Not yet executed | `tests/direct/test_case_lifecycle.py` |
| Locked provider | Submit evidence revision | `submit_evidence` | Not yet executed | Not yet executed | Not yet executed | `tests/direct/test_evidence_submission.py` |
| Unrelated evaluator | Request semantic decision | `evaluate` | Not yet executed | Not yet executed | Not yet executed | `tests/direct/test_evaluation.py` |
| Reader | Read compliant certificate | `get_certificate` | Read-only; not yet executed live | Not yet verified live | Not yet executed | `frontend/tests/components/certificate-card.test.tsx` |
| Unauthorized actor | Attempt provider-only submission | `submit_evidence` | Not yet executed | Not yet executed | State preservation not yet verified live | `tests/direct/test_evidence_submission.py` |

## Source and deployment identity

- Repository URL: Not yet created or confirmed.
- Source commit: Not yet finalized for external action.
- Contract source SHA-256: Not yet recorded from an authorized deployment.
- Deployment manifest: Not yet emitted.
- Contract address: Not yet deployed.
- Deployment transaction: Not yet executed.
- Explorer source correspondence: Not yet verified.
- Vercel URL: Not yet deployed.

## Fixed verification commands

The following must be rerun immediately before completion and their observed
results recorded here:

```powershell
genvm-lint check contracts/maintenance_proof.py
pytest tests/direct -v
pytest tests/integration -v
pnpm typecheck:deploy
pnpm --dir frontend test
pnpm --dir frontend test:integration
pnpm --dir frontend lint
pnpm --dir frontend typecheck
pnpm --dir frontend build
```

Current pre-deployment local results (2026-08-30):

- Contract lint: pass, 3 checks; contract validation pass, 9 public methods.
- Direct contract tests: 68 passed.
- Studio integration suite: 2 tests collected; intentionally not executed
  before deployment authorization because they create on-chain state.
- Deployment TypeScript typecheck: pass.
- Frontend tests: 24 passed, 1 live test skipped because deployment environment
  is intentionally absent.
- Frontend lint and typecheck: pass.
- Next.js production build: pass for `/`, `/cases/new`, and `/cases/[id]`.
- Local responsive browser QA: checked at desktop and 375×812; no horizontal
  overflow or console errors, and unconfigured state showed no sample records.

Live happy-path and important-error-path rows remain `Not yet executed` until
observed through the deployed frontend and contract.

## Known limitations

See the concise list in `README.md`. Any promoted path not exercised live will
remain explicitly listed as unverified rather than being marked complete.
