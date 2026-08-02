"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader, Section, Shell } from "@/components/Shell";
import { EmptyState, LoadingState } from "@/components/States";
import { MarkerChart } from "@/components/Chart";
import { useVitals } from "@/lib/hooks/useVitals";

export default function MarkerPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <Section>
            <LoadingState rows={3} />
          </Section>
        </Shell>
      }
    >
      <MarkerDetail />
    </Suspense>
  );
}

function MarkerDetail() {
  const params = useSearchParams();
  const markerId = params.get("id");
  const unit = params.get("unit");
  const { state, series, flags } = useVitals();

  const match = useMemo(
    () => series.find((s) => s.markerId === markerId && (unit === null || s.unit === unit)),
    [series, markerId, unit],
  );

  const markerFlags = useMemo(
    () => flags.filter((f) => f.markerId === markerId),
    [flags, markerId],
  );

  if (state === "loading") {
    return (
      <Shell>
        <Section>
          <LoadingState rows={3} />
        </Section>
      </Shell>
    );
  }

  if (!match) {
    return (
      <Shell>
        <Section>
          <EmptyState
            title="Marker not found"
            body="This marker isn't in your record. It may have been wiped, or the link may be stale."
            actionHref="/timeline"
            actionLabel="Back to timeline"
          />
        </Section>
      </Shell>
    );
  }

  const first = match.points[0];
  const latest = match.points[match.points.length - 1];
  const change =
    match.points.length > 1 && first.value !== 0
      ? ((latest.value - first.value) / Math.abs(first.value)) * 100
      : null;

  return (
    <Shell>
      <PageHeader eyebrow="Marker" title={match.markerLabel}>
        <div className="flex flex-wrap gap-x-12 gap-y-4">
          <Stat label="Latest" value={`${latest.value} ${match.unit}`} />
          <Stat label="Samples" value={String(match.points.length)} />
          {change !== null ? (
            <Stat
              label="Since first"
              value={`${change > 0 ? "+" : ""}${change.toFixed(1)}%`}
              accent={Math.abs(change) > 20}
            />
          ) : null}
          <Stat
            label="Flags"
            value={String(markerFlags.length)}
            accent={markerFlags.length > 0}
          />
        </div>
      </PageHeader>

      <Section>
        <MarkerChart series={match} />

        <div className="mt-16">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Samples</p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-y border-edge text-left">
                  {["Date", "Value", "Reference", "Lab"].map((h) => (
                    <th
                      key={h}
                      className="py-3 pr-6 font-mono text-[10px] font-normal uppercase tracking-[0.2em] text-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {[...match.points].reverse().map((point, i) => {
                  const r = point.referenceRange;
                  const out =
                    r !== null &&
                    ((r.low !== null && point.value < r.low) ||
                      (r.high !== null && point.value > r.high));
                  return (
                    <tr key={i}>
                      <td className="py-3.5 pr-6 font-mono tabular-nums">{point.sampledAt}</td>
                      <td
                        className={`py-3.5 pr-6 font-mono tabular-nums ${out ? "text-accent" : ""}`}
                      >
                        {point.value} {point.unit}
                      </td>
                      <td className="py-3.5 pr-6 font-mono tabular-nums text-muted">
                        {formatRange(r)}
                      </td>
                      <td className="py-3.5 pr-6 text-muted">{point.lab}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {markerFlags.length > 0 ? (
          <div className="mt-16">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
              Drift history
            </p>
            <ul className="mt-5 divide-y divide-white/10 border-y border-edge">
              {markerFlags.map((flag, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                    {flag.sampledAt}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
                    {flag.kind === "delta" ? "Large move" : "Out of range"}
                  </span>
                  <span className="text-sm text-muted">{flag.detail}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted">
              A flag means a rule fired, not that something is wrong. Bring it up at your next
              appointment.
            </p>
          </div>
        ) : null}

        <Link
          href="/timeline"
          className="mt-16 inline-block font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors duration-200 hover:text-paper"
        >
          ← Back to timeline
        </Link>
      </Section>
    </Shell>
  );
}

function formatRange(range: { low: number | null; high: number | null } | null): string {
  if (!range) return "—";
  if (range.low !== null && range.high !== null) return `${range.low} – ${range.high}`;
  if (range.high !== null) return `< ${range.high}`;
  return `> ${range.low}`;
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
