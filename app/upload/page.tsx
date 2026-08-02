"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader, Section, Shell } from "@/components/Shell";
import { ingestPdf, type IngestOutcome } from "@/lib/ingest";
import { hasApiKey } from "@/lib/llm/client";
import { deleteReviewItem, listReviewItems, type ReviewItem } from "@/lib/storage/db";
import { formatDate } from "@/lib/format";

export default function UploadPage() {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<IngestOutcome[]>([]);
  const [review, setReview] = useState<ReviewItem[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [keyPresent, setKeyPresent] = useState(false);

  const refreshReview = useCallback(async () => {
    setReview(await listReviewItems());
  }, []);

  useEffect(() => {
    setKeyPresent(hasApiKey());
    void refreshReview();
  }, [refreshReview]);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const results: IngestOutcome[] = [];
      for (const file of Array.from(files)) {
        setBusy(file.name);
        const bytes = new Uint8Array(await file.arrayBuffer());
        results.push(await ingestPdf(file.name, bytes));
      }
      setBusy(null);
      setOutcomes((prev) => [...results, ...prev]);
      await refreshReview();
    },
    [refreshReview],
  );

  const added = outcomes.filter((o) => o.status === "added").length;

  return (
    <Shell>
      <PageHeader eyebrow="Add data" title="Upload reports">
        <p className="text-sm leading-relaxed text-muted">
          Drop in lab-report PDFs from any lab. They&apos;re parsed here in the browser — nothing
          is uploaded, and re-adding a file you already have changes nothing.
        </p>
      </PageHeader>

      <Section>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void handleFiles(e.dataTransfer.files);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-8 py-20 text-center transition-colors duration-200 ${
            dragging
              ? "border-brand bg-brand-soft"
              : "border-line bg-surface hover:border-line-strong"
          }`}
        >
          <input
            type="file"
            accept="application/pdf"
            multiple
            className="sr-only"
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <p className="font-display text-2xl text-ink">
            {busy ? `Reading ${busy}` : "Drop PDFs here"}
          </p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            {busy ? "Parsing in this browser" : "or click to choose files"}
          </p>
        </label>

        {!keyPresent ? (
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted">
            Standard tabular layouts parse without an API key. If a report&apos;s layout
            can&apos;t be read, it lands in the review queue below — add your own Anthropic key in{" "}
            <Link href="/settings" className="text-brand underline underline-offset-4">
              Settings
            </Link>{" "}
            to have the AI extractor attempt those too.
          </p>
        ) : null}

        {outcomes.length > 0 ? (
          <div className="mt-14">
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3">
              <h2 className="font-display text-lg text-ink">This session</h2>
              {added > 0 ? (
                <Link
                  href="/timeline"
                  className="rounded-full bg-brand px-5 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white transition-opacity duration-200 hover:opacity-90"
                >
                  View overview
                </Link>
              ) : null}
            </div>
            <ul className="mt-5 divide-y divide-[var(--hairline)] overflow-hidden rounded-xl border border-line bg-surface">
              {outcomes.map((outcome, i) => (
                <li key={i} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4">
                  <span className="min-w-[12rem] flex-1 font-mono text-sm text-ink">
                    {outcome.filename}
                  </span>
                  {outcome.status === "added" ? (
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ok">
                      {outcome.markers} markers ·{" "}
                      {outcome.source === "llm" ? "AI extractor" : "parser"}
                    </span>
                  ) : outcome.status === "duplicate" ? (
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                      already in your record
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-warn">
                      needs review
                    </span>
                  )}
                  {outcome.status === "needs-review" ? (
                    <span className="w-full text-sm text-muted">{outcome.reason}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {review.length > 0 ? (
          <div className="mt-16">
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3">
              <h2 className="font-display text-lg text-ink">Needs review</h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-warn">
                {review.length} report{review.length === 1 ? "" : "s"} not added
              </span>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
              Nothing here was guessed at. A report either extracts cleanly or lands in this queue —
              a half-read lab result is worse than none.
            </p>
            <ul className="mt-6 divide-y divide-[var(--hairline)] overflow-hidden rounded-xl border border-line bg-surface">
              {review.map((item) => (
                <li key={item.hash} className="px-5 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <span className="font-mono text-sm text-ink">{item.filename}</span>
                    <div className="flex items-center gap-4">
                      {item.lines.length > 0 ? (
                        <button
                          onClick={() =>
                            setExpanded(expanded === item.hash ? null : item.hash)
                          }
                          className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors duration-200 hover:text-ink"
                        >
                          {expanded === item.hash ? "Hide text" : "View text"}
                        </button>
                      ) : null}
                      <button
                        onClick={async () => {
                          await deleteReviewItem(item.hash);
                          await refreshReview();
                        }}
                        className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors duration-200 hover:text-alert"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted">{item.reason}</p>
                  <p className="mt-1 font-mono text-[10px] text-muted">
                    added {formatDate(item.addedAt.slice(0, 10))}
                  </p>
                  {expanded === item.hash ? (
                    <pre className="mt-4 max-h-72 overflow-auto rounded-lg border border-line bg-surface-2 p-4 font-mono text-[11px] leading-relaxed text-ink-soft">
                      {item.lines.join("\n")}
                    </pre>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>
    </Shell>
  );
}
