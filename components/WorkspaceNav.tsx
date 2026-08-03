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
    <nav className="flex w-max min-w-full flex-nowrap items-center gap-7 border-b border-line bg-white/80 px-1 md:min-w-0 md:gap-1 md:rounded-full md:border-b-0 md:bg-white/95 md:px-1.5 md:py-1 md:shadow-[var(--shadow-card)] md:ring-1 md:ring-black/[0.04]">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative shrink-0 px-0 py-3 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors duration-200 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:rounded-full after:content-[''] sm:tracking-[0.14em] md:rounded-full md:px-3 md:py-2 md:after:hidden ${
              active
                ? "text-ink after:bg-ink md:bg-brand-soft md:text-brand"
                : "text-muted after:bg-transparent hover:text-ink md:hover:bg-brand-soft"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
