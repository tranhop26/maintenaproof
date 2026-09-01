"""Real Studionet owner/issuer/provider/evaluator V2 flows.

These tests deploy contracts and therefore run only after the action-time deploy
identity has been confirmed by the user.
"""

import hashlib
import json

import pytest
from gltest import create_accounts, get_contract_factory
from gltest.assertions import tx_execution_failed, tx_execution_succeeded

from tests.integration.evidence_urls import build_service_record


POLICY = "Replace the intake filter and verify outlet pressure is 80-120 psi."


def _deploy_case(asset_hash: str = "a" * 64):
    owner, issuer, provider, evaluator = create_accounts(4)
    record = build_service_record()
    factory = get_contract_factory("MaintenanceProof")
    contract = factory.deploy(args=[], account=owner)
    create_receipt = contract.create_case(
        args=[
            asset_hash,
            issuer.address,
            provider.address,
            POLICY,
            "hvac-v1",
            "cycle-studionet-v2",
            record["cycle_start"],
            record["cycle_end"],
        ]
    ).transact()
    assert tx_execution_succeeded(create_receipt)
    return contract, issuer, provider, evaluator, record


@pytest.mark.integration
def test_issuer_record_reaches_safe_digest_bound_consensus_outcome():
    contract, issuer, _, evaluator, record = _deploy_case()
    submit_receipt = contract.connect(issuer).submit_service_record(
        args=record["args"]
    ).transact()
    assert tx_execution_succeeded(submit_receipt)
    evidence = json.loads(contract.get_evidence(args=[0, 0]).call())
    assert evidence["issuer"].lower() == issuer.address.lower()
    assert evidence["record_digest"] == hashlib.sha256(
        evidence["record_json"].encode()
    ).hexdigest()

    evaluate_receipt = contract.connect(evaluator).evaluate(
        args=[0]
    ).transact(wait_interval=10_000, wait_retries=30)
    assert tx_execution_succeeded(evaluate_receipt)
    case = json.loads(contract.get_case(args=[0]).call())
    assert case["status"] in {"COMPLIANT", "NON_COMPLIANT", "UNRESOLVED"}, case
    attempt = json.loads(contract.get_attempt(args=[0, 0]).call())
    assert attempt["outcome"] == case["status"]
    assert attempt["record_digest"] == evidence["record_digest"]
    if case["status"] == "COMPLIANT":
        certificate = json.loads(contract.get_certificate(args=[0]).call())
        assert certificate["record_digest"] == evidence["record_digest"]
        assert certificate["issuer"].lower() == issuer.address.lower()
    else:
        assert case["certificate_fingerprint"] == ""


@pytest.mark.integration
def test_non_issuer_cannot_submit_service_record():
    contract, _, provider, _, record = _deploy_case("b" * 64)
    rejected = contract.connect(provider).submit_service_record(
        args=record["args"]
    ).transact()
    assert tx_execution_failed(rejected)
    case = json.loads(contract.get_case(args=[0]).call())
    assert case["status"] == "AWAITING_RECORD"
    assert case["evidence_count"] == 0
