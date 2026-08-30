"""Consensus evaluation, safe outcome, certificate, and atomicity tests."""

import json

import pytest

from tests.direct.conftest import to_hex
from tests.direct.fixtures import (
    compliant_result,
    non_compliant_result,
    unresolved_result,
)
from tests.direct.test_case_lifecycle import VALID_POLICY


VALID_URL = "https://httpbin.org/base64/maintenance-report-v1"


@pytest.fixture
def submitted_case(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    contract.create_case(
        "a" * 64,
        to_hex(direct_bob),
        "httpbin.org",
        VALID_POLICY,
        "hvac-v1",
        "cycle-2026-q3",
        "2026-07-01",
        "2026-09-30",
    )
    direct_vm.sender = direct_bob
    contract.submit_evidence(0, VALID_URL, 1)
    return contract


def _mock_decision(direct_vm, decision: dict | str) -> None:
    direct_vm.mock_web(
        r".*httpbin\.org/base64/maintenance-report.*",
        {"status": 200, "body": "Locked maintenance report body"},
    )
    response = decision if isinstance(decision, str) else json.dumps(decision)
    direct_vm.mock_llm(r".*MAINTENANCE_EVALUATION.*", response)


def test_permissionless_compliant_evaluation_issues_certificate(
    direct_vm, submitted_case, direct_bob, direct_charlie
):
    _mock_decision(direct_vm, compliant_result(to_hex(direct_bob)))
    direct_vm.sender = direct_charlie

    result = json.loads(submitted_case.evaluate(0))

    case = json.loads(submitted_case.get_case(0))
    attempt = json.loads(submitted_case.get_attempt(0, 0))
    certificate = json.loads(submitted_case.get_certificate(0))
    assert result["outcome"] == "COMPLIANT"
    assert case["status"] == "COMPLIANT"
    assert case["attempt_count"] == 1
    assert attempt["outcome"] == "COMPLIANT"
    assert attempt["evaluator"] == to_hex(direct_charlie)
    assert len(attempt["fingerprint"]) == 64
    assert certificate["fingerprint"] == attempt["fingerprint"]
    assert certificate["contract_address"].startswith("0x")
    assert json.loads(submitted_case.get_evidence(0, 0))["evaluated"] is True


def test_affirmative_missing_obligation_is_non_compliant(
    direct_vm, submitted_case, direct_bob
):
    _mock_decision(direct_vm, non_compliant_result(to_hex(direct_bob)))

    result = json.loads(submitted_case.evaluate(0))

    assert result["outcome"] == "NON_COMPLIANT"
    assert json.loads(submitted_case.get_case(0))["status"] == "NON_COMPLIANT"
    with direct_vm.expect_revert("certificate unavailable"):
        submitted_case.get_certificate(0)


@pytest.mark.parametrize(
    "mutation",
    [
        {"asset_hash": "b" * 64},
        {"cycle_id": "wrong-cycle"},
        {"provider": "0x" + "f" * 40},
        {"evidence_version": 99},
        {"policy_version": "superseded-v0"},
        {"service_date": "2026-10-01"},
        {"report_issue_date": "2026-10-01"},
        {"outcome": "COMPLIANT", "missing": ["locked obligation"]},
        {"outcome": "COMPLIANT", "contradictions": ["conflicting pressure"]},
    ],
)
def test_invalid_or_unsafe_agreed_result_becomes_unresolved(
    direct_vm, submitted_case, direct_bob, mutation
):
    decision = compliant_result(to_hex(direct_bob))
    decision.update(mutation)
    _mock_decision(direct_vm, decision)

    result = json.loads(submitted_case.evaluate(0))

    assert result["outcome"] == "UNRESOLVED"
    case = json.loads(submitted_case.get_case(0))
    assert case["status"] == "UNRESOLVED"
    assert case["attempt_count"] == 1


@pytest.mark.parametrize("payload", ["not-json", "{}", "[]"])
def test_malformed_model_output_becomes_unresolved(
    direct_vm, submitted_case, payload
):
    _mock_decision(direct_vm, payload)

    result = json.loads(submitted_case.evaluate(0))

    assert result["outcome"] == "UNRESOLVED"
    assert json.loads(submitted_case.get_case(0))["status"] == "UNRESOLVED"


@pytest.mark.parametrize(
    "mutation",
    [
        {"provider": None},
        {"evidence_version": "1"},
        {"policy_version": None},
        {"service_date": 20260815},
        {"report_issue_date": []},
        {"outcome": 7},
        {"reason": None},
    ],
)
def test_malformed_scalar_fields_become_unresolved(
    direct_vm, submitted_case, direct_bob, mutation
):
    decision = compliant_result(to_hex(direct_bob))
    decision.update(mutation)
    _mock_decision(direct_vm, decision)

    assert json.loads(submitted_case.evaluate(0))["outcome"] == "UNRESOLVED"


def test_contradiction_alone_cannot_be_terminal_non_compliance(
    direct_vm, submitted_case, direct_bob
):
    decision = compliant_result(to_hex(direct_bob))
    decision.update(
        {
            "outcome": "NON_COMPLIANT",
            "completed": [],
            "missing": [],
            "contradictions": ["Two incompatible pressure readings"],
        }
    )
    _mock_decision(direct_vm, decision)

    assert json.loads(submitted_case.evaluate(0))["outcome"] == "UNRESOLVED"


def test_reason_wording_is_not_part_of_certificate_fingerprint(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    fingerprints = []
    for run, reason in enumerate(
        ["All locked work is evidenced.", "Every obligation is proven."]
    ):
        contract = direct_deploy("contracts/maintenance_proof.py")
        direct_vm.sender = direct_alice
        contract.create_case(
            "a" * 64, to_hex(direct_bob), "httpbin.org", VALID_POLICY,
            "hvac-v1", "cycle-2026-q3", "2026-07-01", "2026-09-30",
        )
        direct_vm.sender = direct_bob
        contract.submit_evidence(0, VALID_URL + "?run=" + str(run), 1)
        decision = compliant_result(to_hex(direct_bob))
        decision["reason"] = reason
        _mock_decision(direct_vm, decision)
        contract.evaluate(0)
        fingerprints.append(json.loads(contract.get_certificate(0))["fingerprint"])

    assert fingerprints[0] == fingerprints[1]


def test_fetch_failure_becomes_recorded_unresolved(direct_vm, submitted_case):
    result = json.loads(submitted_case.evaluate(0))

    assert result["outcome"] == "UNRESOLVED"
    assert result["reason"] == "FETCH_FAILED"
    assert json.loads(submitted_case.get_case(0))["status"] == "UNRESOLVED"


def test_unresolved_accepts_strictly_newer_revision(
    direct_vm, submitted_case, direct_bob
):
    _mock_decision(direct_vm, unresolved_result(to_hex(direct_bob)))
    submitted_case.evaluate(0)
    direct_vm.sender = direct_bob

    with direct_vm.expect_revert("invalid evidence version"):
        submitted_case.submit_evidence(0, VALID_URL, 1)
    submitted_case.submit_evidence(
        0, "https://httpbin.org/base64/maintenance-report-v2", 2
    )

    case = json.loads(submitted_case.get_case(0))
    assert case["status"] == "SUBMITTED"
    assert case["evidence_count"] == 2
    assert json.loads(submitted_case.get_evidence(0, 0))["evaluated"] is True
    assert json.loads(submitted_case.get_evidence(0, 1))["evaluated"] is False


def test_evaluation_requires_submitted_case(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    contract.create_case(
        "a" * 64,
        to_hex(direct_bob),
        "httpbin.org",
        VALID_POLICY,
        "v1",
        "cycle-1",
        "2026-01-01",
        "2026-12-31",
    )
    with direct_vm.expect_revert("case is not submitted"):
        contract.evaluate(0)


def test_terminal_case_cannot_be_evaluated_twice(
    direct_vm, submitted_case, direct_bob
):
    _mock_decision(direct_vm, compliant_result(to_hex(direct_bob)))
    submitted_case.evaluate(0)

    with direct_vm.expect_revert("case is not submitted"):
        submitted_case.evaluate(0)


def test_missing_attempt_and_certificate_revert(direct_vm, submitted_case):
    with direct_vm.expect_revert("attempt not found"):
        submitted_case.get_attempt(0, 0)
    with direct_vm.expect_revert("certificate unavailable"):
        submitted_case.get_certificate(0)


def test_consensus_failure_writes_no_state(direct_vm, submitted_case):
    direct_vm.mock_web(
        r".*httpbin\.org/base64/maintenance-report.*",
        {"status": 200, "body": "Locked maintenance report body"},
    )

    with pytest.raises(Exception):
        submitted_case.evaluate(0)

    assert json.loads(submitted_case.get_case(0))["status"] == "SUBMITTED"
    assert json.loads(submitted_case.get_case(0))["attempt_count"] == 0
    assert json.loads(submitted_case.get_evidence(0, 0))["evaluated"] is False
