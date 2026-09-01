"""Fresh V2 service-record arguments for collectable Studionet tests."""

from datetime import datetime, timedelta, timezone
import json


def build_service_record(*, version: int = 1, nonce: str = "studionet-record-001"):
    now = datetime.now(timezone.utc).replace(microsecond=0)
    service = (now - timedelta(days=1)).date()
    issued = datetime.combine(service, datetime.min.time(), timezone.utc) + timedelta(hours=12)
    expiry = now + timedelta(days=30)
    return {
        "cycle_start": (service - timedelta(days=1)).isoformat(),
        "cycle_end": expiry.date().isoformat(),
        "args": [
            0,
            version,
            service.isoformat(),
            issued.strftime("%Y-%m-%dT%H:%M:%SZ"),
            expiry.strftime("%Y-%m-%dT%H:%M:%SZ"),
            nonce,
            json.dumps(
                [
                    "replace intake filter",
                    "verify outlet pressure 80-120 psi",
                ]
            ),
            json.dumps(
                [{"name": "outlet pressure", "value": "100", "unit": "psi"}]
            ),
            json.dumps([]),
            "Studionet issuer service record",
        ],
    }
