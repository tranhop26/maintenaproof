# Frozen-contract recovery

MaintenaProof is `INTENTIONALLY_FROZEN`. It has no proxy, admin override, or
storage migration method.

If a defect requires replacement, first stop new case creation in the frontend.
Preserve the old contract address and every deployment manifest so existing case
and certificate links remain resolvable. Review and deploy corrected source as a
new contract, verify its source hash and zero-case readback, then update only the
frontend contract-address environment variable. Never rewrite or present old
cases as records from the replacement contract.
