import type { MarkerSeries, NormalizedValue } from "./types";

/**
 * Group normalized values into per-marker time series.
 * Same marker with different (unconvertible) units becomes separate series so
 * a chart never mixes scales. Identical marker+date+value+unit is deduped —
 * re-uploading a report must not create new points.
 */
export function buildSeries(values: NormalizedValue[]): MarkerSeries[] {
  const groups = new Map<string, MarkerSeries>();
  const seen = new Set<string>();

  for (const v of values) {
    const groupKey = `${v.markerId}|${v.unit}`;
    const pointKey = `${groupKey}|${v.sampledAt}|${v.value}`;
    if (seen.has(pointKey)) continue;
    seen.add(pointKey);

    let series = groups.get(groupKey);
    if (!series) {
      series = { markerId: v.markerId, markerLabel: v.markerLabel, unit: v.unit, points: [] };
      groups.set(groupKey, series);
    }
    series.points.push(v);
  }

  for (const series of groups.values()) {
    series.points.sort((a, b) => a.sampledAt.localeCompare(b.sampledAt));
  }

  return [...groups.values()].sort((a, b) => a.markerLabel.localeCompare(b.markerLabel));
}
