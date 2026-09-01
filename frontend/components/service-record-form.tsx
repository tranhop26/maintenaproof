"use client";

import { useState } from "react";
import { TransactionTimeline } from "@/components/transaction-timeline";
import { useContractClient } from "@/lib/hooks/use-cases";
import type { ServiceAttachment, ServiceMeasurement, TransactionProgress } from "@/lib/contract/types";

const emptyMeasurement = (): ServiceMeasurement => ({ name: "", value: "", unit: "" });
const emptyAttachment = (): ServiceAttachment => ({ uri: "", sha256: "" });

export function ServiceRecordForm({ caseId, nextVersion, onDone }: { caseId: number; nextVersion: number; onDone(): void }) {
  const client = useContractClient();
  const [actions, setActions] = useState([""]);
  const [measurements, setMeasurements] = useState([emptyMeasurement()]);
  const [attachments, setAttachments] = useState([emptyAttachment()]);
  const [progress, setProgress] = useState<TransactionProgress | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const result = await client.submitServiceRecord({
        caseId: BigInt(caseId), version: BigInt(nextVersion),
        serviceDate: String(data.get("serviceDate")), issuedAt: String(data.get("issuedAt")),
        expiresAt: String(data.get("expiresAt")), nonce: String(data.get("nonce")),
        completedActions: actions.filter(Boolean),
        measurements: measurements.filter(item => item.name || item.value || item.unit),
        attachments: attachments.filter(item => item.uri || item.sha256),
        notes: String(data.get("notes")),
      }, setProgress);
      if (result.ok) onDone(); else setError(result.error);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Record submission failed");
    } finally {
      setBusy(false);
    }
  }

  return <form className="record-form" onSubmit={submit}>
    <div><div className="eyebrow">ISSUER-SIGNED RECORD · V{nextVersion}</div><h2>Commit canonical service evidence</h2><p className="trust-note">Your wallet attests to the entered record. The contract derives the authoritative digest after submission.</p></div>
    <div className="split"><label>Service date<input name="serviceDate" required placeholder="YYYY-MM-DD" /></label><label>Record nonce<input name="nonce" required /></label></div>
    <div className="split"><label>Issued at (UTC)<input name="issuedAt" required placeholder="YYYY-MM-DDTHH:MM:SSZ" /></label><label>Expires at (UTC)<input name="expiresAt" required placeholder="YYYY-MM-DDTHH:MM:SSZ" /></label></div>
    <fieldset><legend>Completed actions</legend>{actions.map((value, index) => <div className="record-row" key={index}><label>Completed action {index + 1}<input value={value} onChange={event => setActions(items => items.map((item, i) => i === index ? event.target.value : item))} required /></label>{actions.length > 1 && <button type="button" className="button secondary" onClick={() => setActions(items => items.filter((_, i) => i !== index))}>Remove</button>}</div>)}<button type="button" className="button secondary" onClick={() => setActions(items => [...items, ""])}>Add action</button></fieldset>
    <fieldset><legend>Measurements (optional)</legend>{measurements.map((item, index) => <div className="record-triplet" key={index}><label>Measurement name<input value={item.name} onChange={event => setMeasurements(items => items.map((entry, i) => i === index ? { ...entry, name: event.target.value } : entry))} /></label><label>Measurement value<input value={item.value} onChange={event => setMeasurements(items => items.map((entry, i) => i === index ? { ...entry, value: event.target.value } : entry))} /></label><label>Measurement unit<input value={item.unit} onChange={event => setMeasurements(items => items.map((entry, i) => i === index ? { ...entry, unit: event.target.value } : entry))} /></label></div>)}<button type="button" className="button secondary" onClick={() => setMeasurements(items => [...items, emptyMeasurement()])}>Add measurement</button></fieldset>
    <fieldset><legend>Digest-bound attachments (optional)</legend>{attachments.map((item, index) => <div className="record-row" key={index}><label>Attachment URI<input value={item.uri} onChange={event => setAttachments(items => items.map((entry, i) => i === index ? { ...entry, uri: event.target.value } : entry))} /></label><label>Attachment SHA-256<input value={item.sha256} onChange={event => setAttachments(items => items.map((entry, i) => i === index ? { ...entry, sha256: event.target.value } : entry))} /></label></div>)}<button type="button" className="button secondary" onClick={() => setAttachments(items => [...items, emptyAttachment()])}>Add attachment</button></fieldset>
    <label>Notes<textarea name="notes" rows={3} /></label>
    {error && <div className="notice error">{error}</div>}
    {progress && <TransactionTimeline {...progress} />}
    <button className="button primary" disabled={busy}>{busy ? "Submitting…" : "Submit signed record"}</button>
  </form>;
}
