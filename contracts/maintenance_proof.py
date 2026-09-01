# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""MaintenaProof: frozen maintenance-compliance cases on GenLayer."""

from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
import re

from genlayer import *


try:
    _ContractError = gl.vm.UserError
except Exception:
    _ContractError = Exception


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise _ContractError(message)


def _canonical(value) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def _valid_identifier(value: str) -> bool:
    return (
        isinstance(value, str)
        and 1 <= len(value) <= 64
        and all(32 <= ord(char) <= 126 for char in value)
    )


def _valid_printable(value: str, minimum: int, maximum: int) -> bool:
    return (
        isinstance(value, str)
        and minimum <= len(value) <= maximum
        and all(32 <= ord(char) <= 126 for char in value)
    )


def _parse_utc_timestamp(value: str) -> int:
    if not isinstance(value, str) or not re.fullmatch(
        r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", value
    ):
        return -1
    try:
        parsed = datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ").replace(
            tzinfo=timezone.utc
        )
    except Exception:
        return -1
    return int(parsed.timestamp())


def _transaction_timestamp() -> tuple[int, str]:
    raw = gl.message_raw["datetime"]
    parsed = datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(
        timezone.utc
    )
    return int(parsed.timestamp()), parsed.strftime("%Y-%m-%dT%H:%M:%SZ")


def _valid_hostname(value: str) -> bool:
    if not isinstance(value, str) or not 3 <= len(value) <= 253:
        return False
    if value.lower() != value or value.startswith(".") or value.endswith("."):
        return False
    if any(char in value for char in ":/?#@*"):
        return False
    labels = value.split(".")
    if len(labels) < 2 or all(label.isdigit() for label in labels):
        return False
    for label in labels:
        if not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", label):
            return False
    return True


