"""Issuer authorization, canonical record, freshness, bounds, and replay tests."""

import hashlib
import json

import pytest

from tests.direct.conftest import to_hex
from tests.direct.test_case_lifecycle import RECORD_SCHEMA, VALID_POLICY, create_case


SUBMITTED_AT = "2026-08-20T12:00:00Z"


def record_args(**overrides):
    values = {
        "version": 1,
        "service_date": "2026-08-15",
        "issued_at": "2026-08-16T10:00:00Z",
        "expires_at": "2026-09-30T23:59:59Z",
        "nonce": "record-001",
        "completed_json": json.dumps(
            ["replace intake filter", "verify outlet pressure 80-120 psi"]
        ),
        "measurements_json": json.dumps(
            [{"name": "outlet pressure", "value": "100", "unit": "psi"}]
        ),
        "attachments_json": json.dumps(
            [{"uri": "ipfs://bafy-record", "sha256": "b" * 64}]
        ),
        "notes": "Technician service record",
    }
    values.update(overrides)
    return (
        values["version"],
        values["service_date"],
        values["issued_at"],
        values["expires_at"],
        values["nonce"],
        values["completed_json"],
        values["measurements_json"],
        values["attachments_json"],
        values["notes"],
    )


def submit_record(contract, **overrides):
    return contract.submit_service_record(0, *record_args(**overrides))


