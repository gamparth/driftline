import Link from "next/link";

/** Loading placeholder — hairline blocks, no spinner. */
export function LoadingState({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-px" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-xl border border-edge bg-surface"
          style={{ animationDelay: `${i * 60}ms` }}
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
    <div className="rounded-xl border border-edge bg-surface px-8 py-16 text-center">
      <h2 className="font-display text-2xl uppercase tracking-tight">{title}</h2>
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted">{body}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-8 inline-block rounded-full border border-accent px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-accent transition-colors duration-200 hover:bg-accent hover:text-bg"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
