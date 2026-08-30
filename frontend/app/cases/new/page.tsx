import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateCaseForm } from "@/components/create-case-form";

export default function NewCasePage() { return <div className="page narrow"><Link className="back-link" href="/"><ArrowLeft size={16} />All cases</Link><div className="page-title"><div className="eyebrow">NEW IMMUTABLE RECORD</div><h1>Create maintenance case</h1><p>Review these bindings carefully. This intentionally frozen contract exposes no admin edit or outcome override.</p></div><CreateCaseForm /></div>; }
