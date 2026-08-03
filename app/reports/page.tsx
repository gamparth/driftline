"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Label, PageHeader, Section, Shell } from "@/components/Shell";
import { EmptyState, LoadingState } from "@/components/States";
import { useVitals } from "@/lib/hooks/useVitals";
import { buildExportBundle, downloadFile, parseImportBundle, toCsv } from "@/lib/exchange";
import {
  clearReviewItems,
  deleteQuestions,
  deleteReport,
  deleteReportsForMode,
  putReport,
} from "@/lib/storage/db";
import { formatDate } from "@/lib/format";
import { PRODUCT_NAME } from "@/lib/product";

const SOURCE_LABEL: Record<string, string> = {
  heuristic: "Built-in parser",
  llm: "AI extractor",
  demo: "Demo data",
};

export default function ReportsPage() {
  const { state, reports, summary, reload, mode } = useVitals();
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function stamp(): string {
    return new Date().toISOString().slice(0, 10);
  }

  function exportJson() {
    const bundle = buildExportBundle(reports, new Date().toISOString());
    downloadFile(
      `driftline-${mode}-record-${stamp()}.json`,
      JSON.stringify(bundle, null, 2),
      "application/json",
    );
    setNotice(`${mode === "demo" ? "Demo" : "Real"} record saved to your downloads.`);
  }

  function exportCsv() {
    downloadFile(`driftline-${mode}-measurements-${stamp()}.csv`, toCsv(reports), "text/csv");
    setNotice("CSV saved to your downloads.");
  }

  async function importFile(file: File) {
    setError(null);
    setNotice(null);
    const result = parseImportBundle(await file.text());
    if (result.status === "error") {
      setError(result.reason);
      return;
    }
    let added = 0;
    let skipped = 0;
    for (const report of result.reports) {
      if (await putReport(report)) {
        added++;
      } else {
        skipped++;
      }
    }
    await reload();
    setNotice(
      `Imported ${added} report${added === 1 ? "" : "s"}` +
        (skipped > 0 ? `, skipped ${skipped} already in your record.` : "."),
    );
  }

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
      <PageHeader
        eyebrow={mode === "demo" ? "Demo data" : "Your data"}
        title={mode === "demo" ? "Manage demo record" : "Manage real record"}
      >
        <p className="text-sm leading-relaxed text-muted">
          {mode === "demo"
            ? "This view contains sample reports only. Clearing it never touches your real record."
            : "Everything here lives in this browser only. Export it to a file you keep, import it into another browser, remove a single report, or delete all of it."}
        </p>
      </PageHeader>

      <Section>
        {notice ? (
          <p className="mb-6 rounded-lg border border-ok/30 bg-ok-soft px-4 py-3 text-sm text-ok">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="mb-6 rounded-lg border border-alert/30 bg-alert-soft px-4 py-3 text-sm text-alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportJson}
            disabled={reports.length === 0}
            className="rounded-full border border-line px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink transition-colors duration-200 hover:border-line-strong disabled:opacity-40"
          >
            Export {mode} record
          </button>
          <button
            onClick={exportCsv}
            disabled={reports.length === 0}
            className="rounded-full border border-line px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink transition-colors duration-200 hover:border-line-strong disabled:opacity-40"
          >
            Export CSV
          </button>
          {mode === "real" ? (
            <button
              onClick={() => fileInput.current?.click()}
              className="rounded-full border border-line px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted transition-colors duration-200 hover:border-line-strong hover:text-ink"
            >
              Import a record
            </button>
          ) : null}
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importFile(file);
              e.target.value = "";
            }}
          />
        </div>

        <div className="mt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3">
            <h2 className="font-display text-lg text-ink">Reports</h2>
            <Label>
              {reports.length} stored · {summary.markers} markers
            </Label>
          </div>

          {reports.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                title={mode === "demo" ? "No demo reports loaded" : "No reports stored"}
                body={
                  mode === "demo"
                    ? "Load the sample PDFs from Demo to populate this workspace."
                    : "Add a lab-report PDF, or import a record you exported earlier."
                }
                actionHref={mode === "demo" ? "/demo" : "/upload"}
                actionLabel={mode === "demo" ? "Open demo" : "Add a report"}
              />
            </div>
          ) : (
            <ul className="mt-6 divide-y divide-[var(--hairline)] overflow-hidden rounded-xl border border-line bg-surface">
              {[...reports].reverse().map((report) => (
                <li
                  key={report.hash}
                  className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4"
                >
                  <div className="min-w-[12rem] flex-1">
                    <p className="font-mono text-sm text-ink">{report.filename}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                      {report.lab}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] tabular text-ink-soft">
                    {formatDate(report.sampledAt)}
                  </span>
                  <span className="font-mono text-[11px] tabular text-muted">
                    {report.values.length} markers
                  </span>
                  <span className="rounded-full border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                    {SOURCE_LABEL[report.source] ?? report.source}
                  </span>
                  <button
                    onClick={async () => {
                      await deleteReport(report.hash);
                      await reload();
                      setNotice(`Removed ${report.filename}.`);
                    }}
                    className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors duration-200 hover:text-alert"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-16 rounded-xl border border-line bg-surface p-6 md:p-8">
          <h2 className="font-display text-lg text-ink">
            {mode === "demo" ? "Clear demo data" : "Delete real record"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            {mode === "demo"
              ? "Removes sample reports and demo questions from this browser. Your real record stays untouched."
              : `Empties every real report, the review queue, and saved real-mode questions from this browser. Immediate and irreversible — ${PRODUCT_NAME} holds no copy anywhere else, so export first if you want to keep the record.`}
          </p>
          {confirmWipe ? (
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                onClick={async () => {
                  const removed = await deleteReportsForMode(mode);
                  await deleteQuestions(mode);
                  if (mode === "real") await clearReviewItems();
                  setConfirmWipe(false);
                  setNotice(
                    mode === "demo"
                      ? `Cleared ${removed} demo report${removed === 1 ? "" : "s"}.`
                      : `Deleted ${removed} real report${removed === 1 ? "" : "s"}.`,
                  );
                  await reload();
                }}
                className="rounded-full bg-alert px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white transition-opacity duration-200 hover:opacity-90"
              >
                {mode === "demo" ? "Yes, clear demo" : "Yes, delete real record"}
              </button>
              <button
                onClick={() => setConfirmWipe(false)}
                className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted transition-colors duration-200 hover:text-ink"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmWipe(true)}
              disabled={reports.length === 0}
              className="mt-6 rounded-full border border-alert/40 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-alert transition-colors duration-200 hover:bg-alert-soft disabled:opacity-40"
            >
              {mode === "demo" ? "Clear demo data" : "Wipe real data"}
            </button>
          )}
        </div>

        <p className="mt-10 text-sm text-muted">
          Looking for the API key?{" "}
          <Link href="/settings" className="text-brand underline underline-offset-4">
            Settings
          </Link>
          .
        </p>
      </Section>
    </Shell>
  );
}
