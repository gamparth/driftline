"use client";

import Link from "next/link";
import { useWorkspaceMode } from "@/lib/hooks/useWorkspaceMode";

const REAL_LINKS = [
  ["Dashboard", "/timeline"],
  ["Upload", "/upload"],
  ["Records", "/reports"],
  ["Settings", "/settings"],
];

const DEMO_LINKS = [
  ["Dashboard", "/timeline"],
  ["Visit", "/summary"],
  ["Records", "/reports"],
  ["Settings", "/settings"],
];

export function FooterLinks() {
  const [mode] = useWorkspaceMode();
  const links = mode === "demo" ? DEMO_LINKS : REAL_LINKS;

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-3 self-end md:justify-end">
      {links.map(([label, href]) => (
        <Link
          key={href}
          href={href}
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors duration-200 hover:text-ink"
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
