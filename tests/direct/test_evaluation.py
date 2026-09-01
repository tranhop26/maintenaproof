"""Digest-bound consensus, safe outcomes, certificates, and atomicity."""

import hashlib
import json
import sys

import pytest

from tests.direct.conftest import to_hex
from tests.direct.fixtures import (
    compliant_result,
    non_compliant_result,
    unresolved_result,
)
from tests.direct.test_case_lifecycle import create_case
from tests.direct.test_evidence_submission import SUBMITTED_AT, record_args


def _read_bindings(contract):
    return json.loads(contract.get_case(0)), json.loads(contract.get_evidence(0, 0))


@pytest.fixture
def submitted_case(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    direct_vm.warp(SUBMITTED_AT)
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    create_case(contract, direct_bob, direct_charlie)
    direct_vm.sender = direct_bob
    contract.submit_service_record(0, *record_args())
    return contract


def _mock_decision(direct_vm, decision: dict | str) -> None:
    response = decision if isinstance(decision, str) else json.dumps(decision)
    direct_vm.mock_llm(r".*MAINTENANCE_RECORD_EVALUATION.*", response)


def _fingerprint_payload(certificate: dict) -> dict:
    keys = [
        "chain_id", "contract_address", "case_id", "issuer", "provider",
        "record_digest", "record_schema", "record_version", "asset_hash",
        "policy_hash", "policy_version", "cycle_id", "outcome", "completed",
        "missing", "contradictions", "service_date", "issued_at", "expires_at",
    ]
    return {key: certificate[key] for key in keys}


def test_permissionless_compliant_evaluation_issues_recomputable_certificate(
    direct_vm, submitted_case, direct_accounts
):
    case, evidence = _read_bindings(submitted_case)
    _mock_decision(direct_vm, compliant_result(case, evidence))
    evaluator = direct_accounts[3]
    direct_vm.sender = evaluator

    result = json.loads(submitted_case.evaluate(0))

    updated_case = json.loads(submitted_case.get_case(0))
    attempt = json.loads(submitted_case.get_attempt(0, 0))
    certificate = json.loads(submitted_case.get_certificate(0))
    canonical = json.dumps(
        _fingerprint_payload(certificate), sort_keys=True, separators=(",", ":")
    )
    expected_fingerprint = hashlib.sha256(canonical.encode()).hexdigest()
    assert result["outcome"] == "COMPLIANT"
    assert updated_case["status"] == "COMPLIANT"
    assert updated_case["attempt_count"] == 1
    assert attempt["evaluator"] == to_hex(evaluator)
    assert attempt["record_digest"] == evidence["record_digest"]
    assert attempt["issuer"] == case["issuer"]
    assert certificate["fingerprint"] == expected_fingerprint
    assert certificate["record_digest"] == evidence["record_digest"]
    assert certificate["policy_hash"] == case["policy_hash"]
    assert json.loads(submitted_case.get_evidence(0, 0))["evaluated"] is True


def test_affirmative_missing_obligation_is_non_compliant(direct_vm, submitted_case):
    case, evidence = _read_bindings(submitted_case)
    _mock_decision(direct_vm, non_compliant_result(case, evidence))

    result = json.loads(submitted_case.evaluate(0))

    assert result["outcome"] == "NON_COMPLIANT"
    assert json.loads(submitted_case.get_case(0))["status"] == "NON_COMPLIANT"
    with direct_vm.expect_revert("certificate unavailable"):
        submitted_case.get_certificate(0)


@pytest.mark.parametrize(
    ("field", "bad_value"),
    [
        ("case_id", 99),
        ("issuer", "0x" + "e" * 40),
        ("provider", "0x" + "f" * 40),
        ("asset_hash", "b" * 64),
        ("record_digest", "c" * 64),
        ("record_schema", "maintenaproof.service-record.v1"),
        ("record_version", 99),
        ("policy_hash", "d" * 64),
        ("policy_version", "superseded-v0"),
        ("cycle_id", "wrong-cycle"),
        ("service_date", "2026-08-14"),
        ("issued_at", "2026-08-16T10:00:01Z"),
        ("expires_at", "2026-09-30T23:59:58Z"),
    ],
)
def test_any_binding_mutation_becomes_unresolved(
    direct_vm, submitted_case, field, bad_value
):
    case, evidence = _read_bindings(submitted_case)
    decision = compliant_result(case, evidence)
    decision[field] = bad_value
    _mock_decision(direct_vm, decision)

    result = json.loads(submitted_case.evaluate(0))

    assert result["outcome"] == "UNRESOLVED"
    assert result["reason"] == "INVALID_OR_UNSAFE_RESULT"


@pytest.mark.parametrize("payload", ["not-json", "{}", "[]"])
def test_malformed_model_output_becomes_unresolved(direct_vm, submitted_case, payload):
    _mock_decision(direct_vm, payload)
    assert json.loads(submitted_case.evaluate(0))["outcome"] == "UNRESOLVED"


@pytest.mark.parametrize(
    ("field", "bad_value"),
    [
        ("issuer", None),
        ("record_version", "1"),
        ("policy_hash", None),
        ("service_date", 20260815),
        ("issued_at", []),
        ("outcome", 7),
        ("reason", None),
        ("reason", ""),
        ("reason", "r" * 1_001),
    ],
)
def test_malformed_scalar_fields_become_unresolved(
    direct_vm, submitted_case, field, bad_value
):
    case, evidence = _read_bindings(submitted_case)
    decision = compliant_result(case, evidence)
    decision[field] = bad_value
    _mock_decision(direct_vm, decision)
    assert json.loads(submitted_case.evaluate(0))["outcome"] == "UNRESOLVED"


@pytest.mark.parametrize(
    "mutation",
    [
        {"outcome": "COMPLIANT", "completed": []},
        {"outcome": "COMPLIANT", "missing": ["locked obligation"]},
        {"outcome": "COMPLIANT", "contradictions": ["conflicting reading"]},
        {
            "outcome": "NON_COMPLIANT", "completed": [], "missing": [],
            "contradictions": ["conflicting reading"],
        },
    ],
)
def test_insufficient_or_contradictory_terminal_result_becomes_unresolved(
    direct_vm, submitted_case, mutation
):
    case, evidence = _read_bindings(submitted_case)
    decision = compliant_result(case, evidence)
    decision.update(mutation)
    _mock_decision(direct_vm, decision)
    assert json.loads(submitted_case.evaluate(0))["outcome"] == "UNRESOLVED"


def test_record_expired_before_evaluation_is_recorded_unresolved_without_model(
    direct_vm, submitted_case
):
    direct_vm.warp("2026-10-01T00:00:00Z")
    # gltest 0.29 refreshes sender/chain fields after deployment but omits the
    # mutable message_raw datetime. Mirror the warped transaction context here.
    sys.modules["genlayer.gl"].message_raw["datetime"] = direct_vm._datetime

    result = json.loads(submitted_case.evaluate(0))

    assert result["outcome"] == "UNRESOLVED"
    assert result["reason"] == "EVIDENCE_EXPIRED"
    assert json.loads(submitted_case.get_attempt(0, 0))["outcome"] == "UNRESOLVED"
    assert json.loads(submitted_case.get_case(0))["status"] == "UNRESOLVED"


def test_unresolved_accepts_strictly_newer_issuer_record(
    direct_vm, submitted_case, direct_bob
):
    case, evidence = _read_bindings(submitted_case)
    _mock_decision(direct_vm, unresolved_result(case, evidence))
    submitted_case.evaluate(0)
    direct_vm.sender = direct_bob

    with direct_vm.expect_revert("invalid evidence version"):
        submitted_case.submit_service_record(0, *record_args())
    submitted_case.submit_service_record(
        0, *record_args(version=2, nonce="record-002")
    )

    case = json.loads(submitted_case.get_case(0))
    assert case["status"] == "SUBMITTED"
    assert case["evidence_count"] == 2
    assert json.loads(submitted_case.get_evidence(0, 0))["evaluated"] is True
    assert json.loads(submitted_case.get_evidence(0, 1))["evaluated"] is False


def test_evaluation_requires_submitted_case(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    create_case(contract, direct_bob, direct_charlie)
    with direct_vm.expect_revert("case is not submitted"):
        contract.evaluate(0)


@pytest.mark.parametrize("outcome", ["COMPLIANT", "NON_COMPLIANT"])
def test_terminal_case_cannot_be_evaluated_twice(direct_vm, submitted_case, outcome):
    case, evidence = _read_bindings(submitted_case)
    decision = (
        compliant_result(case, evidence)
        if outcome == "COMPLIANT"
        else non_compliant_result(case, evidence)
    )
    _mock_decision(direct_vm, decision)
    submitted_case.evaluate(0)
    with direct_vm.expect_revert("case is not submitted"):
        submitted_case.evaluate(0)


def test_missing_attempt_and_certificate_revert(direct_vm, submitted_case):
    with direct_vm.expect_revert("attempt not found"):
        submitted_case.get_attempt(0, 0)
    with direct_vm.expect_revert("certificate unavailable"):
        submitted_case.get_certificate(0)


def test_consensus_failure_writes_no_state(direct_vm, submitted_case):
    with pytest.raises(Exception):
        submitted_case.evaluate(0)

    assert json.loads(submitted_case.get_case(0))["status"] == "SUBMITTED"
    assert json.loads(submitted_case.get_case(0))["attempt_count"] == 0
    assert json.loads(submitted_case.get_evidence(0, 0))["evaluated"] is False
