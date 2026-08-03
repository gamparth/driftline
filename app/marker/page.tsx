"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Label, Section, Shell } from "@/components/Shell";
import { EmptyState, LoadingState } from "@/components/States";
import { MarkerChart } from "@/components/Chart";
import { RangeMeter, StatusChip, TrendBadge } from "@/components/Status";
import { useLabloomData } from "@/lib/hooks/useLabloomData";
import { getMarker, getPanel } from "@/lib/engine/markers";
import { classify } from "@/lib/engine/insights";
import {
  describeGap,
  formatDate,
  formatPercent,
  formatRange,
  formatValue,
} from "@/lib/format";
import { PRODUCT_NAME } from "@/lib/product";

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
  const { state, insights } = useLabloomData();

  const insight = useMemo(
    () => insights.find((i) => i.markerId === markerId && (unit === null || i.unit === unit)),
    [insights, markerId, unit],
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

  if (!insight) {
    return (
      <Shell>
        <Section>
          <EmptyState
            title="Marker not in your record"
            body="It may have been wiped, or this link may be stale."
            actionHref="/timeline"
            actionLabel="Back to overview"
            titleAs="h1"
          />
        </Section>
      </Shell>
    );
  }

  const points = insight.series.points;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const panel = getPanel(insight.panel);
  const def = getMarker(insight.markerId);

  return (
    <Shell>
      <div className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16">
          <Link
            href="/timeline"
            className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted transition-colors duration-200 hover:text-ink"
          >
            ← Overview
          </Link>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <div>
              <Label>{panel.label}</Label>
              <h1 className="mt-3 font-display text-3xl text-ink md:text-4xl">
                {insight.markerLabel}
              </h1>
            </div>
            <StatusChip status={insight.status} />
          </div>

          {/* Latest value, stated plainly with its range */}
          <div className="mt-10 grid gap-8 md:grid-cols-[minmax(0,20rem)_1fr] md:items-center">
            <div>
              <Label>Latest · {formatDate(insight.latest.sampledAt)}</Label>
              <p className="mt-3 flex items-baseline gap-2">
                <span
                  className={`font-mono text-5xl tabular ${
                    insight.status === "out-of-range" ? "text-alert" : "text-ink"
                  }`}
                >
                  {formatValue(insight.latest.value)}
                </span>
                <span className="font-mono text-sm text-muted">{insight.unit}</span>
              </p>
              <div className="mt-4">
                <TrendBadge trend={insight.trend} changePct={insight.changePct} />
              </div>
            </div>

            <div>
              <RangeMeter
                value={insight.latest.value}
                range={insight.latest.referenceRange}
                unit={insight.unit}
              />
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {plainReading(insight.status, insight.latest.value, insight.latest.referenceRange, insight.unit)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Section>
        <MarkerChart series={insight.series} />

        {/* Analytics that answer the obvious follow-up questions */}
        <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-4">
          <Metric
            label="Since previous"
            value={insight.changePct === null ? "—" : formatPercent(insight.changePct)}
            sub={insight.previous ? formatDate(insight.previous.sampledAt) : "no earlier sample"}
          />
          <Metric
            label="Since first"
            value={
              insight.changeSinceFirstPct === null
                ? "—"
                : formatPercent(insight.changeSinceFirstPct)
            }
            sub={
              points.length > 1
                ? describeGap(insight.first.sampledAt, insight.latest.sampledAt)
                : "single sample"
            }
          />
          <Metric
            label="Time in range"
            value={
              insight.timeInRangePct === null ? "—" : `${Math.round(insight.timeInRangePct)}%`
            }
            sub={`${points.length} sample${points.length === 1 ? "" : "s"}`}
          />
          <Metric
            label="Observed range"
            value={`${formatValue(min)}–${formatValue(max)}`}
            sub={insight.unit}
          />
        </div>

        {/* Every sample, with the range each lab printed at the time */}
        <div className="mt-14">
          <h2 className="font-display text-lg text-ink">Every sample</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Reference ranges come from each report individually — labs differ, so a value can be
            in range at one lab and outside it at another.
          </p>
          <div className="mt-5 overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  {["Date", "Value", "Reference printed", "Status", "Lab"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hairline)]">
                {[...points].reverse().map((point, i) => {
                  const status = classify(point.value, point.referenceRange);
                  return (
                    <tr key={i}>
                      <td className="whitespace-nowrap px-5 py-3.5 font-mono tabular text-ink">
                        {formatDate(point.sampledAt)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-5 py-3.5 font-mono tabular ${
                          status === "out-of-range" ? "text-alert" : "text-ink"
                        }`}
                      >
                        {formatValue(point.value)} {point.unit}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-mono tabular text-muted">
                        {formatRange(point.referenceRange)}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusChip status={status} compact />
                      </td>
                      <td className="px-5 py-3.5 text-muted">{point.lab}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {insight.flags.length > 0 ? (
          <div className="mt-14">
            <h2 className="font-display text-lg text-ink">Why this is flagged</h2>
            <ul className="mt-5 divide-y divide-[var(--hairline)] overflow-hidden rounded-xl border border-line bg-surface">
              {insight.flags.map((flag, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-4">
                  <span className="font-mono text-[11px] tabular text-muted">
                    {formatDate(flag.sampledAt)}
                  </span>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.14em] ${
                      flag.kind === "delta" ? "text-warn" : "text-alert"
                    }`}
                  >
                    {flag.kind === "delta" ? "Large move" : "Out of range"}
                  </span>
                  <span className="text-sm text-ink-soft">{flag.detail}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted">
              A flag means a rule fired — a value outside its printed range, or a move over 20%
              between draws. It is not a finding. Bring it to your next appointment.
            </p>
          </div>
        ) : null}

        {def ? (
          <p className="mt-14 max-w-2xl text-sm leading-relaxed text-muted">
            Values are stored in <span className="font-mono text-ink">{def.canonicalUnit}</span>;
            reports using other units are converted with a fixed table so the trend line stays
            comparable across labs.
          </p>
        ) : null}
      </Section>
    </Shell>
  );
}

function plainReading(
  status: ReturnType<typeof classify>,
  value: number,
  range: { low: number | null; high: number | null } | null,
  unit: string,
): string {
  if (!range || status === "unknown") {
    return `This report printed no reference range for this marker, so ${PRODUCT_NAME} has nothing to compare the value against.`;
  }
  if (status === "in-range") {
    return `Inside the ${formatRange(range)} ${unit} range printed on this report.`;
  }
  if (range.high !== null && value > range.high) {
    const over = ((value - range.high) / Math.abs(range.high)) * 100;
    return `${formatValue(value - range.high)} ${unit} above the printed maximum of ${formatValue(range.high)} — about ${Math.round(over)}% over.`;
  }
  if (range.low !== null && value < range.low) {
    const under = ((range.low - value) / Math.abs(range.low)) * 100;
    return `${formatValue(range.low - value)} ${unit} below the printed minimum of ${formatValue(range.low)} — about ${Math.round(under)}% under.`;
  }
  return `Outside the ${formatRange(range)} ${unit} range printed on this report.`;
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface p-5">
      <Label>{label}</Label>
      <p className="mt-2 font-mono text-xl tabular text-ink">{value}</p>
      {sub ? <p className="mt-1 font-mono text-[10px] text-muted">{sub}</p> : null}
    </div>
  );
}
