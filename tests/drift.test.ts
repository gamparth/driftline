import { describe, expect, it } from "vitest";
import { buildSeries } from "@/lib/engine/series";
import { detectDrift } from "@/lib/engine/drift";
import { normalizeValue } from "@/lib/engine/normalize";
import type { LabValue } from "@/lib/engine/types";

function lv(
  marker: string,
  value: number,
  sampledAt: string,
  referenceRange: LabValue["referenceRange"] = null,
  unit = "mg/dL",
): LabValue {
  return { marker, value, unit, referenceRange, sampledAt, lab: "ACME" };
}

const norm = (vs: LabValue[]) => vs.map(normalizeValue);

describe("buildSeries", () => {
  it("groups by marker and sorts by date", () => {
    const series = buildSeries(
      norm([
        lv("Glucose", 101, "2025-02-10", { low: 70, high: 99 }),
        lv("LDL", 110, "2022-03-15", { low: null, high: 100 }),
        lv("Glucose", 92, "2022-03-15", { low: 70, high: 99 }),
      ]),
    );
    expect(series).toHaveLength(2);
    const glucose = series.find((s) => s.markerId === "glucose")!;
    expect(glucose.points.map((p) => p.sampledAt)).toEqual(["2022-03-15", "2025-02-10"]);
  });

  it("dedups identical marker+date+value", () => {
    const series = buildSeries(
      norm([
        lv("Glucose", 92, "2022-03-15"),
        lv("Glucose", 92, "2022-03-15"),
      ]),
    );
    expect(series[0].points).toHaveLength(1);
  });

  it("splits same marker with unconvertible units into separate series", () => {
    const series = buildSeries(
      norm([
        lv("Glucose", 92, "2022-03-15", null, "mg/dL"),
        lv("Glucose", 5.1, "2023-04-02", null, "banana/L"),
      ]),
    );
    expect(series).toHaveLength(2);
  });
});

describe("detectDrift", () => {
  it("flags values outside their own reference range", () => {
    const series = buildSeries(
      norm([
        lv("Glucose", 92, "2022-03-15", { low: 70, high: 99 }),
        lv("Glucose", 108, "2024-01-08", { low: 70, high: 99 }),
      ]),
    );
    const flags = detectDrift(series);
    const oor = flags.filter((f) => f.kind === "out-of-range");
    expect(oor).toHaveLength(1);
    expect(oor[0].sampledAt).toBe("2024-01-08");
    expect(oor[0].markerId).toBe("glucose");
  });

  it("flags below-range too", () => {
    const series = buildSeries(
      norm([lv("Hemoglobin", 11.2, "2024-01-08", { low: 13.5, high: 17.5 }, "g/dL")]),
    );
    const flags = detectDrift(series);
    expect(flags.some((f) => f.kind === "out-of-range")).toBe(true);
  });

  it("flags >20% move between consecutive samples", () => {
    const series = buildSeries(
      norm([
        lv("Creatinine", 1.0, "2024-01-08", { low: 0.7, high: 1.3 }),
        lv("Creatinine", 1.4, "2025-02-10", { low: 0.7, high: 1.3 }),
      ]),
    );
    const deltas = detectDrift(series).filter((f) => f.kind === "delta");
    expect(deltas).toHaveLength(1);
    expect(deltas[0].deltaPct).toBeCloseTo(40, 0);
    expect(deltas[0].sampledAt).toBe("2025-02-10");
  });

  it("does not flag <=20% moves or in-range values", () => {
    const series = buildSeries(
      norm([
        lv("LDL", 165, "2024-01-08", { low: null, high: 100 }),
        lv("LDL", 150, "2025-02-10", { low: null, high: 100 }),
      ]),
    );
    const flags = detectDrift(series);
    expect(flags.filter((f) => f.kind === "delta")).toHaveLength(0);
    // both out of range though
    expect(flags.filter((f) => f.kind === "out-of-range")).toHaveLength(2);
  });

  it("handles missing reference ranges gracefully", () => {
    const series = buildSeries(
      norm([lv("Glucose", 92, "2022-03-15"), lv("Glucose", 120, "2023-04-02")]),
    );
    const flags = detectDrift(series);
    expect(flags.filter((f) => f.kind === "out-of-range")).toHaveLength(0);
    expect(flags.filter((f) => f.kind === "delta")).toHaveLength(1);
  });
});
