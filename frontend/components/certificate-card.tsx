import { ExternalLink, Fingerprint } from "lucide-react";
import type { Certificate } from "@/lib/contract/types";
import { EXPLORER_URL } from "@/lib/genlayer/config";

export function CertificateCard({ certificate }: { certificate: Certificate }) {
  return <section className="certificate"><div className="certificate-icon"><Fingerprint /></div><div><div className="eyebrow">COMPLIANCE CERTIFICATE</div><h2>Maintenance verified</h2><p>{certificate.findings.reason}</p><dl className="data-grid"><div><dt>Fingerprint</dt><dd><code>{certificate.fingerprint}</code></dd></div><div><dt>Service date</dt><dd>{certificate.findings.service_date}</dd></div><div><dt>Evidence revision</dt><dd>v{certificate.evidence_version}</dd></div></dl><a className="text-link" href={`${EXPLORER_URL}/address/${certificate.contract_address}`} target="_blank" rel="noreferrer">View contract <ExternalLink size={15} /></a></div></section>;
}
