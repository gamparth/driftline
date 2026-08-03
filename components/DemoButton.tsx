"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { loadDemoData } from "@/lib/ingest";
import { writeWorkspaceMode } from "@/lib/hooks/useWorkspaceMode";

/** Runs the four synthetic reports through the real ingest pipeline. */
export function DemoButton({ label = "Try the demo" }: { label?: string }) {
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
      writeWorkspaceMode("demo");
      router.push("/timeline");
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : "Demo data could not be loaded.");
    }
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto">
      <button
        onClick={run}
        disabled={status !== null}
        className="brand-gradient w-full rounded-full border border-transparent px-6 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-white shadow-[var(--shadow-card)] transition-transform duration-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50 sm:w-auto"
      >
        {status ?? label}
      </button>
      {error ? <p className="font-mono text-[10px] text-alert">{error}</p> : null}
    </div>
  );
}
