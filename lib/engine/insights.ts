import { getPanel, panelForMarker, type Panel, type PanelId } from "./markers";
import type { DriftFlag, MarkerSeries, NormalizedValue, ReferenceRange } from "./types";

/**
 * The meaning layer. Turns per-marker history into the handful of statements a
 * person actually wants — what is outside its range, what moved, what is worth
 * raising — so nobody has to read a table of numbers to find out.
 *
 * Everything here is arithmetic over the ranges each lab printed on its own
 * report. Nothing infers a cause, a diagnosis, or a clinical priority.
 */

export type MarkerStatus = "in-range" | "out-of-range" | "unknown";
export type Trend = "rising" | "falling" | "stable" | "insufficient";

/** A move smaller than this reads as noise rather than a direction. */
const STABLE_BAND_PCT = 5;

export interface MarkerInsight {
  markerId: string;
  markerLabel: string;
  unit: string;
  panel: PanelId;
  series: MarkerSeries;
  latest: NormalizedValue;
  previous: NormalizedValue | null;
  first: NormalizedValue;
  status: MarkerStatus;
  /** 0 = at the lower bound, 1 = at the upper bound; null unless two-sided */
  rangePosition: number | null;
  /** how far past the nearest bound, as a multiple of the band width */
  outsideness: number;
  changePct: number | null;
  changeSinceFirstPct: number | null;
  trend: Trend;
  /** percentage of samples that sat inside their own printed range */
  timeInRangePct: number | null;
  sampleCount: number;
  flags: DriftFlag[];
  /** ordering weight for "what deserves a look" — not a clinical severity */
  significance: number;
}

export function rangePosition(value: number, range: ReferenceRange | null): number | null {
  if (!range || range.low === null || range.high === null) return null;
  const width = range.high - range.low;
  if (width <= 0) return null;
  return (value - range.low) / width;
}

export function classify(value: number, range: ReferenceRange | null): MarkerStatus {
  if (!range) return "unknown";
  if (range.low !== null && value < range.low) return "out-of-range";
  if (range.high !== null && value > range.high) return "out-of-range";
  return "in-range";
}

/**
 * How far outside the band a value sits, scaled so values from different
 * markers are comparable: band widths for two-sided ranges, the bound itself
 * for one-sided ones.
 */
export function outsideness(value: number, range: ReferenceRange | null): number {
  if (!range) return 0;
  const { low, high } = range;

  if (low !== null && high !== null) {
    const width = high - low;
    if (width <= 0) return 0;
    if (value > high) return (value - high) / width;
    if (value < low) return (low - value) / width;
    return 0;
  }
  if (high !== null && value > high) {
    return high === 0 ? 0 : (value - high) / Math.abs(high);
  }
  if (low !== null && value < low) {
    return low === 0 ? 0 : (low - value) / Math.abs(low);
  }
  return 0;
}

function pctChange(from: number, to: number): number | null {
  if (from === 0) return null;
  return ((to - from) / Math.abs(from)) * 100;
}

function trendFrom(changePct: number | null, sampleCount: number): Trend {
  if (sampleCount < 2 || changePct === null) return "insufficient";
  if (Math.abs(changePct) < STABLE_BAND_PCT) return "stable";
  return changePct > 0 ? "rising" : "falling";
}

export function buildInsights(series: MarkerSeries[], flags: DriftFlag[]): MarkerInsight[] {
  const flagsByMarker = new Map<string, DriftFlag[]>();
  for (const flag of flags) {
    const list = flagsByMarker.get(flag.markerId) ?? [];
    list.push(flag);
    flagsByMarker.set(flag.markerId, list);
  }

  return series.map((s) => {
    const points = s.points;
    const latest = points[points.length - 1];
    const previous = points.length > 1 ? points[points.length - 2] : null;
    const first = points[0];

    const status = classify(latest.value, latest.referenceRange);
    const withRanges = points.filter((p) => p.referenceRange !== null);
    const timeInRangePct =
      withRanges.length === 0
        ? null
        : (withRanges.filter((p) => classify(p.value, p.referenceRange) === "in-range").length /
            withRanges.length) *
          100;

    const changePct = previous ? pctChange(previous.value, latest.value) : null;
    const changeSinceFirstPct =
      points.length > 1 ? pctChange(first.value, latest.value) : null;

    const markerFlags = flagsByMarker.get(s.markerId) ?? [];
    const outside = outsideness(latest.value, latest.referenceRange);

    return {
      markerId: s.markerId,
      markerLabel: s.markerLabel,
      unit: s.unit,
      panel: panelForMarker(s.markerId),
      series: s,
      latest,
      previous,
      first,
      status,
      rangePosition: rangePosition(latest.value, latest.referenceRange),
      outsideness: outside,
      changePct,
      changeSinceFirstPct,
      trend: trendFrom(changePct, points.length),
      timeInRangePct,
      sampleCount: points.length,
      flags: markerFlags,
      significance: significanceOf(status, outside, changePct, markerFlags, latest.sampledAt),
    };
  });
}

