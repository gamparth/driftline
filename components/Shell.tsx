import Link from "next/link";
import { FooterLinks } from "@/components/FooterLinks";
import { PRODUCT_NAME } from "@/lib/product";
import { Logo } from "@/components/Logo";
import { WorkspaceNav } from "@/components/WorkspaceNav";
import { WorkspaceModeToggle } from "@/components/WorkspaceModeToggle";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-30 bg-white/88 shadow-[0_10px_34px_rgba(25,33,43,0.07)] backdrop-blur-xl no-print">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4 md:px-10">
          <Link href="/" aria-label={`${PRODUCT_NAME} home`}>
            <Logo />
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <WorkspaceModeToggle />
            <WorkspaceNav />
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
    <footer className="bg-[#eaf7f2] shadow-[0_-18px_50px_rgba(25,33,43,0.06)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-[1fr_auto] md:px-10">
        <div>
          <Logo />
          <h2 className="mt-7 font-display text-xl font-semibold text-ink">
            Built for prepared conversations, not self-diagnosis.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            {PRODUCT_NAME} transcribes lab reports and flags values outside the range printed on
            them. It does not diagnose, interpret, or recommend treatment. Every flag is a prompt to
            ask your doctor, not a finding. Your reports stay in this browser.
          </p>
        </div>
        <FooterLinks />
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
    <div className="page-band soft-section">
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
