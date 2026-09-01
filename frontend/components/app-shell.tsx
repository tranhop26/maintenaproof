import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { WalletButton } from "@/components/wallet-button";

export function AppShell({ children }: { children: React.ReactNode }) {
  return <><header className="site-header"><Link href="/" className="brand"><span className="brand-mark"><ShieldCheck size={20} /></span><span>MaintenaProof<small>Issuer-signed, digest-bound records</small></span></Link><WalletButton /></header><main>{children}</main><footer>V2 · INTENTIONALLY_FROZEN · GENLAYER STUDIONET</footer></>;
}
