"use client";

import { useCallback, useEffect, useState } from "react";
import { buildSeries } from "@/lib/engine/series";
import { detectDrift } from "@/lib/engine/drift";
import type { DriftFlag, MarkerSeries } from "@/lib/engine/types";
import {
  listReports,
  listReviewItems,
  type ReviewItem,
  type StoredReport,
} from "@/lib/storage/db";

export type LoadState = "loading" | "empty" | "ready";

export interface VitalsData {
  state: LoadState;
  reports: StoredReport[];
  series: MarkerSeries[];
  flags: DriftFlag[];
  review: ReviewItem[];
  reload: () => Promise<void>;
}

/** Reads everything out of IndexedDB and derives the timeline from it. */
export function useVitals(): VitalsData {
  const [state, setState] = useState<LoadState>("loading");
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [series, setSeries] = useState<MarkerSeries[]>([]);
  const [flags, setFlags] = useState<DriftFlag[]>([]);
  const [review, setReview] = useState<ReviewItem[]>([]);

  const reload = useCallback(async () => {
    const [stored, reviewItems] = await Promise.all([listReports(), listReviewItems()]);
    const built = buildSeries(stored.flatMap((r) => r.values));
    setReports(stored);
    setSeries(built);
    setFlags(detectDrift(built));
    setReview(reviewItems);
    setState(stored.length === 0 && reviewItems.length === 0 ? "empty" : "ready");
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reports, series, flags, review, reload };
}
