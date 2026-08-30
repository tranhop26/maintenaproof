import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { Providers } from "@/app/providers";
import "./globals.css";

export const metadata: Metadata = { title: "MaintenaProof", description: "Contract-verified equipment maintenance records" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><Providers><AppShell>{children}</AppShell></Providers></body></html>; }
