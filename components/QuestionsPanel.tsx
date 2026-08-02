"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getApiKey } from "@/lib/llm/client";
import { generateQuestions } from "@/lib/llm/questions";
import { loadQuestions, saveQuestions, type StoredQuestions } from "@/lib/storage/db";
import type { DriftFlag } from "@/lib/engine/types";

/**
 * Generates the appointment question list. Only flagged drifts are sent to the
 * model — never the full record — and the output is questions, not readings.
 */
export function QuestionsPanel({ flags }: { flags: DriftFlag[] }) {
  const [stored, setStored] = useState<StoredQuestions | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyPresent, setKeyPresent] = useState(false);

  useEffect(() => {
    setKeyPresent(!!getApiKey());
    void loadQuestions().then((q) => setStored(q ?? null));
  }, []);

  async function generate() {
    const apiKey = getApiKey();
    if (!apiKey) return;
    setBusy(true);
    setError(null);
    const result = await generateQuestions(flags, apiKey);
    setBusy(false);
    if (result.status === "failed") {
      setError(result.reason);
      return;
    }
    const generatedAt = new Date().toISOString();
    await saveQuestions(result.questions, generatedAt);
    setStored({ id: "latest", generatedAt, questions: result.questions });
  }

  if (flags.length === 0) {
    return (
      <div className="mt-20 border-t border-edge pt-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Questions for your doctor
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          Nothing is flagged right now, so there is nothing to ask about. Questions are generated
          only from flagged drifts.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-20 border-t border-edge pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
          Questions for your doctor · {flags.length} flag{flags.length === 1 ? "" : "s"}
        </p>
        {keyPresent ? (
          <button
            onClick={generate}
            disabled={busy}
            className="rounded-full border border-edge px-5 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted transition-colors duration-200 hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {busy ? "Generating…" : stored ? "Regenerate" : "Generate"}
          </button>
        ) : null}
      </div>

      {!keyPresent ? (
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          Generating questions uses the Anthropic API. Add your own key in{" "}
          <Link href="/settings" className="text-accent underline-offset-4 hover:underline">
            Settings
          </Link>{" "}
          — only the flagged marker names, values, and dates below are sent.
        </p>
      ) : null}

      {error ? <p className="mt-4 font-mono text-[11px] text-accent">{error}</p> : null}

      {stored && stored.questions.length > 0 ? (
        <ol className="mt-8 space-y-5">
          {stored.questions.map((q, i) => (
            <li key={i} className="flex gap-5">
              <span className="mt-0.5 font-mono text-[11px] tabular-nums text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-sm leading-relaxed">{q.question}</p>
                <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                  {q.markerIds.join(" · ")}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      <div className="mt-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          What is flagged
        </p>
        <ul className="mt-5 divide-y divide-white/10 border-y border-edge">
          {flags.map((flag, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3.5">
              <span className="font-display text-sm uppercase tracking-tight">
                {flag.markerLabel}
              </span>
              <span className="font-mono text-sm tabular-nums">
                {flag.value} {flag.unit}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                {flag.sampledAt}
              </span>
              <span className="w-full text-sm text-muted sm:w-auto">{flag.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
