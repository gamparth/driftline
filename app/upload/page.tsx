"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader, Section, Shell } from "@/components/Shell";
import { ingestPdf, retryReviewItem, type IngestOutcome } from "@/lib/ingest";
import { hasApiKey } from "@/lib/llm/client";
import { deleteReviewItem, listReviewItems, type ReviewItem } from "@/lib/storage/db";
import { formatDate } from "@/lib/format";
import { PRODUCT_NAME } from "@/lib/product";
import { useWorkspaceMode } from "@/lib/hooks/useWorkspaceMode";

export default function UploadPage() {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<IngestOutcome[]>([]);
  const [review, setReview] = useState<ReviewItem[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [keyPresent, setKeyPresent] = useState(false);
  const [mode, setMode] = useWorkspaceMode();

  const refreshReview = useCallback(async () => {
    setReview(await listReviewItems());
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setKeyPresent(hasApiKey());
      void refreshReview();
    });
  }, [refreshReview]);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setMode("real");
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
    [refreshReview, setMode],
  );

  const added = outcomes.filter((o) => o.status === "added").length;

  return (
    <Shell>
      <PageHeader eyebrow="Add data" title="Upload reports">
        <p className="text-sm leading-relaxed text-muted">
          This is the real-record workflow. Drop in your own lab-report PDFs, and {PRODUCT_NAME}{" "}
          parses them here in the browser. Nothing is uploaded, and re-adding a file you already
          have changes nothing.
        </p>
      </PageHeader>

      <Section>
        {mode === "demo" ? (
          <div className="mb-8 rounded-xl bg-accent-soft px-5 py-4 text-sm leading-relaxed text-ink-soft shadow-[var(--shadow-card)] ring-1 ring-black/[0.04]">
            Uploading personal PDFs switches this workspace back to Real mode so sample reports and
            your own record stay separate.
          </div>
        ) : null}

        {!keyPresent && mode === "real" ? <ApiKeyPrompt /> : null}

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white px-5 py-4 shadow-[var(--shadow-card)] ring-1 ring-black/[0.04]">
          <div>
            <p className="font-display text-xl font-semibold text-ink">Working with sample files?</p>
            <p className="mt-1 text-sm text-muted">
              Use the demo workspace so sample data stays clearly labeled.
            </p>
          </div>
          <Link
            href="/demo"
            className="rounded-full border border-line bg-bg px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink transition-colors duration-200 hover:bg-brand-soft"
          >
            Open demo
          </Link>
        </div>

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
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-8 py-20 text-center shadow-[var(--shadow-card)] transition-all duration-200 ${
            dragging
              ? "border-brand bg-brand-soft"
              : "border-brand/30 bg-white hover:-translate-y-0.5 hover:border-brand"
          }`}
        >
          <input
            type="file"
            accept="application/pdf"
            multiple
            className="sr-only"
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <span className="mb-5 grid h-14 w-14 place-items-center rounded-xl bg-brand-soft text-2xl text-brand">
            +
          </span>
          <p className="font-display text-3xl font-semibold text-ink">
            {busy ? `Reading ${busy}` : "Drop PDFs here"}
          </p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            {busy ? "Parsing in this browser" : "or click to choose files"}
          </p>
        </label>

        {!keyPresent ? (
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted">
            You can continue without a key. Standard tables parse locally; unusual report layouts
            land in review until you add a Claude API key.
          </p>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Capability
            index="01"
            title="Deterministic first"
            body="Standard report tables are parsed locally with no key and no network request."
          />
          <Capability
            index="02"
            title="No silent guesses"
            body="Unreadable files land in review, with extracted text visible for auditing."
          />
          <Capability
            index="03"
            title="Duplicate-safe"
            body="Every PDF is hashed, so uploading the same file twice never pollutes your record."
          />
        </div>

        {outcomes.length > 0 ? (
          <div className="mt-14">
            <div className="flex flex-wrap items-baseline justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-[var(--shadow-card)] ring-1 ring-black/[0.04]">
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
            <ul className="mt-5 divide-y divide-[var(--hairline)] overflow-hidden rounded-xl bg-white shadow-[var(--shadow-card)] ring-1 ring-black/[0.04]">
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
            <div className="flex flex-wrap items-baseline justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-[var(--shadow-card)] ring-1 ring-black/[0.04]">
              <h2 className="font-display text-lg text-ink">Needs review</h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-warn">
                {review.length} report{review.length === 1 ? "" : "s"} not added
              </span>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
              Nothing here was guessed at. A report either extracts cleanly or lands in this queue —
              a half-read lab result is worse than none.
            </p>
            <ul className="mt-6 divide-y divide-[var(--hairline)] overflow-hidden rounded-xl bg-white shadow-[var(--shadow-card)] ring-1 ring-black/[0.04]">
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
                      {keyPresent && item.lines.length > 0 ? (
                        <button
                          onClick={async () => {
                            setRetrying(item.hash);
                            const outcome = await retryReviewItem(item);
                            setRetrying(null);
                            setOutcomes((prev) => [outcome, ...prev]);
                            await refreshReview();
                          }}
                          disabled={retrying === item.hash}
                          className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors duration-200 hover:text-ink disabled:opacity-50"
                        >
                          {retrying === item.hash ? "Retrying" : "Retry AI"}
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
                    <pre className="mt-4 max-h-72 overflow-auto rounded-lg bg-surface-2 p-4 font-mono text-[11px] leading-relaxed text-ink-soft ring-1 ring-black/[0.04]">
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

function Capability({ index, title, body }: { index: string; title: string; body: string }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-black/[0.04]">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand">{index}</span>
      <h2 className="mt-3 font-display text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function ApiKeyPrompt() {
  return (
    <div className="mb-8 grid gap-5 rounded-xl bg-[#fff8f3] p-5 shadow-[var(--shadow-card)] ring-1 ring-[rgba(245,151,42,0.18)] md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <p className="font-display text-xl font-semibold text-ink">
          Add a Claude key for the full real-record workflow.
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-soft">
          {PRODUCT_NAME} can parse clean tables without a key. A Claude API key unlocks the fallback
          extractor for awkward PDFs and lets Visit Summary draft appointment questions from your
          flagged markers.
        </p>
      </div>
      <Link
        href="/settings"
        className="rounded-full bg-warn px-5 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-white shadow-[var(--shadow-card)] transition-opacity duration-200 hover:opacity-90"
      >
        Add key
      </Link>
    </div>
  );
}