/**
 * Ordering weight only. Being outside the printed range dominates; a large
 * recent move contributes; a flag on the most recent draw adds a nudge so
 * fresh findings float above stale ones.
 */
function significanceOf(
  status: MarkerStatus,
  outside: number,
  changePct: number | null,
  flags: DriftFlag[],
  latestDate: string,
): number {
  let score = 0;
  if (status === "out-of-range") score += 1 + Math.min(outside, 4) * 1.5;
  if (changePct !== null) score += Math.min(Math.abs(changePct) / 20, 2);
  if (flags.some((f) => f.sampledAt === latestDate)) score += 0.5;
  return Math.round(score * 1000) / 1000;
}

/** Markers worth a second look, most notable first. Calm markers are omitted. */
export function rankByAttention(insights: MarkerInsight[]): MarkerInsight[] {
  return insights
    .filter((i) => i.status === "out-of-range" || i.flags.length > 0)
    .sort((a, b) => b.significance - a.significance || a.markerLabel.localeCompare(b.markerLabel));
}

export interface PanelRollup {
  panel: Panel;
  total: number;
  inRange: number;
  outOfRange: number;
  unknown: number;
  flagged: number;
  insights: MarkerInsight[];
}

export function panelRollups(insights: MarkerInsight[]): PanelRollup[] {
  const byPanel = new Map<PanelId, MarkerInsight[]>();
  for (const insight of insights) {
    const list = byPanel.get(insight.panel) ?? [];
    list.push(insight);
    byPanel.set(insight.panel, list);
  }

  return [...byPanel.entries()]
    .map(([panelId, list]) => ({
      panel: getPanel(panelId),
      total: list.length,
      inRange: list.filter((i) => i.status === "in-range").length,
      outOfRange: list.filter((i) => i.status === "out-of-range").length,
      unknown: list.filter((i) => i.status === "unknown").length,
      flagged: list.filter((i) => i.flags.length > 0).length,
      insights: [...list].sort(
        (a, b) => b.significance - a.significance || a.markerLabel.localeCompare(b.markerLabel),
      ),
    }))
    .sort((a, b) => b.outOfRange - a.outOfRange || a.panel.label.localeCompare(b.panel.label));
}

export interface DrawSummary {
  sampledAt: string;
  measured: number;
  inRange: number;
  outOfRange: number;
  unknown: number;
  markerIds: string[];
  /** markers measured on this date that also moved notably since last time */
  moved: MarkerInsight[];
}

/** What the most recent blood draw actually said, on its own. */
export function latestDrawSummary(insights: MarkerInsight[]): DrawSummary | null {
  if (insights.length === 0) return null;
  const sampledAt = insights
    .map((i) => i.latest.sampledAt)
    .sort()
    .at(-1)!;

  const drawn = insights.filter((i) => i.latest.sampledAt === sampledAt);
  return {
    sampledAt,
    measured: drawn.length,
    inRange: drawn.filter((i) => i.status === "in-range").length,
    outOfRange: drawn.filter((i) => i.status === "out-of-range").length,
    unknown: drawn.filter((i) => i.status === "unknown").length,
    markerIds: drawn.map((i) => i.markerId),
    moved: drawn
      .filter((i) => i.changePct !== null && Math.abs(i.changePct) >= 20)
      .sort((a, b) => Math.abs(b.changePct!) - Math.abs(a.changePct!)),
  };
}

/** Overall counts across every marker's most recent value. */
export interface RecordSummary {
  markers: number;
  inRange: number;
  outOfRange: number;
  unknown: number;
  flags: number;
  firstDate: string | null;
  lastDate: string | null;
}

export function recordSummary(insights: MarkerInsight[]): RecordSummary {
  const dates = insights.flatMap((i) => i.series.points.map((p) => p.sampledAt)).sort();
  return {
    markers: insights.length,
    inRange: insights.filter((i) => i.status === "in-range").length,
    outOfRange: insights.filter((i) => i.status === "out-of-range").length,
    unknown: insights.filter((i) => i.status === "unknown").length,
    flags: insights.reduce((sum, i) => sum + i.flags.length, 0),
    firstDate: dates[0] ?? null,
    lastDate: dates.at(-1) ?? null,
  };
}
