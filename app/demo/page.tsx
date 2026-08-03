"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DemoButton } from "@/components/DemoButton";
import { PageHeader, Section, Shell, Stat } from "@/components/Shell";
import { EmptyState, LoadingState } from "@/components/States";
import { useLabloomData } from "@/lib/hooks/useLabloomData";
import { DEMO_FILES } from "@/lib/ingest";
import { deleteReportsBySource } from "@/lib/storage/db";
import { formatDate } from "@/lib/format";
import { PRODUCT_NAME } from "@/lib/product";
import { useWorkspaceMode } from "@/lib/hooks/useWorkspaceMode";

export default function DemoPage() {
  const { state, reports, summary, attention, reload } = useLabloomData();
  const [, setMode] = useWorkspaceMode();
  const [notice, setNotice] = useState<string | null>(null);
  const demoReports = useMemo(() => reports.filter((report) => report.source === "demo"), [reports]);
  const demoMarkers = demoReports.reduce((sum, report) => sum + report.values.length, 0);

  useEffect(() => {
    setMode("demo");
  }, [setMode]);

  if (state === "loading") {
    return (
      <Shell>
        <Section>
          <LoadingState rows={3} />
        </Section>
      </Shell>
    );
  }

  return (
    <Shell>
      <PageHeader eyebrow="Demo workspace" title="Explore with sample lab reports">
        <p className="text-sm leading-relaxed text-muted">
          Demo data runs through the same PDF parser and timeline engine as real uploads, but every
          sample report is labeled as demo data so it never looks like your own health record.
        </p>
      </PageHeader>

      <Section>
        {notice ? (
          <p className="mb-6 rounded-lg border border-ok/30 bg-ok-soft px-4 py-3 text-sm text-ok">
            {notice}
          </p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
          <div className="rounded-xl border border-line bg-surface p-5 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <h2 className="font-display text-2xl leading-tight text-ink md:text-3xl">
                  Synthetic longitudinal record
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
                  Load four sample PDFs from different fictional labs, spanning multiple years. Use
                  it to evaluate dashboard filtering, marker drilldowns, visit summaries, exports,
                  and the review model without mixing in real files.
                </p>
              </div>
              <DemoButton label={demoReports.length > 0 ? "Reload demo" : "Load demo"} />
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Stat label="Demo reports" value={String(demoReports.length)} />
              <Stat label="Demo markers" value={String(demoMarkers)} />
              <Stat
                label="Flagged markers"
                value={String(attention.length)}
                tone={attention.length > 0 ? "warn" : "ok"}
              />
            </div>

            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
              <Link
                href="/timeline"
                className="rounded-full bg-brand px-5 py-2.5 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-white transition-opacity duration-200 hover:opacity-90"
              >
                Open dashboard
              </Link>
              <Link
                href="/summary"
                className="rounded-full border border-line px-5 py-2.5 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-ink transition-colors duration-200 hover:border-line-strong"
              >
                View visit summary
              </Link>
              <button
                onClick={async () => {
                  const removed = await deleteReportsBySource("demo");
                  await reload();
                  setNotice(`Removed ${removed} demo report${removed === 1 ? "" : "s"}.`);
                }}
                disabled={demoReports.length === 0}
                className="rounded-full border border-line px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition-colors duration-200 hover:border-line-strong hover:text-alert disabled:opacity-40"
              >
                Clear demo data
              </button>
            </div>
          </div>

          <aside className="rounded-xl border border-line bg-surface p-5 md:p-6">
            <h2 className="font-display text-lg text-ink">Included PDFs</h2>
            <ul className="mt-5 space-y-3">
              {DEMO_FILES.map((file) => (
                <li
                  key={file}
                  className="rounded-lg border border-line bg-bg px-3.5 py-3 font-mono text-[11px] text-ink-soft"
                >
                  {file}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm leading-relaxed text-muted">
              {PRODUCT_NAME} stores these with source set to Demo data. You can remove them from
              this page or from Records.
            </p>
          </aside>
        </div>

        {demoReports.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              title="Load the sample workspace"
              body="Start with the included PDFs to populate the demo dashboard, marker pages, and visit summary immediately."
            />
          </div>
        ) : (
          <div className="mt-12">
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3">
              <h2 className="font-display text-lg text-ink">Demo reports in this browser</h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                {summary.markers} total markers in record
              </span>
            </div>
            <ul className="mt-5 divide-y divide-[var(--hairline)] overflow-hidden rounded-xl border border-line bg-surface">
              {[...demoReports].reverse().map((report) => (
                <li key={report.hash} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4">
                  <span className="min-w-[12rem] flex-1 font-mono text-sm text-ink">
                    {report.filename}
                  </span>
                  <span className="font-mono text-[11px] tabular text-ink-soft">
                    {formatDate(report.sampledAt)}
                  </span>
                  <span className="font-mono text-[11px] tabular text-muted">
                    {report.values.length} markers
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>
    </Shell>
  );
}
