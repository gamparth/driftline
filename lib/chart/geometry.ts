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

export interface ChartGeometry {
  width: number;
  height: number;
  /** polyline path through every point */
  path: string;
  points: ChartPoint[];
  /** shaded reference band in SVG space, when the samples share one range */
  band: { y: number; height: number } | null;
  yMin: number;
  yMax: number;
}

export interface ChartOptions {
  width?: number;
  height?: number;
  padding?: number;
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
  const toX = (i: number) =>
    points.length === 1 ? width / 2 : padding + (i / (points.length - 1)) * innerW;

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

  return {
    width,
    height,
    path: chartPoints.map((p) => `${p.x},${p.y}`).join(" "),
    points: chartPoints,
    band,
    yMin: round(yMin),
    yMax: round(yMax),
  };
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}
