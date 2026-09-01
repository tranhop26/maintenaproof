"""Independent V2 digest and certificate recomputation vectors."""

import hashlib
import json

from tests.direct.fixtures import compliant_result
from tests.direct.test_case_lifecycle import VALID_POLICY, create_case
from tests.direct.test_evaluation import _mock_decision
from tests.direct.test_evidence_submission import SUBMITTED_AT, record_args


def _sha(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def _canonical(value: dict) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def test_all_v2_hashes_recompute_from_authoritative_readback_and_are_sensitive(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    direct_vm.warp(SUBMITTED_AT)
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    create_case(contract, direct_bob, direct_charlie)
    direct_vm.sender = direct_bob
    contract.submit_service_record(0, *record_args())
    case = json.loads(contract.get_case(0))
    evidence = json.loads(contract.get_evidence(0, 0))

    assert case["policy_hash"] == _sha(VALID_POLICY)
    assert evidence["record_digest"] == _sha(evidence["record_json"])
    replay_parts = [
        case["record_schema"],
        str(json.loads(evidence["record_json"])["chain_id"]),
        json.loads(evidence["record_json"])["contract_address"],
        str(case["id"]),
        "ISSUE_SERVICE_RECORD",
        case["issuer"],
        str(evidence["version"]),
        evidence["record_digest"],
        evidence["nonce"],
    ]
    assert evidence["replay_domain"] == _sha("|".join(replay_parts))

    _mock_decision(direct_vm, compliant_result(case, evidence))
    contract.evaluate(0)
    certificate = json.loads(contract.get_certificate(0))
    fingerprint_fields = [
        "chain_id", "contract_address", "case_id", "issuer", "provider",
        "record_digest", "record_schema", "record_version", "asset_hash",
        "policy_hash", "policy_version", "cycle_id", "outcome", "completed",
        "missing", "contradictions", "service_date", "issued_at", "expires_at",
    ]
    payload = {key: certificate[key] for key in fingerprint_fields}
    assert certificate["fingerprint"] == _sha(_canonical(payload))

    for key in fingerprint_fields:
        mutated = dict(payload)
        value = mutated[key]
        if isinstance(value, int):
            mutated[key] = value + 1
        elif isinstance(value, list):
            mutated[key] = value + ["mutation"]
        else:
            mutated[key] = value + "-mutation"
        assert _sha(_canonical(mutated)) != certificate["fingerprint"], key
