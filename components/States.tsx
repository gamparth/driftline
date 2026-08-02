import Link from "next/link";

/** Loading placeholder — hairline blocks in the page's own rhythm, no spinner. */
export function LoadingState({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-xl border border-line bg-surface-2"
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
}: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-8 py-20 text-center">
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">{body}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-8 inline-block rounded-full bg-brand px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white transition-opacity duration-200 hover:opacity-90"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
