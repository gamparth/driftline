import { resolveMarker } from "./markers";
import type { LabValue, NormalizedValue, ReferenceRange } from "./types";

/** normalize a unit string to a lookup key: lowercase, µ→u, strip spaces */
export function unitKey(unit: string): string {
  return unit.toLowerCase().replace(/[µμ]/g, "u").replace(/\s+/g, "");
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function convertRange(
  range: ReferenceRange | null,
  fn: (v: number) => number,
): ReferenceRange | null {
  if (!range) return null;
  return {
    low: range.low === null ? null : round(fn(range.low)),
    high: range.high === null ? null : round(fn(range.high)),
  };
}

/** avoid float noise like 93.69463999 — 4 significant-ish decimals is plenty for lab data */
function round(v: number): number {
  return Math.round(v * 10000) / 10000;
}

export function normalizeValue(v: LabValue): NormalizedValue {
  const def = resolveMarker(v.marker);
  if (!def) {
    return {
      ...v,
      markerId: slug(v.marker),
      markerLabel: v.marker.trim(),
      known: false,
    };
  }

  const base: NormalizedValue = {
    ...v,
    markerId: def.id,
    markerLabel: def.label,
    known: true,
  };

  const key = unitKey(v.unit);
  if (key === unitKey(def.canonicalUnit)) {
    return { ...base, unit: def.canonicalUnit };
  }

  const factor = def.conversions?.[key];
  if (factor !== undefined) {
    const fn = (x: number) => x * factor;
    return {
      ...base,
      value: round(fn(v.value)),
      unit: def.canonicalUnit,
      referenceRange: convertRange(v.referenceRange, fn),
    };
  }

  const fn = def.convertFns?.[key];
  if (fn) {
    return {
      ...base,
      value: round(fn(v.value)),
      unit: def.canonicalUnit,
      referenceRange: convertRange(v.referenceRange, fn),
    };
  }

  // unknown unit for a known marker: keep as-is, series builder keeps units apart
  return base;
}
