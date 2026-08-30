"""Canonical semantic decisions used by direct contract tests."""


def compliant_result(provider_hex: str, *, version: int = 1) -> dict:
    return {
        "outcome": "COMPLIANT",
        "asset_hash": "a" * 64,
        "cycle_id": "cycle-2026-q3",
        "provider": provider_hex,
        "evidence_version": version,
        "policy_version": "hvac-v1",
        "service_date": "2026-08-15",
        "report_issue_date": "2026-08-16",
        "completed": [
            "replace intake filter",
            "verify outlet pressure 80-120 psi",
        ],
        "missing": [],
        "contradictions": [],
        "reason": "Both locked obligations are evidenced within the cycle.",
    }


def non_compliant_result(provider_hex: str) -> dict:
    result = compliant_result(provider_hex)
    result.update(
        {
            "outcome": "NON_COMPLIANT",
            "completed": ["replace intake filter"],
            "missing": ["verify outlet pressure 80-120 psi"],
            "reason": "The report affirmatively states that pressure was not verified.",
        }
    )
    return result


def unresolved_result(provider_hex: str, *, reason: str = "INSUFFICIENT") -> dict:
    result = compliant_result(provider_hex)
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
