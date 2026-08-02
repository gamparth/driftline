"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader, Section, Shell } from "@/components/Shell";
import { ingestPdf, type IngestOutcome } from "@/lib/ingest";
import { hasApiKey } from "@/lib/llm/client";
import { deleteReviewItem, listReviewItems, type ReviewItem } from "@/lib/storage/db";

export default function UploadPage() {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<IngestOutcome[]>([]);
  const [review, setReview] = useState<ReviewItem[]>([]);
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

  return (
    <Shell>
      <PageHeader eyebrow="Step one" title="Add your reports">
        <p className="text-sm leading-relaxed text-muted md:text-base">
          Drop in lab-report PDFs. They are parsed here in the browser — nothing is uploaded.
          Re-adding a file you already have changes nothing.
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
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-8 py-20 text-center transition-colors duration-200 ${
            dragging ? "border-accent bg-accent/5" : "border-edge bg-surface hover:border-paper/30"
          }`}
        >
          <input
            type="file"
            accept="application/pdf"
            multiple
            className="sr-only"
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <p className="font-display text-2xl uppercase tracking-tight">
            {busy ? `Reading ${busy}` : "Drop PDFs here"}
          </p>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            {busy ? "Parsing in this browser" : "or click to choose files"}
          </p>
        </label>

        {!keyPresent ? (
          <p className="mt-6 text-sm leading-relaxed text-muted">
            No API key set. Common tabular layouts parse without one. If a report&apos;s layout
            can&apos;t be read, it goes to the review queue below — add your own Anthropic key in{" "}
            <Link href="/settings" className="text-accent underline-offset-4 hover:underline">
              Settings
            </Link>{" "}
            to have the AI extractor attempt those.
          </p>
        ) : null}

        {outcomes.length > 0 ? (
          <div className="mt-14">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
              This session
            </p>
            <ul className="mt-5 divide-y divide-white/10 border-y border-edge">
              {outcomes.map((outcome, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-4">
                  <span className="font-mono text-sm">{outcome.filename}</span>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.2em] ${
                      outcome.status === "added" ? "text-accent" : "text-muted"
                    }`}
                  >
                    {outcome.status === "added"
                      ? `${outcome.markers} markers · ${outcome.source === "llm" ? "AI extractor" : "parser"}`
                      : outcome.status === "duplicate"
                        ? "already added"
                        : "needs review"}
                  </span>
                  {outcome.status === "needs-review" ? (
                    <span className="w-full text-sm text-muted">{outcome.reason}</span>
                  ) : null}
                </li>
              ))}
            </ul>
            <Link
              href="/timeline"
              className="mt-8 inline-block rounded-full border border-accent px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-accent transition-colors duration-200 hover:bg-accent hover:text-bg"
            >
              View timeline
            </Link>
          </div>
        ) : null}

        {review.length > 0 ? (
          <div className="mt-16">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
              Needs review · {review.length}
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
              These reports were not added to your timeline. Nothing was guessed — a report either
              extracts cleanly or lands here.
            </p>
            <ul className="mt-6 divide-y divide-white/10 border-y border-edge">
              {review.map((item) => (
                <li key={item.hash} className="py-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <span className="font-mono text-sm">{item.filename}</span>
                    <button
                      onClick={async () => {
                        await deleteReviewItem(item.hash);
                        await refreshReview();
                      }}
                      className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted transition-colors duration-200 hover:text-paper"
                    >
                      Dismiss
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-muted">{item.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>
    </Shell>
  );
}