def _valid_iso_date(value: str) -> bool:
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return False
    year, month, day = (int(part) for part in value.split("-"))
    if year < 1 or not 1 <= month <= 12:
        return False
    leap = year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)
    days = [31, 29 if leap else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    return 1 <= day <= days[month - 1]


def _valid_evidence_url(value: str, hostname: str) -> bool:
    if not isinstance(value, str) or not 1 <= len(value) <= 1000:
        return False
    prefix = "https://"
    if not value.startswith(prefix):
        return False
    remainder = value[len(prefix) :]
    authority = re.split(r"[/?#]", remainder, maxsplit=1)[0]
    return authority == hostname


@allow_storage
@dataclass
class MaintenanceCase:
    id: u256
    owner: Address
    issuer: Address
    provider: Address
    asset_hash: str
    policy: str
    policy_hash: str
    policy_version: str
    cycle_id: str
    cycle_start: str
    cycle_end: str
    record_schema: str
    status: str
    latest_evidence_version: u256
    evidence_count: u256
    attempt_count: u256
    certificate_fingerprint: str


@allow_storage
@dataclass
class EvidenceRecord:
    case_id: u256
    revision_index: u256
    version: u256
    issuer: Address
    record_digest: str
    record_json: str
    service_date: str
    issued_at: str
    expires_at: str
    submitted_at: str
    nonce: str
    replay_domain: str
    evaluated: bool


@allow_storage
@dataclass
class ResolutionAttempt:
    case_id: u256
    attempt_index: u256
    evidence_version: u256
    evaluator: Address
    outcome: str
    fingerprint: str
    findings_json: str


class MaintenanceProof(gl.Contract):
    next_case_id: u256
    cases: TreeMap[u256, MaintenanceCase]
    evidence: TreeMap[str, EvidenceRecord]
    used_replay_domains: TreeMap[str, bool]
    attempts: TreeMap[str, ResolutionAttempt]

    def __init__(self):
        self.next_case_id = u256(0)

    def _get_case(self, case_id: int) -> MaintenanceCase:
        key = u256(case_id)
        _require(key in self.cases, "case not found")
        return self.cases[key]

    def _evidence_key(self, case_id: int, revision_index: int) -> str:
        return str(case_id) + ":" + str(revision_index)

    def _attempt_key(self, case_id: int, attempt_index: int) -> str:
        return str(case_id) + ":" + str(attempt_index)

    def _record_replay_domain(
        self,
        case_id: int,
        issuer: str,
        version: int,
        record_digest: str,
        nonce: str,
    ) -> str:
        payload = "|".join(
            [
                "maintenaproof.service-record.v2",
                str(int(gl.message.chain_id)),
                gl.message.contract_address.as_hex,
                str(case_id),
                "ISSUE_SERVICE_RECORD",
                issuer,
                str(version),
                record_digest,
                nonce,
            ]
        )
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def _parse_completed(self, value: str) -> list:
        try:
            parsed = json.loads(value)
        except Exception:
            parsed = None
        _require(
            isinstance(parsed, list) and 1 <= len(parsed) <= 32,
            "invalid completed actions",
        )
        for item in parsed:
            _require(
                _valid_printable(item, 1, 256),
                "invalid completed action",
            )
        _require(len(set(parsed)) == len(parsed), "duplicate completed action")
        return parsed

    def _parse_measurements(self, value: str) -> list:
        try:
            parsed = json.loads(value)
        except Exception:
            parsed = None
        _require(
            isinstance(parsed, list) and len(parsed) <= 32,
            "invalid measurements",
        )
        for item in parsed:
            _require(
                isinstance(item, dict)
                and sorted(item.keys()) == ["name", "unit", "value"]
                and _valid_printable(item["name"], 1, 64)
                and _valid_printable(item["unit"], 1, 64)
                and _valid_printable(item["value"], 1, 128),
                "invalid measurement",
            )
        return parsed

    def _parse_attachments(self, value: str) -> list:
        try:
            parsed = json.loads(value)
        except Exception:
            parsed = None
        _require(
            isinstance(parsed, list) and len(parsed) <= 16,
            "invalid attachments",
        )
        for item in parsed:
            _require(
                isinstance(item, dict)
                and sorted(item.keys()) == ["sha256", "uri"]
                and _valid_printable(item["uri"], 1, 512)
                and isinstance(item["sha256"], str)
                and re.fullmatch(r"[0-9a-f]{64}", item["sha256"]) is not None,
                "invalid attachment",
            )
        return parsed

    def _unresolved_decision(
        self,
        asset_hash: str,
        cycle_id: str,
        provider: str,
        evidence_version: int,
        policy_version: str,
        reason: str,
    ) -> dict:
        return {
            "asset_hash": asset_hash,
            "completed": [],
            "contradictions": [],
            "cycle_id": cycle_id,
            "evidence_version": evidence_version,
            "missing": [],
            "outcome": "UNRESOLVED",
            "policy_version": policy_version,
            "provider": provider,
            "reason": reason,
            "report_issue_date": "",
            "service_date": "",
        }

    def _normalize_decision(
        self,
        raw,
        asset_hash: str,
        cycle_id: str,
        provider: str,
        evidence_version: int,
        policy_version: str,
        cycle_start: str,
        cycle_end: str,
    ) -> dict:
        fallback = self._unresolved_decision(
            asset_hash,
            cycle_id,
            provider,
            evidence_version,
            policy_version,
            "INVALID_OR_UNSAFE_RESULT",
        )
        if not isinstance(raw, dict):
            return fallback
        expected_keys = [
            "asset_hash",
            "completed",
            "contradictions",
            "cycle_id",
            "evidence_version",
            "missing",
            "outcome",
            "policy_version",
            "provider",
            "reason",
            "report_issue_date",
            "service_date",
        ]
        if sorted(raw.keys()) != expected_keys:
            return fallback
        if (
            not isinstance(raw["asset_hash"], str)
            or not isinstance(raw["cycle_id"], str)
            or not isinstance(raw["provider"], str)
            or not isinstance(raw["evidence_version"], int)
            or not isinstance(raw["policy_version"], str)
            or not isinstance(raw["service_date"], str)
            or not isinstance(raw["report_issue_date"], str)
            or not isinstance(raw["outcome"], str)
            or not isinstance(raw["reason"], str)
        ):
            return fallback
        if (
            raw["asset_hash"] != asset_hash
            or raw["cycle_id"] != cycle_id
            or raw["provider"].lower() != provider.lower()
            or raw["evidence_version"] != evidence_version
            or raw["policy_version"] != policy_version
        ):
            return fallback
        if (
            not isinstance(raw["completed"], list)
            or not isinstance(raw["missing"], list)
            or not isinstance(raw["contradictions"], list)
            or not all(isinstance(item, str) for item in raw["completed"])
            or not all(isinstance(item, str) for item in raw["missing"])
            or not all(isinstance(item, str) for item in raw["contradictions"])
        ):
            return fallback

        outcome = raw["outcome"]
        service_date = raw["service_date"]
        report_issue_date = raw["report_issue_date"]
        date_is_bound = (
            _valid_iso_date(service_date)
            and cycle_start <= service_date <= cycle_end
        )
        issue_date_is_bound = (
            _valid_iso_date(report_issue_date)
            and service_date <= report_issue_date <= cycle_end
        )
        if outcome == "COMPLIANT":
            if (
                not date_is_bound
                or not issue_date_is_bound
                or len(raw["completed"]) == 0
                or len(raw["missing"]) > 0
                or len(raw["contradictions"]) > 0
            ):
                return fallback
        elif outcome == "NON_COMPLIANT":
            if (
                not date_is_bound
                or not issue_date_is_bound
                or len(raw["missing"]) == 0
                or len(raw["contradictions"]) > 0
            ):
                return fallback
        elif outcome != "UNRESOLVED":
            return fallback
        return raw

    @gl.public.write
    def create_case(
        self,
        asset_hash: str,
        issuer: Address,
        provider: Address,
        policy: str,
        policy_version: str,
        cycle_id: str,
        cycle_start: str,
        cycle_end: str,
    ) -> int:
        issuer_address = issuer if isinstance(issuer, Address) else Address(issuer)
        provider_address = provider if isinstance(provider, Address) else Address(provider)
        _require(
            issuer_address
            != Address("0x0000000000000000000000000000000000000000"),
            "issuer required",
        )
        _require(
            provider_address
            != Address("0x0000000000000000000000000000000000000000"),
            "provider required",
        )
        _require(
            isinstance(asset_hash, str)
            and re.fullmatch(r"[0-9a-f]{64}", asset_hash) is not None,
            "invalid asset hash",
        )
        _require(isinstance(policy, str) and 20 <= len(policy) <= 2000, "invalid policy")
        _require(_valid_identifier(policy_version), "invalid policy version")
        _require(_valid_identifier(cycle_id), "invalid cycle id")
        _require(
            _valid_iso_date(cycle_start) and _valid_iso_date(cycle_end),
            "invalid cycle date",
        )
        _require(cycle_start <= cycle_end, "invalid cycle")

        case_id = self.next_case_id
        self.cases[case_id] = MaintenanceCase(
            id=case_id,
            owner=gl.message.sender_address,
            issuer=issuer_address,
            provider=provider_address,
            asset_hash=asset_hash,
            policy=policy,
            policy_hash=hashlib.sha256(policy.encode("utf-8")).hexdigest(),
            policy_version=policy_version,
            cycle_id=cycle_id,
            cycle_start=cycle_start,
            cycle_end=cycle_end,
            record_schema="maintenaproof.service-record.v2",
            status="AWAITING_RECORD",
            latest_evidence_version=u256(0),
            evidence_count=u256(0),
            attempt_count=u256(0),
            certificate_fingerprint="",
        )
        self.next_case_id = u256(int(self.next_case_id) + 1)
        return int(case_id)

    @gl.public.write
    def cancel_case(self, case_id: int) -> None:
        case = self._get_case(case_id)
        _require(gl.message.sender_address == case.owner, "only owner")
        _require(case.status == "AWAITING_RECORD", "case is not awaiting record")
        case.status = "CANCELLED"

    @gl.public.write
    def submit_service_record(
        self,
        case_id: int,
        version: int,
        service_date: str,
        issued_at: str,
        expires_at: str,
        nonce: str,
        completed_json: str,
        measurements_json: str,
        attachments_json: str,
        notes: str,
    ) -> str:
        case = self._get_case(case_id)
        _require(gl.message.sender_address == case.issuer, "only issuer")
        _require(
            case.status in ("AWAITING_RECORD", "UNRESOLVED"),
            "case cannot accept evidence",
        )
        _require(
            1 <= version < 2**32 and version > int(case.latest_evidence_version),
            "invalid evidence version",
        )
        _require(
            _valid_iso_date(service_date)
            and case.cycle_start <= service_date <= case.cycle_end,
            "service date outside cycle",
        )

        issued_seconds = _parse_utc_timestamp(issued_at)
        _require(issued_seconds >= 0, "invalid issued timestamp")
        expiry_seconds = _parse_utc_timestamp(expires_at)
        _require(expiry_seconds >= 0, "invalid expiry timestamp")
        _require(expiry_seconds >= issued_seconds, "expiry before issue")
        _require(
            service_date <= issued_at[:10] <= case.cycle_end,
            "issue date outside cycle",
        )
        submitted_seconds, submitted_at = _transaction_timestamp()
        _require(issued_seconds <= submitted_seconds, "record issued in future")
        _require(expiry_seconds >= submitted_seconds, "record expired")
        _require(_valid_printable(nonce, 1, 128), "invalid nonce")
        _require(_valid_printable(notes, 0, 2000), "invalid notes")

        completed = self._parse_completed(completed_json)
        measurements = self._parse_measurements(measurements_json)
        attachments = self._parse_attachments(attachments_json)
        issuer = case.issuer.as_hex
        record = {
            "action": "ISSUE_SERVICE_RECORD",
            "asset_hash": case.asset_hash,
            "attachments": attachments,
            "case_id": case_id,
            "chain_id": int(gl.message.chain_id),
            "completed_actions": completed,
            "contract_address": gl.message.contract_address.as_hex,
            "cycle_id": case.cycle_id,
            "expires_at": expires_at,
            "issued_at": issued_at,
            "issuer": issuer,
            "measurements": measurements,
            "nonce": nonce,
            "notes": notes,
            "policy_hash": case.policy_hash,
            "policy_version": case.policy_version,
            "provider": case.provider.as_hex,
            "record_schema": case.record_schema,
            "record_version": version,
            "service_date": service_date,
        }
        record_json = _canonical(record)
        _require(len(record_json.encode("utf-8")) <= 32000, "record too large")
        record_digest = hashlib.sha256(record_json.encode("utf-8")).hexdigest()
        replay_domain = self._record_replay_domain(
            case_id,
            issuer,
            version,
            record_digest,
            nonce,
        )
        _require(
            replay_domain not in self.used_replay_domains,
            "evidence replayed",
        )

        revision_index = int(case.evidence_count)
        self.evidence[self._evidence_key(case_id, revision_index)] = EvidenceRecord(
            case_id=u256(case_id),
            revision_index=u256(revision_index),
            version=u256(version),
            issuer=case.issuer,
            record_digest=record_digest,
            record_json=record_json,
            service_date=service_date,
            issued_at=issued_at,
            expires_at=expires_at,
            submitted_at=submitted_at,
            nonce=nonce,
            replay_domain=replay_domain,
            evaluated=False,
        )
        self.used_replay_domains[replay_domain] = True
        case.latest_evidence_version = u256(version)
        case.evidence_count = u256(revision_index + 1)
        case.status = "SUBMITTED"
        return record_digest

    @gl.public.write
    def evaluate(self, case_id: int) -> str:
        case = self._get_case(case_id)
        _require(case.status == "SUBMITTED", "case is not submitted")
        revision_index = int(case.evidence_count) - 1
        evidence = self.evidence[self._evidence_key(case_id, revision_index)]
        _require(not evidence.evaluated, "evidence already evaluated")

        asset_hash = case.asset_hash
        cycle_id = case.cycle_id
        provider = case.provider.as_hex
        evidence_version = int(evidence.version)
        cycle_start = case.cycle_start
        cycle_end = case.cycle_end
        policy = case.policy
        policy_version = case.policy_version
        evidence_url = evidence.url

        def judge_evidence() -> str:
            try:
                web_data = gl.nondet.web.render(evidence_url, mode="text")
            except Exception:
                return _canonical(
                    self._unresolved_decision(
                        asset_hash,
                        cycle_id,
                        provider,
                        evidence_version,
                        policy_version,
                        "FETCH_FAILED",
                    )
                )
            task = f"""MAINTENANCE_EVALUATION
Evaluate only the public evidence below against the immutable case bindings.
Asset hash: {asset_hash}
Cycle: {cycle_id} from {cycle_start} through {cycle_end}
Provider: {provider}
Evidence version: {evidence_version}
Policy obligations: {policy}
Locked policy version: {policy_version}
Evidence: {web_data}

Return only JSON with exactly these keys: outcome, asset_hash, cycle_id,
provider, evidence_version, policy_version, service_date, report_issue_date,
completed, missing, contradictions, reason. outcome is COMPLIANT only when every obligation is demonstrated;
NON_COMPLIANT only for affirmative missing or failed obligations; otherwise
UNRESOLVED. Arrays contain concise strings. Never infer missing identity data.
"""
            response = gl.nondet.exec_prompt(task)
            try:
                parsed = response if isinstance(response, dict) else json.loads(response)
            except Exception:
                parsed = None
            normalized = self._normalize_decision(
                parsed,
                asset_hash,
                cycle_id,
                provider,
                evidence_version,
                policy_version,
                cycle_start,
                cycle_end,
            )
            return _canonical(normalized)

        principle = """Results are equivalent only when outcome categories match;
asset_hash, cycle_id, provider, evidence_version, policy_version, service_date,
and report_issue_date identify the
same evidence; and completed, missing, and contradiction lists express the same
obligation findings. COMPLIANT, NON_COMPLIANT, and UNRESOLVED are never
interchangeable. Reason wording may differ only when all decision-bearing fields
remain equivalent."""
        agreed = gl.eq_principle.prompt_comparative(judge_evidence, principle)
        try:
            parsed_agreed = json.loads(agreed)
        except Exception:
            parsed_agreed = None
        decision = self._normalize_decision(
            parsed_agreed,
            asset_hash,
            cycle_id,
            provider,
            evidence_version,
            policy_version,
            cycle_start,
            cycle_end,
        )
        findings_json = _canonical(decision)
        fingerprint_payload = _canonical(
            {
                key: value
                for key, value in decision.items()
                if key != "reason"
            }
        )
        fingerprint = hashlib.sha256(
            fingerprint_payload.encode("utf-8")
        ).hexdigest()
        attempt_index = int(case.attempt_count)
        self.attempts[self._attempt_key(case_id, attempt_index)] = ResolutionAttempt(
            case_id=u256(case_id),
            attempt_index=u256(attempt_index),
            evidence_version=u256(evidence_version),
            evaluator=gl.message.sender_address,
            outcome=decision["outcome"],
            fingerprint=fingerprint,
            findings_json=findings_json,
        )
        evidence.evaluated = True
        case.attempt_count = u256(attempt_index + 1)
        case.status = decision["outcome"]
        if decision["outcome"] == "COMPLIANT":
            case.certificate_fingerprint = fingerprint
        return findings_json

    @gl.public.view
    def case_count(self) -> int:
        return int(self.next_case_id)

    @gl.public.view
    def get_case(self, case_id: int) -> str:
        case = self._get_case(case_id)
        return _canonical(
            {
                "asset_hash": case.asset_hash,
                "attempt_count": int(case.attempt_count),
                "certificate_fingerprint": case.certificate_fingerprint,
                "cycle_end": case.cycle_end,
                "cycle_id": case.cycle_id,
                "cycle_start": case.cycle_start,
                "evidence_count": int(case.evidence_count),
                "id": int(case.id),
                "issuer": case.issuer.as_hex,
                "latest_evidence_version": int(case.latest_evidence_version),
                "owner": case.owner.as_hex,
                "policy": case.policy,
                "policy_hash": case.policy_hash,
                "policy_version": case.policy_version,
                "provider": case.provider.as_hex,
                "record_schema": case.record_schema,
                "status": case.status,
            }
        )

    @gl.public.view
    def get_evidence(self, case_id: int, revision_index: int) -> str:
        self._get_case(case_id)
        key = self._evidence_key(case_id, revision_index)
        _require(key in self.evidence, "evidence not found")
        evidence = self.evidence[key]
        return _canonical(
            {
                "case_id": int(evidence.case_id),
                "evaluated": evidence.evaluated,
                "expires_at": evidence.expires_at,
                "issued_at": evidence.issued_at,
                "issuer": evidence.issuer.as_hex,
                "nonce": evidence.nonce,
                "record_digest": evidence.record_digest,
                "record_json": evidence.record_json,
                "replay_domain": evidence.replay_domain,
                "revision_index": int(evidence.revision_index),
                "service_date": evidence.service_date,
                "submitted_at": evidence.submitted_at,
                "version": int(evidence.version),
            }
        )

    @gl.public.view
    def get_attempt(self, case_id: int, attempt_index: int) -> str:
        self._get_case(case_id)
        key = self._attempt_key(case_id, attempt_index)
        _require(key in self.attempts, "attempt not found")
        attempt = self.attempts[key]
        return _canonical(
            {
                "attempt_index": int(attempt.attempt_index),
                "case_id": int(attempt.case_id),
                "evaluator": attempt.evaluator.as_hex,
                "evidence_version": int(attempt.evidence_version),
                "findings": json.loads(attempt.findings_json),
                "fingerprint": attempt.fingerprint,
                "outcome": attempt.outcome,
            }
        )

    @gl.public.view
    def get_certificate(self, case_id: int) -> str:
        case = self._get_case(case_id)
        _require(case.status == "COMPLIANT", "certificate unavailable")
        attempt = self.attempts[
            self._attempt_key(case_id, int(case.attempt_count) - 1)
        ]
        return _canonical(
            {
                "asset_hash": case.asset_hash,
                "case_id": int(case.id),
                "contract_address": gl.message.contract_address.as_hex,
                "cycle_end": case.cycle_end,
                "cycle_id": case.cycle_id,
                "cycle_start": case.cycle_start,
                "evidence_version": int(attempt.evidence_version),
                "findings": json.loads(attempt.findings_json),
                "fingerprint": case.certificate_fingerprint,
                "policy": case.policy,
                "policy_version": case.policy_version,
                "provider": case.provider.as_hex,
            }
        )
