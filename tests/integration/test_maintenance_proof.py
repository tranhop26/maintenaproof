"""Real Studionet owner/provider/evaluator flows.

These tests deploy contracts and therefore run only after the action-time deploy
identity has been confirmed by the user.
"""

import json

import pytest
from gltest import create_accounts, get_contract_factory
from gltest.assertions import tx_execution_succeeded

from tests.integration.evidence_urls import build_evidence_url


POLICY = "Replace the intake filter and verify outlet pressure is 80-120 psi."


def _deploy_case(asset_hash: str = "a" * 64):
    owner, provider, evaluator = create_accounts(3)
    factory = get_contract_factory("MaintenanceProof")
    contract = factory.deploy(args=[], account=owner)
    create_receipt = contract.create_case(
        args=[
            asset_hash,
            provider.address,
            "httpbin.org",
            POLICY,
            "hvac-v1",
            "cycle-2026-q3",
            "2026-07-01",
            "2026-09-30",
        ]
    ).transact()
    assert tx_execution_succeeded(create_receipt)
    return contract, provider, evaluator


@pytest.mark.integration
def test_valid_public_evidence_reaches_a_safe_consensus_outcome():
    contract, provider, evaluator = _deploy_case()
    submit_receipt = contract.connect(provider).submit_evidence(
        args=[0, build_evidence_url(provider.address), 1]
    ).transact()
    assert tx_execution_succeeded(submit_receipt)

    evaluate_receipt = contract.connect(evaluator).evaluate(
        args=[0]
    ).transact(wait_interval=10_000, wait_retries=30)
    assert tx_execution_succeeded(evaluate_receipt)
    case = json.loads(contract.get_case(args=[0]).call())
    assert case["status"] in {"COMPLIANT", "UNRESOLVED"}, case
    attempt = json.loads(contract.get_attempt(args=[0, 0]).call())
    assert attempt["outcome"] == case["status"]
    if case["status"] == "COMPLIANT":
        certificate = json.loads(contract.get_certificate(args=[0]).call())
        assert certificate["fingerprint"]
    else:
        assert case["certificate_fingerprint"] == ""


@pytest.mark.integration
def test_mismatched_public_evidence_is_safely_unresolved():
    contract, provider, evaluator = _deploy_case()
    submit_receipt = contract.connect(provider).submit_evidence(
        args=[0, build_evidence_url(provider.address, asset_hash="b" * 64), 1]
    ).transact()
    assert tx_execution_succeeded(submit_receipt)

    evaluate_receipt = contract.connect(evaluator).evaluate(
        args=[0]
    ).transact(wait_interval=10_000, wait_retries=30)
    assert tx_execution_succeeded(evaluate_receipt)
    assert json.loads(contract.get_case(args=[0]).call())["status"] == "UNRESOLVED"
