# Frozen-contract recovery and V1→V2 migration

MaintenaProof contracts are `INTENTIONALLY_FROZEN`. They have no proxy, admin
outcome override, or storage migration method.

The deployed V1 address `0xffa5207C24e8Cd115c734eef23f2d891A4781F84`
uses mutable URL evidence and cannot acquire V2 guarantees. Preserve its manifest,
address, cases, certificates, and explorer links and label them legacy.

To promote V2:

1. Confirm the active Studionet deployment wallet at action time.
2. Verify the reviewed source commit and SHA-256, then deploy to a new address.
3. Require a finalized successful receipt and zero-case readback.
4. Add a separate V2 deployment manifest; never overwrite the V1 manifest.
5. Confirm GitHub account/remote before push and Vercel account/team/project
   before changing production.
6. Update the frontend address only after deployed-source matching and readback.
7. Preserve a rollback path to the prior frontend deployment and retain both
   contract addresses in documentation.

If a later V2 defect requires replacement, stop creating new cases in the UI,
preserve the affected address, review corrected source, and repeat the same
new-address process. Never rewrite old cases as records from a replacement.
