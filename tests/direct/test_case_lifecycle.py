"""Immutable maintenance case lifecycle tests."""

import json

import pytest

from tests.direct.conftest import to_hex


VALID_POLICY = "Replace the intake filter and verify outlet pressure is 80-120 psi."


def create_case(contract, provider):
    return contract.create_case(
        "a" * 64,
        to_hex(provider),
        "httpbin.org",
        VALID_POLICY,
        "hvac-v1",
        "cycle-2026-q3",
        "2026-07-01",
        "2026-09-30",
    )


def test_owner_creates_locked_draft(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice

    case_id = create_case(contract, direct_bob)

    case = json.loads(contract.get_case(case_id))
    assert case == {
        "asset_hash": "a" * 64,
        "attempt_count": 0,
        "certificate_fingerprint": "",
        "cycle_end": "2026-09-30",
        "cycle_id": "cycle-2026-q3",
        "cycle_start": "2026-07-01",
        "evidence_count": 0,
        "evidence_hostname": "httpbin.org",
        "id": 0,
        "latest_evidence_version": 0,
        "owner": to_hex(direct_alice),
        "policy": VALID_POLICY,
        "policy_version": "hvac-v1",
        "provider": to_hex(direct_bob),
        "status": "DRAFT",
    }
    assert contract.case_count() == 1


def test_zero_provider_and_invalid_cycle_revert(
    direct_vm, direct_deploy, direct_alice
):
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("provider required"):
        contract.create_case(
            "a" * 64,
            "0x" + "0" * 40,
            "httpbin.org",
            "x" * 20,
            "v1",
            "c1",
            "2026-07-01",
            "2026-09-30",
        )
    with direct_vm.expect_revert("invalid cycle"):
        contract.create_case(
            "a" * 64,
            to_hex(direct_alice),
            "httpbin.org",
            "x" * 20,
            "v1",
            "c1",
            "2026-10-01",
            "2026-09-30",
        )


@pytest.mark.parametrize("asset_hash", ["a" * 63, "A" * 64, "g" * 64])
def test_invalid_asset_hash_reverts(
    direct_vm, direct_deploy, direct_alice, direct_bob, asset_hash
):
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("invalid asset hash"):
        contract.create_case(
            asset_hash,
            to_hex(direct_bob),
            "httpbin.org",
            VALID_POLICY,
            "v1",
            "c1",
            "2026-07-01",
            "2026-09-30",
        )


@pytest.mark.parametrize(
    "hostname",
    ["HTTPBIN.ORG", "https://httpbin.org", "127.0.0.1", "*.httpbin.org", "a..b"],
)
def test_invalid_hostname_reverts(
    direct_vm, direct_deploy, direct_alice, direct_bob, hostname
):
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("invalid hostname"):
        contract.create_case(
            "a" * 64,
            to_hex(direct_bob),
            hostname,
            VALID_POLICY,
            "v1",
            "c1",
            "2026-07-01",
            "2026-09-30",
        )


@pytest.mark.parametrize("policy", ["x" * 19, "x" * 2001])
def test_invalid_policy_length_reverts(
    direct_vm, direct_deploy, direct_alice, direct_bob, policy
):
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("invalid policy"):
        contract.create_case(
            "a" * 64,
            to_hex(direct_bob),
            "httpbin.org",
            policy,
            "v1",
            "c1",
            "2026-07-01",
            "2026-09-30",
        )


@pytest.mark.parametrize("value", ["", "x" * 65, "bad\nvalue"])
def test_invalid_identifier_reverts(
    direct_vm, direct_deploy, direct_alice, direct_bob, value
):
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("invalid policy version"):
        contract.create_case(
            "a" * 64,
            to_hex(direct_bob),
            "httpbin.org",
            VALID_POLICY,
            value,
            "c1",
            "2026-07-01",
            "2026-09-30",
        )


@pytest.mark.parametrize("date", ["2026-02-30", "2026-7-01", "not-a-date"])
def test_impossible_or_noncanonical_date_reverts(
    direct_vm, direct_deploy, direct_alice, direct_bob, date
):
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("invalid cycle date"):
        contract.create_case(
            "a" * 64,
            to_hex(direct_bob),
            "httpbin.org",
            VALID_POLICY,
            "v1",
            "c1",
            date,
            "2026-09-30",
        )


def test_missing_case_read_reverts(direct_vm, direct_deploy):
    contract = direct_deploy("contracts/maintenance_proof.py")
    with direct_vm.expect_revert("case not found"):
        contract.get_case(99)


def test_owner_cancels_draft(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    case_id = create_case(contract, direct_bob)

    contract.cancel_case(case_id)

    assert json.loads(contract.get_case(case_id))["status"] == "CANCELLED"


def test_non_owner_cannot_cancel(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    case_id = create_case(contract, direct_bob)
    direct_vm.sender = direct_bob

    with direct_vm.expect_revert("only owner"):
        contract.cancel_case(case_id)
    assert json.loads(contract.get_case(case_id))["status"] == "DRAFT"


def test_cancelled_case_cannot_be_cancelled_again(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = direct_deploy("contracts/maintenance_proof.py")
    direct_vm.sender = direct_alice
    case_id = create_case(contract, direct_bob)
    contract.cancel_case(case_id)

    with direct_vm.expect_revert("case is not draft"):
        contract.cancel_case(case_id)
