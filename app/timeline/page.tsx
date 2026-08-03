"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Label, Section, Shell } from "@/components/Shell";
import { LoadingState } from "@/components/States";
import { MarkerCard, markerHref } from "@/components/MarkerCard";
import { StatusChip } from "@/components/Status";
import { useVitals } from "@/lib/hooks/useVitals";
import type { MarkerInsight } from "@/lib/engine/insights";
import { describeGap, formatDate, formatPercent, formatValue } from "@/lib/format";

type Filter = "all" | "attention" | "out-of-range";
type Sort = "attention" | "name" | "recent";

export default function OverviewPage() {
  const { state, reports, insights, attention, panels, latestDraw, summary, mode } = useVitals();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("attention");

  const isEmpty = state !== "loading" && (state === "empty" || insights.length === 0);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = insights.filter((i) =>
      needle === "" ? true : i.markerLabel.toLowerCase().includes(needle),
    );
    if (filter === "attention") list = list.filter((i) => i.significance > 0);
    if (filter === "out-of-range") list = list.filter((i) => i.status === "out-of-range");

    return [...list].sort((a, b) => {
      if (sort === "name") return a.markerLabel.localeCompare(b.markerLabel);
      if (sort === "recent") return b.latest.sampledAt.localeCompare(a.latest.sampledAt);
      return b.significance - a.significance || a.markerLabel.localeCompare(b.markerLabel);
    });
  }, [insights, query, filter, sort]);

  const grouped = useMemo(() => {
    const ids = new Set(visible.map((v) => `${v.markerId}-${v.unit}`));
    return panels
      .map((p) => ({
        ...p,
        insights: p.insights.filter((i) => ids.has(`${i.markerId}-${i.unit}`)),
      }))
      .filter((p) => p.insights.length > 0);
  }, [panels, visible]);

  if (state === "loading") {
    return (
      <Shell>
        <Section>
          <LoadingState rows={4} />
        </Section>
      </Shell>
    );
  }

  if (isEmpty) {
    return (
      <Shell>
        <EmptyDashboard mode={mode} />
      </Shell>
    );
  }

  return (
    <Shell>
      {/* The read on the record, stated before any table. */}
      <div className="page-band soft-section">
        <div className="mx-auto max-w-6xl px-6 py-14 md:px-10 md:py-16">
          <Label>Your record</Label>
          <h1 className="mt-4 max-w-3xl font-display text-3xl leading-[1.1] text-ink md:text-[2.6rem]">
            {headline(summary.outOfRange, attention.length)}
          </h1>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile label="Markers tracked" value={String(summary.markers)} />
            <Tile
              label="Outside range"
              value={String(summary.outOfRange)}
              tone={summary.outOfRange > 0 ? "alert" : "ok"}
            />
            <Tile label="In range" value={String(summary.inRange)} tone="ok" />
            <Tile
              label="History"
              value={
                summary.firstDate && summary.lastDate
                  ? describeGap(summary.firstDate, summary.lastDate)
                  : "—"
              }
              sub={`${reports.length} report${reports.length === 1 ? "" : "s"}`}
            />
          </div>

          {latestDraw ? (
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted">
              Most recent draw{" "}
              <strong className="font-medium text-ink">{formatDate(latestDraw.sampledAt)}</strong> —{" "}
              {latestDraw.measured} marker{latestDraw.measured === 1 ? "" : "s"} measured,{" "}
              {latestDraw.outOfRange} outside range
              {latestDraw.moved.length > 0
                ? `, ${latestDraw.moved.length} moved more than 20% since the previous draw`
                : ""}
              .
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/summary"
              className="brand-gradient rounded-full px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white shadow-[var(--shadow-card)] transition-transform duration-200 hover:-translate-y-0.5"
            >
              Visit summary
            </Link>
            <Link
              href="/upload"
              className="rounded-full border border-line bg-white px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink shadow-[var(--shadow-card)] transition-colors duration-200 hover:bg-brand-soft"
            >
              Add reports
            </Link>
            <Link
              href="/reports"
              className="rounded-full border border-line bg-white px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted shadow-[var(--shadow-card)] transition-colors duration-200 hover:bg-accent-soft hover:text-ink"
            >
              Manage data
            </Link>
          </div>
        </div>
      </div>

      <Section>
        {attention.length > 0 ? (
          <section className="mb-16">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="font-display text-xl text-ink">Worth a look</h2>
              <Label>
                {attention.length} of {insights.length} markers
              </Label>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Ordered by how far outside the printed range each value sits and how much it moved.
              This is arithmetic, not triage — your doctor decides what matters.
            </p>
            <ul className="mt-6 divide-y divide-[var(--hairline)] overflow-hidden rounded-xl bg-white shadow-[var(--shadow-card)] ring-1 ring-black/[0.04]">
              {attention.slice(0, 8).map((insight) => (
                <AttentionRow key={`${insight.markerId}-${insight.unit}`} insight={insight} />
              ))}
            </ul>
          </section>
        ) : (
          <section className="mb-16 rounded-xl border border-ok/25 bg-ok-soft px-6 py-8">
            <h2 className="font-display text-xl text-ink">Everything is inside its printed range</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
              No marker in your record is outside the range its lab printed, and nothing moved more
              than 20% between consecutive samples.
            </p>
          </section>
        )}

        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 shadow-[var(--shadow-card)] ring-1 ring-black/[0.04]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search markers…"
            aria-label="Search markers"
            className="min-w-[200px] flex-1 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
          />
          <SegmentedControl
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: `All ${insights.length}` },
              { value: "attention", label: "Flagged" },
              { value: "out-of-range", label: "Out of range" },
            ]}
          />
          <SegmentedControl
            value={sort}
            onChange={setSort}
            options={[
              { value: "attention", label: "Notable" },
              { value: "name", label: "A–Z" },
              { value: "recent", label: "Recent" },
            ]}
          />
        </div>

        {visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">No markers match those filters.</p>
        ) : (
          <div className="mt-12 space-y-14">
            {grouped.map((group) => (
              <section key={group.panel.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-[var(--shadow-card)] ring-1 ring-black/[0.04]">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <h2 className="font-display text-lg text-ink">{group.panel.label}</h2>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                      {group.panel.blurb}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    {group.outOfRange > 0 ? (
                      <span className="text-alert">{group.outOfRange} outside range</span>
                    ) : (
                      <span className="text-ok">all in range</span>
                    )}{" "}
                    · {group.insights.length} shown
                  </span>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.insights.map((insight) => (
                    <MarkerCard key={`${insight.markerId}-${insight.unit}`} insight={insight} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </Section>
    </Shell>
  );
}

function EmptyDashboard({ mode }: { mode: "real" | "demo" }) {
  const isDemo = mode === "demo";
  return (
    <>
      <div className="page-band soft-section">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:px-10 md:py-14">
          <Label>{isDemo ? "Demo dashboard" : "Your dashboard"}</Label>
          <h1 className="mt-4 max-w-3xl font-display text-[2.15rem] font-semibold leading-[1.04] text-ink sm:text-4xl md:text-5xl">
            {isDemo ? "Load sample reports to see the dashboard." : "Add reports to build your lab timeline."}
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            {isDemo
              ? "The demo dashboard uses sample PDFs, runs the same parser, and keeps every value clearly labeled as demo data."
              : "Drop in your own lab-report PDFs and Driftline will turn them into markers, flags, trends, and a visit-ready summary in this browser."}
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={isDemo ? "/demo" : "/upload"}
              className="brand-gradient rounded-full px-5 py-3 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-white shadow-[var(--shadow-card)] transition-transform duration-200 hover:-translate-y-0.5"
            >
              {isDemo ? "Load demo data" : "Upload reports"}
            </Link>
            <Link
              href={isDemo ? "/reports" : "/settings"}
              className="rounded-full border border-line bg-white px-5 py-3 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-ink shadow-[var(--shadow-card)] transition-colors duration-200 hover:bg-brand-soft"
            >
              {isDemo ? "View records" : "Add API key"}
            </Link>
          </div>
        </div>
      </div>

      <Section>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["01", "Upload", isDemo ? "Start from the bundled sample PDFs." : "Add PDFs from your lab portal or import an exported record."],
            ["02", "Review", "Unreadable layouts land in a queue so the app never guesses silently."],
            ["03", "Prepare", "Open a dashboard, marker drilldowns, and a visit summary once values are read."],
          ].map(([step, title, body]) => (
            <div
              key={step}
              className="rounded-xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-black/[0.04] md:p-6"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand">
                {step}
              </span>
              <h2 className="mt-5 font-display text-xl text-ink">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function headline(outOfRange: number, attention: number): string {
  if (outOfRange === 0 && attention === 0) return "Everything reads inside its printed range.";
  if (outOfRange === 0)
    return `${attention} marker${attention === 1 ? "" : "s"} moved enough to be worth a look.`;
  return `${outOfRange} marker${outOfRange === 1 ? " sits" : "s sit"} outside the range your lab printed.`;
}

function Tile({
  label,
  value,
  sub,
  tone = "ink",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "ink" | "ok" | "alert";
}) {
  const toneClass = tone === "alert" ? "text-alert" : tone === "ok" ? "text-ok" : "text-ink";
  return (
    <div className="rounded-xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-black/[0.04]">
      <Label>{label}</Label>
      <p className={`mt-2 font-mono text-2xl tabular ${toneClass}`}>{value}</p>
      {sub ? <p className="mt-1 font-mono text-[10px] text-muted">{sub}</p> : null}
    </div>
  );
}

function AttentionRow({ insight }: { insight: MarkerInsight }) {
  const reasons: string[] = [];
  const range = insight.latest.referenceRange;
  if (insight.status === "out-of-range" && range) {
    if (range.high !== null && insight.latest.value > range.high) {
      reasons.push(`above the printed maximum of ${formatValue(range.high)}`);
    } else if (range.low !== null && insight.latest.value < range.low) {
      reasons.push(`below the printed minimum of ${formatValue(range.low)}`);
    }
  }
  if (insight.changePct !== null && Math.abs(insight.changePct) >= 20) {
    reasons.push(`${formatPercent(insight.changePct)} since the previous draw`);
  }

  return (
    <li>
      <Link
        href={markerHref(insight)}
        className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 transition-colors duration-200 hover:bg-surface-2"
      >
        <span className="min-w-[9rem] flex-1 font-display text-base text-ink">
          {insight.markerLabel}
        </span>
        <span
          className={`font-mono text-base tabular ${
            insight.status === "out-of-range" ? "text-alert" : "text-ink"
          }`}
        >
          {formatValue(insight.latest.value)}{" "}
          <span className="text-[11px] text-muted">{insight.unit}</span>
        </span>
        <span className="min-w-[13rem] flex-1 text-sm text-muted">
          {reasons.length > 0 ? reasons.join(", ") : "flagged in an earlier draw"}
        </span>
        <StatusChip status={insight.status} />
      </Link>
    </li>
  );
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="flex rounded-lg border border-line bg-surface p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`rounded-md px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors duration-200 ${
            value === option.value ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
