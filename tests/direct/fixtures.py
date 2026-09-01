"""Canonical V2 semantic decisions used by direct contract tests."""


def compliant_result(case: dict, evidence: dict) -> dict:
    return {
        "outcome": "COMPLIANT",
        "case_id": case["id"],
        "issuer": case["issuer"],
        "provider": case["provider"],
        "asset_hash": case["asset_hash"],
        "record_digest": evidence["record_digest"],
        "record_schema": case["record_schema"],
        "record_version": evidence["version"],
        "policy_hash": case["policy_hash"],
        "policy_version": case["policy_version"],
        "cycle_id": case["cycle_id"],
        "service_date": evidence["service_date"],
        "issued_at": evidence["issued_at"],
        "expires_at": evidence["expires_at"],
        "completed": [
            "replace intake filter",
            "verify outlet pressure 80-120 psi",
        ],
        "missing": [],
        "contradictions": [],
        "reason": "All locked obligations are demonstrated by the record.",
    }


def non_compliant_result(case: dict, evidence: dict) -> dict:
    result = compliant_result(case, evidence)
    result.update(
        {
            "outcome": "NON_COMPLIANT",
            "completed": ["replace intake filter"],
            "missing": ["verify outlet pressure 80-120 psi"],
            "reason": "The record affirmatively says pressure was not verified.",
        }
    )
    return result


def unresolved_result(
    case: dict, evidence: dict, *, reason: str = "INSUFFICIENT"
) -> dict:
    result = compliant_result(case, evidence)
    result.update(
        {
            "outcome": "UNRESOLVED",
            "completed": [],
            "missing": [],
            "contradictions": [],
            "reason": reason,
        }
    )
    return result
