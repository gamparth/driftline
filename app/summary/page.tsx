"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Label, Section, Shell } from "@/components/Shell";
import { LoadingState } from "@/components/States";
import { StatusChip } from "@/components/Status";
import { useVitals } from "@/lib/hooks/useVitals";
import { getApiKey } from "@/lib/llm/client";
import { generateQuestions } from "@/lib/llm/questions";
import { loadQuestions, saveQuestions, type StoredQuestions } from "@/lib/storage/db";
import { describeGap, formatDate, formatPercent, formatRange, formatValue } from "@/lib/format";
import { PRODUCT_NAME } from "@/lib/product";

/**
 * The page you print and take to the appointment: what's outside range, what
 * moved, and the questions to ask — on one sheet, with dates and numbers
 * attached so nothing has to be recalled from memory.
 */
export default function VisitSummaryPage() {
  const { state, attention, summary, latestDraw, reports, mode } = useVitals();
  const [stored, setStored] = useState<StoredQuestions | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyPresent, setKeyPresent] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setKeyPresent(!!getApiKey());
      void loadQuestions(mode).then((q) => setStored(q ?? null));
    });
  }, [mode]);

  async function generate() {
    const apiKey = getApiKey();
    if (!apiKey) return;
    setBusy(true);
    setError(null);
    const flags = attention.flatMap((i) => i.flags);
    const result = await generateQuestions(flags, apiKey);
    setBusy(false);
    if (result.status === "failed") {
      setError(result.reason);
      return;
    }
    const generatedAt = new Date().toISOString();
    await saveQuestions(result.questions, generatedAt, mode);
    setStored({ id: `latest:${mode}`, generatedAt, questions: result.questions });
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

  if (summary.markers === 0) {
    return (
      <Shell>
        <EmptyVisit mode={mode} />
      </Shell>
    );
  }

  return (
    <Shell>
      <Section>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4 no-print">
          <div>
            <Label>For your appointment</Label>
            <h1 className="mt-3 font-display text-3xl text-ink md:text-4xl">Visit summary</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
              One page covering what changed and what to ask. Print it or save it as a PDF —
              generating it never sends your record anywhere.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="rounded-full bg-brand px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white transition-opacity duration-200 hover:opacity-90"
          >
            Print
          </button>
        </div>

        <article className="rounded-xl border border-line bg-surface p-6 md:p-10">
          <header className="border-b border-line pb-6">
            <h2 className="font-display text-2xl text-ink">Lab summary</h2>
            <p className="mt-2 font-mono text-[11px] tabular text-muted">
              {summary.firstDate && summary.lastDate ? (
                <>
                  {formatDate(summary.firstDate)} – {formatDate(summary.lastDate)} ·{" "}
                  {describeGap(summary.firstDate, summary.lastDate)} · {reports.length} report
                  {reports.length === 1 ? "" : "s"} · {summary.markers} markers
                </>
              ) : (
                `${summary.markers} markers`
              )}
            </p>
          </header>

          <section className="grid gap-6 border-b border-line py-6 sm:grid-cols-3">
            <Figure label="Outside printed range" value={String(summary.outOfRange)} tone="alert" />
            <Figure label="Inside printed range" value={String(summary.inRange)} tone="ok" />
            <Figure
              label="Most recent draw"
              value={latestDraw ? formatDate(latestDraw.sampledAt) : "—"}
            />
          </section>

          {/* Findings */}
          <section className="border-b border-line py-6">
            <h3 className="font-display text-lg text-ink">
              Markers outside range or moving quickly
            </h3>
            {attention.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                Nothing is outside its printed range, and nothing moved more than 20% between
                consecutive draws.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line text-left">
                      {["Marker", "Latest", "Reference", "Change", "Status"].map((h) => (
                        <th
                          key={h}
                          className="py-2.5 pr-4 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-muted"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--hairline)]">
                    {attention.map((insight) => (
                      <tr key={`${insight.markerId}-${insight.unit}`}>
                        <td className="py-3 pr-4 text-ink">
                          {insight.markerLabel}
                          <span className="ml-2 font-mono text-[10px] text-muted">
                            {formatDate(insight.latest.sampledAt)}
                          </span>
                        </td>
                        <td
                          className={`whitespace-nowrap py-3 pr-4 font-mono tabular ${
                            insight.status === "out-of-range" ? "text-alert" : "text-ink"
                          }`}
                        >
                          {formatValue(insight.latest.value)} {insight.unit}
                        </td>
                        <td className="whitespace-nowrap py-3 pr-4 font-mono tabular text-muted">
                          {formatRange(insight.latest.referenceRange)}
                        </td>
                        <td className="whitespace-nowrap py-3 pr-4 font-mono tabular text-muted">
                          {insight.changePct === null ? "—" : formatPercent(insight.changePct)}
                        </td>
                        <td className="py-3 pr-4">
                          <StatusChip status={insight.status} compact />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Questions */}
          <section className="py-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="font-display text-lg text-ink">Questions to ask</h3>
              {keyPresent && attention.length > 0 ? (
                <button
                  onClick={generate}
                  disabled={busy}
                  className="rounded-full border border-line px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors duration-200 hover:border-line-strong hover:text-ink disabled:opacity-50 no-print"
                >
                  {busy ? "Generating…" : stored ? "Regenerate" : "Generate"}
                </button>
              ) : null}
            </div>

            {error ? <p className="mt-3 font-mono text-[11px] text-alert">{error}</p> : null}

            {!keyPresent && !stored ? (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
                Drafting questions uses the Anthropic API with your own key — add one in{" "}
                <Link href="/settings" className="text-brand underline underline-offset-4">
                  Settings
                </Link>
                . Only the flagged marker names, values, and dates are sent; never your full
                record. The findings above are computed locally and need no key.
              </p>
            ) : null}

            {stored && stored.questions.length > 0 ? (
              <ol className="mt-5 space-y-4">
                {stored.questions.map((q, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="mt-0.5 font-mono text-[11px] tabular text-brand">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-sm leading-relaxed text-ink">{q.question}</p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                        {q.markerIds.join(" · ")}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : null}
          </section>

          <footer className="border-t border-line pt-5">
            <p className="text-xs leading-relaxed text-muted">
              Prepared by {PRODUCT_NAME} from lab reports supplied by the patient. Flags are
              arithmetic against the reference range printed on each report — not a diagnosis, an
              interpretation, or a clinical recommendation.
            </p>
          </footer>
        </article>
      </Section>
    </Shell>
  );
}

function EmptyVisit({ mode }: { mode: "real" | "demo" }) {
  const isDemo = mode === "demo";
  return (
    <>
      <div className="page-band soft-section">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:px-10 md:py-14">
          <Label>{isDemo ? "Demo visit" : "Visit summary"}</Label>
          <h1 className="mt-4 max-w-3xl font-display text-[2.15rem] font-semibold leading-[1.04] text-ink sm:text-4xl md:text-5xl">
            {isDemo ? "Load demo reports to preview the visit sheet." : "Your visit sheet appears after reports are read."}
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            {isDemo
              ? "Sample reports produce the same printable summary as a real record, with demo labels kept separate."
              : `${PRODUCT_NAME} turns flags and date-stamped values into a concise page for your appointment. It does not diagnose or recommend treatment.`}
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={isDemo ? "/demo" : "/upload"}
              className="brand-gradient rounded-full px-5 py-3 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-white shadow-[var(--shadow-card)] transition-transform duration-200 hover:-translate-y-0.5"
            >
              {isDemo ? "Load demo data" : "Upload reports"}
            </Link>
            <Link
              href="/reports"
              className="rounded-full border border-line bg-white px-5 py-3 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-ink shadow-[var(--shadow-card)] transition-colors duration-200 hover:bg-brand-soft"
            >
              View records
            </Link>
          </div>
        </div>
      </div>

      <Section>
        <div className="rounded-xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-black/[0.04] md:p-8">
          <Label>What will appear here</Label>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["Lab summary", "Report count, date range, tracked markers, and how much history is available."],
              ["Markers to ask about", "Only values outside printed ranges or moving quickly, with numbers attached."],
              ["Question draft", "Optional AI-generated prompts from flagged markers when an API key is saved."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-lg bg-surface-2 p-4">
                <h2 className="font-display text-lg text-ink">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}

function Figure({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: string;
  tone?: "ink" | "ok" | "alert";
}) {
  const toneClass = tone === "alert" ? "text-alert" : tone === "ok" ? "text-ok" : "text-ink";
  return (
    <div>
      <Label>{label}</Label>
      <p className={`mt-2 font-mono text-2xl tabular ${toneClass}`}>{value}</p>
    </div>
  );
}
