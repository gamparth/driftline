"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { loadDemoData } from "@/lib/ingest";

/** Runs the four synthetic reports through the real ingest pipeline. */
export function DemoButton() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    setStatus("Reading reports…");
    try {
      const outcomes = await loadDemoData((name) => setStatus(`Reading ${name}…`));
      const failed = outcomes.filter((o) => o.status === "needs-review");
      if (failed.length === outcomes.length) {
        setStatus(null);
        setError(failed[0]?.reason ?? "Demo data could not be loaded.");
        return;
      }
      router.push("/timeline");
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : "Demo data could not be loaded.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={run}
        disabled={status !== null}
        className="rounded-full border border-accent bg-accent px-6 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-bg transition-opacity duration-200 hover:opacity-85 disabled:opacity-50"
      >
        {status ?? "Try the demo"}
      </button>
      {error ? <p className="font-mono text-[10px] text-accent">{error}</p> : null}
    </div>
  );
}
