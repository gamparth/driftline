"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspaceMode } from "@/lib/hooks/useWorkspaceMode";

const REAL_NAV = [
  { href: "/timeline", label: "Dashboard" },
  { href: "/upload", label: "Upload" },
  { href: "/summary", label: "Visit" },
  { href: "/reports", label: "Records" },
  { href: "/settings", label: "Settings" },
];

const DEMO_NAV = [
  { href: "/timeline", label: "Dashboard" },
  { href: "/summary", label: "Visit" },
  { href: "/reports", label: "Records" },
  { href: "/settings", label: "Settings" },
];

export function WorkspaceNav() {
  const [mode] = useWorkspaceMode();
  const pathname = usePathname();
  const items = mode === "demo" ? DEMO_NAV : REAL_NAV;

  return (
    <nav className="flex flex-wrap items-center gap-1 rounded-full bg-white px-1.5 py-1 shadow-[var(--shadow-card)] ring-1 ring-black/[0.05]">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-200 ${
              active
                ? "bg-brand-soft text-brand"
                : "text-muted hover:bg-brand-soft hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
