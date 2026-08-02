import Link from "next/link";

const NAV = [
  { href: "/timeline", label: "Timeline" },
  { href: "/upload", label: "Upload" },
  { href: "/settings", label: "Settings" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-edge">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-10">
          <Link
            href="/"
            className="font-display text-lg uppercase tracking-tight transition-colors duration-200 hover:text-accent"
          >
            Vitals
          </Link>
          <nav className="flex gap-6">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors duration-200 hover:text-paper"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <Disclaimer />
    </>
  );
}

export function Disclaimer() {
  return (
    <footer className="border-t border-edge">
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Not medical advice
        </p>
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
    <div className="border-b border-edge">
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{eyebrow}</p>
        <h1 className="mt-5 font-display text-4xl uppercase leading-[0.95] tracking-tight md:text-6xl">
          {title}
        </h1>
        {children ? <div className="mt-6 max-w-2xl">{children}</div> : null}
      </div>
    </div>
  );
}

export function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-14 md:px-10 md:py-20">{children}</div>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{children}</p>
  );
}
