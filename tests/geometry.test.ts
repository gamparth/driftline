import { describe, expect, it } from "vitest";
import { buildGeometry, sharedRange } from "@/lib/chart/geometry";
import { buildSeries } from "@/lib/engine/series";
import { normalizeValue } from "@/lib/engine/normalize";
import type { LabValue } from "@/lib/engine/types";

function series(
  values: Array<[string, number]>,
  range: LabValue["referenceRange"] = { low: 70, high: 99 },
) {
  return buildSeries(
    values.map(([sampledAt, value]) =>
      normalizeValue({
        marker: "Glucose",
        value,
        unit: "mg/dL",
        referenceRange: range,
        sampledAt,
        lab: "ACME",
      }),
    ),
  )[0];
}

describe("sharedRange", () => {
  it("returns the range when every sample used the same one", () => {
    expect(sharedRange(series([["2021-01-01", 80], ["2022-01-01", 90]]).points)).toEqual({
      low: 70,
      high: 99,
    });
  });

  it("returns null when a sample has no range", () => {
    const mixed = buildSeries([
      normalizeValue({ marker: "Glucose", value: 80, unit: "mg/dL", referenceRange: { low: 70, high: 99 }, sampledAt: "2021-01-01", lab: "A" }),
      normalizeValue({ marker: "Glucose", value: 90, unit: "mg/dL", referenceRange: null, sampledAt: "2022-01-01", lab: "B" }),
    ]);
    expect(sharedRange(mixed[0].points)).toBeNull();
  });

  it("returns null when labs printed different ranges", () => {
    const mixed = buildSeries([
      normalizeValue({ marker: "Glucose", value: 80, unit: "mg/dL", referenceRange: { low: 70, high: 99 }, sampledAt: "2021-01-01", lab: "A" }),
      normalizeValue({ marker: "Glucose", value: 90, unit: "mg/dL", referenceRange: { low: 65, high: 100 }, sampledAt: "2022-01-01", lab: "B" }),
    ]);
    expect(sharedRange(mixed[0].points)).toBeNull();
  });
});

describe("buildGeometry", () => {
  const opts = { width: 100, height: 100, padding: 10 };

  it("puts the first point at the left edge and the last at the right", () => {
    const g = buildGeometry(series([["2021-01-01", 80], ["2022-01-01", 90], ["2023-01-01", 85]]), opts);
    expect(g.points[0].x).toBe(10);
    expect(g.points[2].x).toBe(90);
    expect(g.points[1].x).toBe(50);
  });

  it("puts higher values higher on the screen (smaller y)", () => {
    const g = buildGeometry(series([["2021-01-01", 75], ["2022-01-01", 95]]), opts);
    expect(g.points[1].y).toBeLessThan(g.points[0].y);
  });

  it("keeps every point inside the padded box", () => {
    const g = buildGeometry(series([["2021-01-01", 60], ["2022-01-01", 130]]), opts);
    for (const p of g.points) {
      expect(p.y).toBeGreaterThanOrEqual(10);
      expect(p.y).toBeLessThanOrEqual(90);
    }
  });

  it("marks only the out-of-range points", () => {
    const g = buildGeometry(series([["2021-01-01", 80], ["2022-01-01", 130]]), opts);
    expect(g.points.map((p) => p.outOfRange)).toEqual([false, true]);
  });

  it("places the reference band between the two bounds", () => {
    const g = buildGeometry(series([["2021-01-01", 80], ["2022-01-01", 90]]), opts);
    expect(g.band).not.toBeNull();
    // band top corresponds to high=99, bottom to low=70 → top above bottom
    expect(g.band!.height).toBeGreaterThan(0);
    expect(g.band!.y).toBeGreaterThanOrEqual(0);
    expect(g.band!.y + g.band!.height).toBeLessThanOrEqual(100);
  });

  it("widens the domain to keep the band visible when values sit far outside it", () => {
    const g = buildGeometry(series([["2021-01-01", 300], ["2022-01-01", 320]]), opts);
    expect(g.yMin).toBeLessThanOrEqual(70);
    expect(g.yMax).toBeGreaterThanOrEqual(320);
  });

  it("omits the band when ranges differ across labs", () => {
    const mixed = buildSeries([
      normalizeValue({ marker: "Glucose", value: 80, unit: "mg/dL", referenceRange: { low: 70, high: 99 }, sampledAt: "2021-01-01", lab: "A" }),
      normalizeValue({ marker: "Glucose", value: 90, unit: "mg/dL", referenceRange: { low: 65, high: 100 }, sampledAt: "2022-01-01", lab: "B" }),
    ]);
    expect(buildGeometry(mixed[0], opts).band).toBeNull();
  });

  it("centers a single sample and still produces a usable domain", () => {
    const g = buildGeometry(series([["2021-01-01", 85]]), opts);
    expect(g.points).toHaveLength(1);
    expect(g.points[0].x).toBe(50);
    expect(g.yMax).toBeGreaterThan(g.yMin);
    expect(Number.isFinite(g.points[0].y)).toBe(true);
  });

  it("handles a flat series without dividing by zero", () => {
    const g = buildGeometry(series([["2021-01-01", 85], ["2022-01-01", 85]], null), opts);
    expect(g.points.every((p) => Number.isFinite(p.y))).toBe(true);
    expect(g.yMax).toBeGreaterThan(g.yMin);
  });
});
