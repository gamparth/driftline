import Link from "next/link";

/** Loading placeholder — hairline blocks in the page's own rhythm, no spinner. */
export function LoadingState({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-xl border border-line bg-white shadow-[var(--shadow-card)]"
          style={{ animationDelay: `${i * 70}ms` }}
        />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
  titleAs = "h2",
}: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
  titleAs?: "h1" | "h2";
}) {
  const Heading = titleAs;
  return (
    <div className="rounded-xl border border-brand/20 bg-white px-8 py-16 text-center shadow-[var(--shadow-card)] md:py-20">
      <div className="mx-auto mb-5 h-2 w-24 rounded-full bg-brand" />
      <Heading className="font-display text-3xl font-semibold text-ink">{title}</Heading>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-soft">{body}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="brand-gradient mt-8 inline-block rounded-full px-6 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white shadow-[var(--shadow-card)] transition-transform duration-200 hover:-translate-y-0.5"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