@pytest.fixture
def awaiting_case(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    direct_vm.warp(SUBMITTED_AT)
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    create_case(contract, direct_bob, direct_charlie)
    return contract


def test_locked_issuer_commits_exact_canonical_record(
    direct_vm, awaiting_case, direct_bob, direct_charlie
):
    direct_vm.sender = direct_bob

    digest = submit_record(awaiting_case)

    case = json.loads(awaiting_case.get_case(0))
    evidence = json.loads(awaiting_case.get_evidence(0, 0))
    record = json.loads(evidence["record_json"])
    assert case["status"] == "SUBMITTED"
    assert case["latest_evidence_version"] == 1
    assert case["evidence_count"] == 1
    assert record == {
        "action": "ISSUE_SERVICE_RECORD",
        "asset_hash": "a" * 64,
        "attachments": [{"sha256": "b" * 64, "uri": "ipfs://bafy-record"}],
        "case_id": 0,
        "chain_id": direct_vm._chain_id,
        "completed_actions": [
            "replace intake filter",
            "verify outlet pressure 80-120 psi",
        ],
        "contract_address": record["contract_address"],
        "cycle_id": "cycle-2026-q3",
        "expires_at": "2026-09-30T23:59:59Z",
        "issued_at": "2026-08-16T10:00:00Z",
        "issuer": to_hex(direct_bob),
        "measurements": [
            {"name": "outlet pressure", "unit": "psi", "value": "100"}
        ],
        "nonce": "record-001",
        "notes": "Technician service record",
        "policy_hash": case["policy_hash"],
        "policy_version": "hvac-v1",
        "provider": to_hex(direct_charlie),
        "record_schema": RECORD_SCHEMA,
        "record_version": 1,
        "service_date": "2026-08-15",
    }
    assert evidence["case_id"] == 0
    assert evidence["issuer"] == to_hex(direct_bob)
    assert evidence["submitted_at"] == SUBMITTED_AT
    assert evidence["evaluated"] is False
    assert digest == hashlib.sha256(evidence["record_json"].encode()).hexdigest()
    assert evidence["record_digest"] == digest
    assert len(evidence["replay_domain"]) == 64


@pytest.mark.parametrize("actor", ["owner", "provider", "third_party"])
def test_only_locked_issuer_can_submit(
    direct_vm,
    awaiting_case,
    direct_alice,
    direct_charlie,
    direct_accounts,
    actor,
):
    direct_vm.sender = {
        "owner": direct_alice,
        "provider": direct_charlie,
        "third_party": direct_accounts[3],
    }[actor]

    with direct_vm.expect_revert("only issuer"):
        submit_record(awaiting_case)

    assert json.loads(awaiting_case.get_case(0))["status"] == "AWAITING_RECORD"


@pytest.mark.parametrize("version", [0, 2**32])
def test_record_version_bounds_revert(
    direct_vm, awaiting_case, direct_bob, version
):
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("invalid evidence version"):
        submit_record(awaiting_case, version=version)


@pytest.mark.parametrize(
    ("mutation", "message"),
    [
        ({"service_date": "2026-10-01"}, "service date outside cycle"),
        ({"issued_at": "2026-08-16"}, "invalid issued timestamp"),
        ({"expires_at": "2026-09-30T23:59:59+00:00"}, "invalid expiry timestamp"),
        ({"issued_at": "2026-08-21T00:00:00Z"}, "record issued in future"),
        ({"expires_at": "2026-08-19T23:59:59Z"}, "record expired"),
        ({"expires_at": "2026-08-15T09:59:59Z"}, "expiry before issue"),
    ],
)
def test_invalid_or_stale_record_time_reverts(
    direct_vm, awaiting_case, direct_bob, mutation, message
):
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert(message):
        submit_record(awaiting_case, **mutation)


@pytest.mark.parametrize(
    ("mutation", "message"),
    [
        ({"completed_json": "not-json"}, "invalid completed actions"),
        ({"completed_json": "[]"}, "invalid completed actions"),
        ({"completed_json": json.dumps(["same", "same"])}, "duplicate completed action"),
        ({"completed_json": json.dumps(["x" * 257])}, "invalid completed action"),
        ({"measurements_json": json.dumps([{"name": "pressure"}])}, "invalid measurement"),
        ({"measurements_json": json.dumps([{"name": "p", "value": "1", "unit": "psi", "extra": "x"}])}, "invalid measurement"),
        ({"attachments_json": json.dumps([{"uri": "ipfs://x", "sha256": "B" * 64}])}, "invalid attachment"),
        ({"attachments_json": json.dumps([{"uri": "", "sha256": "b" * 64}])}, "invalid attachment"),
        ({"nonce": ""}, "invalid nonce"),
        ({"nonce": "n" * 129}, "invalid nonce"),
        ({"notes": "n" * 2001}, "invalid notes"),
    ],
)
def test_malformed_or_unbounded_record_fields_revert(
    direct_vm, awaiting_case, direct_bob, mutation, message
):
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert(message):
        submit_record(awaiting_case, **mutation)


def test_second_record_is_rejected_while_first_is_submitted(
    direct_vm, awaiting_case, direct_bob
):
    direct_vm.sender = direct_bob
    submit_record(awaiting_case)

    with direct_vm.expect_revert("case cannot accept evidence"):
        submit_record(awaiting_case, version=2, nonce="record-002")

    assert json.loads(awaiting_case.get_case(0))["evidence_count"] == 1


def test_cancelled_case_rejects_record(
    direct_vm, awaiting_case, direct_alice, direct_bob
):
    direct_vm.sender = direct_alice
    awaiting_case.cancel_case(0)
    direct_vm.sender = direct_bob

    with direct_vm.expect_revert("case cannot accept evidence"):
        submit_record(awaiting_case)


def test_replay_domain_changes_with_case_even_for_same_record_fields(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
    direct_charlie,
):
    direct_vm.warp(SUBMITTED_AT)
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    create_case(contract, direct_bob, direct_charlie)
    create_case(contract, direct_bob, direct_charlie)
    direct_vm.sender = direct_bob
    contract.submit_service_record(0, *record_args())
    contract.submit_service_record(1, *record_args())

    first = json.loads(contract.get_evidence(0, 0))
    second = json.loads(contract.get_evidence(1, 0))
    assert first["record_digest"] != second["record_digest"]
    assert first["replay_domain"] != second["replay_domain"]


def test_missing_evidence_read_reverts(direct_vm, awaiting_case):
    with direct_vm.expect_revert("evidence not found"):
        awaiting_case.get_evidence(0, 0)
