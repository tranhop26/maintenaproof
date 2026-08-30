"""Stable public evidence URLs used by Studionet integration tests."""

import base64
import json
from urllib.parse import quote


def build_evidence_url(provider: str, *, asset_hash: str = "a" * 64) -> str:
    payload = {
        "asset_hash": asset_hash,
        "completed": [
            "replace intake filter",
            "verify outlet pressure 80-120 psi",
        ],
        "cycle_id": "cycle-2026-q3",
        "evidence_version": 1,
        "provider": provider,
        "service_date": "2026-08-15",
    }
    encoded = base64.b64encode(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    ).decode()
    return "https://httpbin.org/base64/" + quote(encoded, safe="")
