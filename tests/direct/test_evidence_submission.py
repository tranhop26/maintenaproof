"""Provider authorization, URL binding, revision, and replay tests."""

import json

import pytest

from tests.direct.conftest import to_hex
from tests.direct.test_case_lifecycle import VALID_POLICY


VALID_URL = "https://httpbin.org/base64/maintenance-report-v1"


@pytest.fixture
def draft_case(direct_vm, direct_deploy, direct_alice, direct_bob):
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
    return contract


def test_locked_provider_submits_first_revision(direct_vm, draft_case, direct_bob):
    direct_vm.sender = direct_bob

    draft_case.submit_evidence(0, VALID_URL, 1)

    case = json.loads(draft_case.get_case(0))
    evidence = json.loads(draft_case.get_evidence(0, 0))
    assert case["status"] == "SUBMITTED"
    assert case["latest_evidence_version"] == 1
    assert case["evidence_count"] == 1
    assert evidence["case_id"] == 0
    assert evidence["revision_index"] == 0
    assert evidence["version"] == 1
    assert evidence["url"] == VALID_URL
    assert evidence["evaluated"] is False
    assert len(evidence["replay_domain"]) == 64


@pytest.mark.parametrize("actor", ["owner", "third_party"])
def test_only_locked_provider_can_submit(
    direct_vm, draft_case, direct_alice, direct_charlie, actor
):
    direct_vm.sender = direct_alice if actor == "owner" else direct_charlie

    with direct_vm.expect_revert("only provider"):
        draft_case.submit_evidence(0, VALID_URL, 1)

    assert json.loads(draft_case.get_case(0))["status"] == "DRAFT"


@pytest.mark.parametrize(
    "url",
    [
        "http://httpbin.org/base64/report",
        "https://example.com/report",
        "https://httpbin.org:443/report",
        "https://user@httpbin.org/report",
        "https://127.0.0.1/report",
        "https://sub.httpbin.org/report",
        "https://httpbin.org.evil.example/report",
    ],
)
def test_url_must_be_https_on_exact_locked_hostname(
    direct_vm, draft_case, direct_bob, url
):
    direct_vm.sender = direct_bob

    with direct_vm.expect_revert("invalid evidence url"):
        draft_case.submit_evidence(0, url, 1)

    assert json.loads(draft_case.get_case(0))["evidence_count"] == 0


def test_oversized_url_reverts(direct_vm, draft_case, direct_bob):
    direct_vm.sender = direct_bob
    url = "https://httpbin.org/" + "x" * 981

    with direct_vm.expect_revert("invalid evidence url"):
        draft_case.submit_evidence(0, url, 1)


@pytest.mark.parametrize("version", [0, 2**32])
def test_evidence_version_bounds_revert(
    direct_vm, draft_case, direct_bob, version
):
    direct_vm.sender = direct_bob

    with direct_vm.expect_revert("invalid evidence version"):
        draft_case.submit_evidence(0, VALID_URL, version)


def test_submitted_case_rejects_second_submission(
    direct_vm, draft_case, direct_bob
):
    direct_vm.sender = direct_bob
    draft_case.submit_evidence(0, VALID_URL, 1)

    with direct_vm.expect_revert("case cannot accept evidence"):
        draft_case.submit_evidence(0, VALID_URL, 1)

    assert json.loads(draft_case.get_case(0))["evidence_count"] == 1


def test_cancelled_case_rejects_submission(
    direct_vm, draft_case, direct_alice, direct_bob
):
    direct_vm.sender = direct_alice
    draft_case.cancel_case(0)
    direct_vm.sender = direct_bob

    with direct_vm.expect_revert("case cannot accept evidence"):
        draft_case.submit_evidence(0, VALID_URL, 1)


def test_missing_evidence_read_reverts(direct_vm, draft_case):
    with direct_vm.expect_revert("evidence not found"):
        draft_case.get_evidence(0, 0)

