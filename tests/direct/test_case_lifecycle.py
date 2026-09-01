"""Immutable V2 maintenance case lifecycle tests."""

import hashlib
import json

import pytest

from tests.direct.conftest import to_hex


VALID_POLICY = "Replace the intake filter and verify outlet pressure is 80-120 psi."
RECORD_SCHEMA = "maintenaproof.service-record.v2"


def create_case(contract, issuer, provider):
    return contract.create_case(
        "a" * 64,
        to_hex(issuer),
        to_hex(provider),
        VALID_POLICY,
        "hvac-v1",
        "cycle-2026-q3",
        "2026-07-01",
        "2026-09-30",
    )


def test_owner_binds_issuer_provider_and_policy_digest(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice

    case_id = create_case(contract, direct_bob, direct_charlie)

    case = json.loads(contract.get_case(case_id))
    assert case == {
        "asset_hash": "a" * 64,
        "attempt_count": 0,
        "certificate_fingerprint": "",
        "cycle_end": "2026-09-30",
        "cycle_id": "cycle-2026-q3",
        "cycle_start": "2026-07-01",
        "evidence_count": 0,
        "id": 0,
        "issuer": to_hex(direct_bob),
        "latest_evidence_version": 0,
        "owner": to_hex(direct_alice),
        "policy": VALID_POLICY,
        "policy_hash": hashlib.sha256(VALID_POLICY.encode("utf-8")).hexdigest(),
        "policy_version": "hvac-v1",
        "provider": to_hex(direct_charlie),
        "record_schema": RECORD_SCHEMA,
        "status": "AWAITING_RECORD",
    }
    assert contract.case_count() == 1


@pytest.mark.parametrize(
    ("actor", "message"),
    [("issuer", "issuer required"), ("provider", "provider required")],
)
def test_zero_bound_actor_reverts(
    direct_vm, direct_deploy, direct_alice, direct_bob, actor, message
):
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    issuer = "0x" + "0" * 40 if actor == "issuer" else to_hex(direct_bob)
    provider = "0x" + "0" * 40 if actor == "provider" else to_hex(direct_bob)

    with direct_vm.expect_revert(message):
        contract.create_case(
            "a" * 64, issuer, provider, "x" * 20, "v1", "c1",
            "2026-07-01", "2026-09-30",
        )


def test_invalid_cycle_reverts(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("invalid cycle"):
        contract.create_case(
            "a" * 64, to_hex(direct_bob), to_hex(direct_bob), "x" * 20,
            "v1", "c1", "2026-10-01", "2026-09-30",
        )


@pytest.mark.parametrize("asset_hash", ["a" * 63, "A" * 64, "g" * 64])
def test_invalid_asset_hash_reverts(
    direct_vm, direct_deploy, direct_alice, direct_bob, asset_hash
):
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("invalid asset hash"):
        contract.create_case(
            asset_hash, to_hex(direct_bob), to_hex(direct_bob), VALID_POLICY,
            "v1", "c1", "2026-07-01", "2026-09-30",
        )


@pytest.mark.parametrize("policy", ["x" * 19, "x" * 2001])
def test_invalid_policy_length_reverts(
    direct_vm, direct_deploy, direct_alice, direct_bob, policy
):
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("invalid policy"):
        contract.create_case(
            "a" * 64, to_hex(direct_bob), to_hex(direct_bob), policy,
            "v1", "c1", "2026-07-01", "2026-09-30",
        )


@pytest.mark.parametrize("value", ["", "x" * 65, "bad\nvalue"])
def test_invalid_identifier_reverts(
    direct_vm, direct_deploy, direct_alice, direct_bob, value
):
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("invalid policy version"):
        contract.create_case(
            "a" * 64, to_hex(direct_bob), to_hex(direct_bob), VALID_POLICY,
            value, "c1", "2026-07-01", "2026-09-30",
        )


@pytest.mark.parametrize("date", ["2026-02-30", "2026-7-01", "not-a-date"])
def test_impossible_or_noncanonical_date_reverts(
    direct_vm, direct_deploy, direct_alice, direct_bob, date
):
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("invalid cycle date"):
        contract.create_case(
            "a" * 64, to_hex(direct_bob), to_hex(direct_bob), VALID_POLICY,
            "v1", "c1", date, "2026-09-30",
        )


def test_missing_case_read_reverts(direct_vm, direct_deploy):
    contract = direct_deploy("contracts/maintenance_proof.py")
    with direct_vm.expect_revert("case not found"):
        contract.get_case(99)


def test_owner_cancels_awaiting_record(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    case_id = create_case(contract, direct_bob, direct_bob)

    contract.cancel_case(case_id)

    assert json.loads(contract.get_case(case_id))["status"] == "CANCELLED"


def test_non_owner_cannot_cancel(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    case_id = create_case(contract, direct_bob, direct_bob)
    direct_vm.sender = direct_bob

    with direct_vm.expect_revert("only owner"):
        contract.cancel_case(case_id)
    assert json.loads(contract.get_case(case_id))["status"] == "AWAITING_RECORD"


def test_cancelled_case_cannot_be_cancelled_again(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    case_id = create_case(contract, direct_bob, direct_bob)
    contract.cancel_case(case_id)

    with direct_vm.expect_revert("case is not awaiting record"):
        contract.cancel_case(case_id)


def test_contract_has_no_privileged_outcome_or_upgrade_method(direct_deploy):
    contract = direct_deploy("contracts/maintenance_proof.py")
    for forbidden in ("set_outcome", "override_outcome", "upgrade", "set_issuer"):
        assert not hasattr(contract, forbidden)
