"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildSeries } from "@/lib/engine/series";
import { detectDrift } from "@/lib/engine/drift";
import {
  buildInsights,
  latestDrawSummary,
  panelRollups,
  rankByAttention,
  recordSummary,
  type DrawSummary,
  type MarkerInsight,
  type PanelRollup,
  type RecordSummary,
} from "@/lib/engine/insights";
import type { DriftFlag, MarkerSeries } from "@/lib/engine/types";
import {
  listReportsForMode,
  listReviewItems,
  type ReviewItem,
  type StoredReport,
} from "@/lib/storage/db";
import { useWorkspaceMode, type WorkspaceMode } from "@/lib/hooks/useWorkspaceMode";

export type LoadState = "loading" | "empty" | "ready";

export interface LabloomData {
  state: LoadState;
  reports: StoredReport[];
  series: MarkerSeries[];
  flags: DriftFlag[];
  review: ReviewItem[];
  insights: MarkerInsight[];
  attention: MarkerInsight[];
  panels: PanelRollup[];
  latestDraw: DrawSummary | null;
  summary: RecordSummary;
  mode: WorkspaceMode;
  reload: () => Promise<void>;
}

/** Reads storage once, then derives every view the UI needs from it. */
export function useLabloomData(): LabloomData {
  const [mode] = useWorkspaceMode();
  const [state, setState] = useState<LoadState>("loading");
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [review, setReview] = useState<ReviewItem[]>([]);

  const reload = useCallback(async () => {
    const [stored, reviewItems] = await Promise.all([listReportsForMode(mode), listReviewItems()]);
    setReports(stored);
    setReview(mode === "real" ? reviewItems : []);
    setState(stored.length === 0 && (mode === "demo" || reviewItems.length === 0) ? "empty" : "ready");
  }, [mode]);

  useEffect(() => {
    queueMicrotask(() => void reload());
  }, [reload]);

  const derived = useMemo(() => {
    const series = buildSeries(reports.flatMap((r) => r.values));
    const flags = detectDrift(series);
    const insights = buildInsights(series, flags);
    return {
      series,
      flags,
      insights,
      attention: rankByAttention(insights),
      panels: panelRollups(insights),
      latestDraw: latestDrawSummary(insights),
      summary: recordSummary(insights),
    };
  }, [reports]);

  return { state, reports, review, mode, reload, ...derived };
}
