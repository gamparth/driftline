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
    <nav className="flex w-max min-w-full flex-nowrap items-center gap-1 rounded-full bg-white/95 px-1.5 py-1 shadow-[var(--shadow-card)] ring-1 ring-black/[0.04] md:min-w-0">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-full px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors duration-200 sm:tracking-[0.14em] ${
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
