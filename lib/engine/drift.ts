import type { DriftFlag, MarkerSeries, NormalizedValue } from "./types";

const DELTA_THRESHOLD_PCT = 20;

function outOfRange(v: NormalizedValue): string | null {
  const r = v.referenceRange;
  if (!r) return null;
  if (r.low !== null && v.value < r.low) return `below range (low ${r.low})`;
  if (r.high !== null && v.value > r.high) return `above range (high ${r.high})`;
  return null;
}

/**
 * Rule-based drift detection — no LLM, no judgment. Two rules from the spec:
 * 1. value outside its own sample's reference range
 * 2. >20% move between consecutive samples of the same marker
 */
export function detectDrift(series: MarkerSeries[]): DriftFlag[] {
  const flags: DriftFlag[] = [];

  for (const s of series) {
    for (let i = 0; i < s.points.length; i++) {
      const point = s.points[i];
      const violation = outOfRange(point);
      if (violation) {
        flags.push({
          markerId: s.markerId,
          markerLabel: s.markerLabel,
          kind: "out-of-range",
          sampledAt: point.sampledAt,
          value: point.value,
          unit: s.unit,
          detail: violation,
        });
      }

      if (i > 0) {
        const prev = s.points[i - 1];
        if (prev.value !== 0) {
          const deltaPct = ((point.value - prev.value) / Math.abs(prev.value)) * 100;
          if (Math.abs(deltaPct) > DELTA_THRESHOLD_PCT) {
            flags.push({
              markerId: s.markerId,
              markerLabel: s.markerLabel,
              kind: "delta",
              sampledAt: point.sampledAt,
              value: point.value,
              unit: s.unit,
              detail: `${deltaPct > 0 ? "up" : "down"} ${Math.abs(Math.round(deltaPct))}% vs ${prev.sampledAt} (${prev.value} ${s.unit})`,
              deltaPct: Math.round(deltaPct * 10) / 10,
            });
          }
        }
      }
    }
  }

  return flags.sort((a, b) => b.sampledAt.localeCompare(a.sampledAt));
}
