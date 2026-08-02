"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader, Section, Shell } from "@/components/Shell";
import { EmptyState, LoadingState } from "@/components/States";
import { Sparkline } from "@/components/Chart";
import { QuestionsPanel } from "@/components/QuestionsPanel";
import { useVitals } from "@/lib/hooks/useVitals";
import { wipeAll } from "@/lib/storage/db";
import type { MarkerSeries } from "@/lib/engine/types";

export default function TimelinePage() {
  const { state, reports, series, flags, reload } = useVitals();
  const [confirmWipe, setConfirmWipe] = useState(false);

  const flagsByMarker = useMemo(() => {
    const map = new Map<string, number>();
    for (const flag of flags) map.set(flag.markerId, (map.get(flag.markerId) ?? 0) + 1);
    return map;
  }, [flags]);

  const span = useMemo(() => {
    const dates = reports.map((r) => r.sampledAt).sort();
    return dates.length > 0 ? { first: dates[0], last: dates[dates.length - 1] } : null;
  }, [reports]);

  return (
    <Shell>
      <PageHeader eyebrow="Your record" title="Timeline">
        {state === "ready" ? (
          <div className="flex flex-wrap gap-x-12 gap-y-4">
            <Stat label="Reports" value={String(reports.length)} />
            <Stat label="Markers" value={String(series.length)} />
            <Stat label="Flags" value={String(flags.length)} accent={flags.length > 0} />
            {span ? <Stat label="Span" value={`${span.first} → ${span.last}`} /> : null}
          </div>
        ) : null}
      </PageHeader>

      <Section>
        {state === "loading" ? <LoadingState rows={4} /> : null}

        {state === "empty" ? (
          <EmptyState
            title="No reports yet"
            body="Add a lab-report PDF and its markers will appear here as a trend line. You can also load four synthetic reports from the landing page to see how it works."
            actionHref="/upload"
            actionLabel="Add a report"
          />
        ) : null}

        {state === "ready" ? (
          <>
            {series.length === 0 ? (
              <EmptyState
                title="Nothing extracted yet"
                body="Reports are stored, but no markers were read from them. Check the review queue on the upload page."
                actionHref="/upload"
                actionLabel="Open review queue"
              />
            ) : (
              <div className="grid gap-px border border-edge bg-edge sm:grid-cols-2 lg:grid-cols-3">
                {series.map((s) => (
                  <MarkerCard key={`${s.markerId}-${s.unit}`} series={s} flags={flagsByMarker.get(s.markerId) ?? 0} />
                ))}
              </div>
            )}

            <QuestionsPanel flags={flags} />

            <div className="mt-20 border-t border-edge pt-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                Your data
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
                {reports.length} report{reports.length === 1 ? "" : "s"} stored in this
                browser&apos;s IndexedDB. Wiping is immediate and cannot be undone — there is no
                copy anywhere else.
              </p>
              {confirmWipe ? (
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <button
                    onClick={async () => {
                      await wipeAll();
                      setConfirmWipe(false);
                      await reload();
                    }}
                    className="rounded-full border border-accent bg-accent px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-bg transition-opacity duration-200 hover:opacity-85"
                  >
                    Yes, delete everything
                  </button>
                  <button
                    onClick={() => setConfirmWipe(false)}
                    className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors duration-200 hover:text-paper"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmWipe(true)}
                  className="mt-6 rounded-full border border-edge px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors duration-200 hover:border-accent hover:text-accent"
                >
                  Wipe all data
                </button>
              )}
            </div>
          </>
        ) : null}
      </Section>
    </Shell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{label}</p>
      <p
        className={`mt-2 font-mono text-2xl tabular-nums ${accent ? "text-accent" : "text-paper"}`}
      >
        {value}
      </p>
    </div>
  );
}

function MarkerCard({ series, flags }: { series: MarkerSeries; flags: number }) {
  const latest = series.points[series.points.length - 1];
  return (
    <Link
      href={`/marker?id=${encodeURIComponent(series.markerId)}&unit=${encodeURIComponent(series.unit)}`}
      className="group bg-bg p-6 transition-colors duration-200 hover:bg-surface"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-sm uppercase tracking-tight">{series.markerLabel}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            {series.points.length} sample{series.points.length === 1 ? "" : "s"} · {series.unit}
          </p>
        </div>
        {flags > 0 ? (
          <span className="shrink-0 rounded-full border border-accent/40 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.15em] text-accent">
            {flags} flag{flags === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <div className="mt-5">
        <Sparkline series={series} />
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <span className="font-mono text-lg tabular-nums">{latest.value}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          {latest.sampledAt}
        </span>
      </div>
    </Link>
  );
}
