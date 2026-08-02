import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/timeline", label: "Overview" },
  { href: "/upload", label: "Upload" },
  { href: "/summary", label: "Visit" },
  { href: "/reports", label: "Data" },
  { href: "/settings", label: "Settings" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-line no-print">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-5 md:px-10">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-brand" />
            <span className="font-display text-lg text-ink">Vitals</span>
          </Link>
          <div className="flex items-center gap-5">
            <nav className="flex flex-wrap gap-5">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted transition-colors duration-200 hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <Disclaimer />
    </>
  );
}

export function Disclaimer() {
  return (
    <footer className="border-t border-line bg-surface-2">
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <Label>Not medical advice</Label>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Vitals transcribes your lab reports and flags values outside the range printed on them.
          It does not diagnose, interpret, or recommend treatment. Every flag is a prompt to ask
          your doctor, not a finding. Your reports stay in this browser.
        </p>
      </div>
    </footer>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16">
        <Label>{eyebrow}</Label>
        <h1 className="mt-3 font-display text-3xl leading-[1.1] text-ink md:text-4xl">{title}</h1>
        {children ? <div className="mt-6 max-w-2xl">{children}</div> : null}
      </div>
    </div>
  );
}

export function Section({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl px-6 py-14 md:px-10 md:py-20">{children}</div>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{children}</p>;
}

export function Stat({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: string;
  tone?: "ink" | "alert" | "warn" | "ok";
}) {
  const toneClass =
    tone === "alert"
      ? "text-alert"
      : tone === "warn"
        ? "text-warn"
        : tone === "ok"
          ? "text-ok"
          : "text-ink";
  return (
    <div>
      <Label>{label}</Label>
      <p className={`mt-2 font-mono text-2xl tabular ${toneClass}`}>{value}</p>
    </div>
  );
}
