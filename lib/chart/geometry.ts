import type { MarkerSeries, NormalizedValue, ReferenceRange } from "@/lib/engine/types";

/**
 * Turns a marker series into SVG coordinates. Pure so the scaling is testable:
 * a chart that silently mis-scales a health marker is worse than no chart.
 */

export interface ChartPoint {
  x: number;
  y: number;
  value: NormalizedValue;
  outOfRange: boolean;
}

/**
 * One sample's own reference band, spanning the horizontal territory that
 * sample "owns". Labs print different ranges, so the band steps rather than
 * running flat — every point is shown against the range it was measured with.
 */
export interface BandSegment {
  x0: number;
  x1: number;
  y: number;
  height: number;
  /** true when the printed range was one-sided and the band runs off-chart */
  openTop: boolean;
  openBottom: boolean;
}

export interface ChartGeometry {
  width: number;
  height: number;
  /** polyline path through every point */
  path: string;
  points: ChartPoint[];
  /** shaded reference band in SVG space, when the samples share one range */
  band: { y: number; height: number } | null;
  /** per-sample bands; identical ranges naturally render as one flat band */
  bands: BandSegment[];
  yMin: number;
  yMax: number;
}

export interface ChartOptions {
  width?: number;
  height?: number;
  padding?: number;
  /**
   * "time" spaces points by their actual sample date — samples four years
   * apart must not look the same as samples four weeks apart. "index" spaces
   * them evenly, which suits a thumbnail where the shape is all that matters.
   */
  xMode?: "time" | "index";
}

function dayNumber(iso: string): number {
  const parsed = Date.parse(`${iso}T00:00:00Z`);
  return Number.isNaN(parsed) ? 0 : parsed / 86_400_000;
}

function isOutOfRange(value: number, range: ReferenceRange | null): boolean {
  if (!range) return false;
  if (range.low !== null && value < range.low) return true;
  if (range.high !== null && value > range.high) return true;
  return false;
}

/** The band is only meaningful when every sample was measured against the same range. */
export function sharedRange(points: NormalizedValue[]): ReferenceRange | null {
  const first = points[0]?.referenceRange ?? null;
  if (!first) return null;
  const same = points.every(
    (p) =>
      p.referenceRange !== null &&
      p.referenceRange.low === first.low &&
      p.referenceRange.high === first.high,
  );
  return same ? first : null;
}

export function buildGeometry(series: MarkerSeries, options: ChartOptions = {}): ChartGeometry {
  const width = options.width ?? 320;
  const height = options.height ?? 96;
  const padding = options.padding ?? 8;

  const points = series.points;
  const range = sharedRange(points);

  // Include the reference bounds in the domain so the band is always visible.
  const candidates = [
    ...points.map((p) => p.value),
    ...(range?.low !== null && range?.low !== undefined ? [range.low] : []),
    ...(range?.high !== null && range?.high !== undefined ? [range.high] : []),
  ];
  let yMin = Math.min(...candidates);
  let yMax = Math.max(...candidates);
  if (yMin === yMax) {
    // A flat series still needs a domain — give it 10% either side.
    const pad = Math.abs(yMin) * 0.1 || 1;
    yMin -= pad;
    yMax += pad;
  } else {
    const pad = (yMax - yMin) * 0.12;
    yMin -= pad;
    yMax += pad;
  }

  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const toY = (v: number) => padding + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const days = points.map((p) => dayNumber(p.sampledAt));
  const dayMin = Math.min(...days);
  const daySpan = Math.max(...days) - dayMin;
  const useTime = (options.xMode ?? "time") === "time" && daySpan > 0;

  const toX = (i: number) => {
    if (points.length === 1) return width / 2;
    if (useTime) return padding + ((days[i] - dayMin) / daySpan) * innerW;
    return padding + (i / (points.length - 1)) * innerW;
  };

  const chartPoints: ChartPoint[] = points.map((value, i) => ({
    x: round(toX(i)),
    y: round(toY(value.value)),
    value,
    outOfRange: isOutOfRange(value.value, value.referenceRange),
  }));

  const band =
    range === null
      ? null
      : (() => {
          const top = toY(range.high ?? yMax);
          const bottom = toY(range.low ?? yMin);
          return { y: round(top), height: round(bottom - top) };
        })();

  // Each sample's band spans halfway to its neighbours on either side.
  const bands: BandSegment[] = [];
  for (let i = 0; i < chartPoints.length; i++) {
    const r = points[i].referenceRange;
    if (!r) continue;
    const cx = chartPoints[i].x;
    const prevX = i > 0 ? chartPoints[i - 1].x : padding;
    const nextX = i < chartPoints.length - 1 ? chartPoints[i + 1].x : width - padding;
    const x0 = i === 0 ? padding : (prevX + cx) / 2;
    const x1 = i === chartPoints.length - 1 ? width - padding : (cx + nextX) / 2;

    const top = r.high === null ? padding : toY(r.high);
    const bottom = r.low === null ? height - padding : toY(r.low);
    bands.push({
      x0: round(x0),
      x1: round(x1),
      y: round(top),
      height: round(Math.max(bottom - top, 0)),
      openTop: r.high === null,
      openBottom: r.low === null,
    });
  }

  return {
    width,
    height,
    path: chartPoints.map((p) => `${p.x},${p.y}`).join(" "),
    points: chartPoints,
    band,
    bands,
    yMin: round(yMin),
    yMax: round(yMax),
  };
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}
