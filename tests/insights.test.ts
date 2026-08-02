import { describe, expect, it } from "vitest";
import {
  buildInsights,
  classify,
  latestDrawSummary,
  outsideness,
  panelRollups,
  rangePosition,
  rankByAttention,
} from "@/lib/engine/insights";
import { buildSeries } from "@/lib/engine/series";
import { detectDrift } from "@/lib/engine/drift";
import { normalizeValue } from "@/lib/engine/normalize";
import type { LabValue } from "@/lib/engine/types";

function lv(
  marker: string,
  value: number,
  sampledAt: string,
  referenceRange: LabValue["referenceRange"] = { low: 70, high: 99 },
  unit = "mg/dL",
): LabValue {
  return { marker, value, unit, referenceRange, sampledAt, lab: "ACME" };
}

function insightsFor(values: LabValue[]) {
  const normalized = values.map(normalizeValue);
  const series = buildSeries(normalized);
  return buildInsights(series, detectDrift(series));
}

describe("rangePosition", () => {
  it("maps a two-sided range onto 0..1", () => {
    expect(rangePosition(70, { low: 70, high: 99 })).toBeCloseTo(0, 5);
    expect(rangePosition(99, { low: 70, high: 99 })).toBeCloseTo(1, 5);
    expect(rangePosition(84.5, { low: 70, high: 99 })).toBeCloseTo(0.5, 2);
  });

  it("goes outside 0..1 when the value is outside the band", () => {
    expect(rangePosition(60, { low: 70, high: 99 })!).toBeLessThan(0);
    expect(rangePosition(120, { low: 70, high: 99 })!).toBeGreaterThan(1);
  });

  it("is null when the range is missing or one-sided", () => {
    expect(rangePosition(90, null)).toBeNull();
    expect(rangePosition(90, { low: null, high: 99 })).toBeNull();
    expect(rangePosition(90, { low: 40, high: null })).toBeNull();
  });
});

describe("classify", () => {
  it("labels values against their printed range", () => {
    expect(classify(85, { low: 70, high: 99 })).toBe("in-range");
    expect(classify(120, { low: 70, high: 99 })).toBe("out-of-range");
    expect(classify(60, { low: 70, high: 99 })).toBe("out-of-range");
  });

  it("handles one-sided ranges", () => {
    expect(classify(90, { low: null, high: 100 })).toBe("in-range");
    expect(classify(110, { low: null, high: 100 })).toBe("out-of-range");
    expect(classify(50, { low: 40, high: null })).toBe("in-range");
    expect(classify(30, { low: 40, high: null })).toBe("out-of-range");
  });

  it("says unknown when the report printed no range", () => {
    expect(classify(90, null)).toBe("unknown");
  });
});

describe("outsideness", () => {
  it("is zero inside the band", () => {
    expect(outsideness(85, { low: 70, high: 99 })).toBe(0);
    expect(outsideness(85, null)).toBe(0);
  });

  it("scales with distance past the bound, relative to band width", () => {
    // band width 29; 29 over the top == 1.0
    expect(outsideness(128, { low: 70, high: 99 })).toBeCloseTo(1, 2);
    expect(outsideness(113.5, { low: 70, high: 99 })).toBeCloseTo(0.5, 2);
  });

  it("uses the bound itself as the scale for one-sided ranges", () => {
    expect(outsideness(150, { low: null, high: 100 })).toBeCloseTo(0.5, 2);
    expect(outsideness(20, { low: 40, high: null })).toBeCloseTo(0.5, 2);
  });
});

describe("buildInsights", () => {
  it("summarises latest value, previous, and change", () => {
    const [insight] = insightsFor([
      lv("Glucose", 88, "2021-06-12"),
      lv("Glucose", 103, "2024-01-19"),
    ]);
    expect(insight.latest.value).toBe(103);
    expect(insight.previous!.value).toBe(88);
    expect(insight.changePct!).toBeCloseTo(17.05, 1);
    expect(insight.status).toBe("out-of-range");
    expect(insight.sampleCount).toBe(2);
  });

  it("classifies trend direction with a stability band", () => {
    const rising = insightsFor([lv("Glucose", 80, "2021-01-01"), lv("Glucose", 95, "2022-01-01")]);
    expect(rising[0].trend).toBe("rising");

    const flat = insightsFor([lv("Glucose", 80, "2021-01-01"), lv("Glucose", 82, "2022-01-01")]);
    expect(flat[0].trend).toBe("stable");

    const falling = insightsFor([lv("Glucose", 95, "2021-01-01"), lv("Glucose", 80, "2022-01-01")]);
    expect(falling[0].trend).toBe("falling");

    const single = insightsFor([lv("Glucose", 95, "2021-01-01")]);
    expect(single[0].trend).toBe("insufficient");
    expect(single[0].changePct).toBeNull();
  });

  it("computes how much of the history sat inside the range", () => {
    const [insight] = insightsFor([
      lv("Glucose", 80, "2021-01-01"),
      lv("Glucose", 85, "2022-01-01"),
      lv("Glucose", 120, "2023-01-01"),
      lv("Glucose", 130, "2024-01-01"),
    ]);
    expect(insight.timeInRangePct).toBeCloseTo(50, 5);
  });

  it("leaves timeInRange null when no sample had a printed range", () => {
    const [insight] = insightsFor([
      lv("Glucose", 80, "2021-01-01", null),
      lv("Glucose", 85, "2022-01-01", null),
    ]);
    expect(insight.timeInRangePct).toBeNull();
    expect(insight.status).toBe("unknown");
  });

  it("carries the marker's panel through", () => {
    const [insight] = insightsFor([lv("LDL", 130, "2024-01-01", { low: null, high: 100 })]);
    expect(insight.panel).toBe("lipids");
  });

  it("attaches the marker's own flags", () => {
    const [insight] = insightsFor([
      lv("Glucose", 88, "2021-06-12"),
      lv("Glucose", 130, "2024-01-19"),
    ]);
    expect(insight.flags.length).toBeGreaterThan(0);
    expect(insight.flags.every((f) => f.markerId === "glucose")).toBe(true);
  });
});

describe("rankByAttention", () => {
  it("puts the furthest-outside marker first", () => {
    const insights = insightsFor([
      // barely over
      lv("Glucose", 101, "2024-01-01", { low: 70, high: 99 }),
      // far over
      lv("LDL", 220, "2024-01-01", { low: null, high: 100 }),
      // comfortably inside
      lv("TSH", 2.0, "2024-01-01", { low: 0.45, high: 4.5 }, "mIU/L"),
    ]);
    const ranked = rankByAttention(insights);
    expect(ranked[0].markerId).toBe("ldl");
    expect(ranked.map((r) => r.markerId)).not.toContain("tsh");
  });

  it("surfaces a big move even when the value stays in range", () => {
    const insights = insightsFor([
      lv("TSH", 1.0, "2021-01-01", { low: 0.45, high: 4.5 }, "mIU/L"),
      lv("TSH", 3.5, "2024-01-01", { low: 0.45, high: 4.5 }, "mIU/L"),
    ]);
    const ranked = rankByAttention(insights);
    expect(ranked.map((r) => r.markerId)).toContain("tsh");
  });

  it("excludes calm, in-range, stable markers entirely", () => {
    const insights = insightsFor([
      lv("Glucose", 85, "2021-01-01"),
      lv("Glucose", 87, "2024-01-01"),
    ]);
    expect(rankByAttention(insights)).toEqual([]);
  });
});

describe("panelRollups", () => {
  it("groups markers by panel and counts what is outside range", () => {
    const insights = insightsFor([
      lv("LDL", 220, "2024-01-01", { low: null, high: 100 }),
      lv("HDL", 55, "2024-01-01", { low: 40, high: null }),
      lv("Glucose", 130, "2024-01-01"),
    ]);
    const rollups = panelRollups(insights);
    const lipids = rollups.find((r) => r.panel.id === "lipids")!;
    expect(lipids.total).toBe(2);
    expect(lipids.outOfRange).toBe(1);

    const metabolic = rollups.find((r) => r.panel.id === "metabolic")!;
    expect(metabolic.outOfRange).toBe(1);
  });

  it("omits panels with no markers", () => {
    const insights = insightsFor([lv("Glucose", 85, "2024-01-01")]);
    expect(panelRollups(insights).map((r) => r.panel.id)).toEqual(["metabolic"]);
  });
});

describe("latestDrawSummary", () => {
  it("describes only the most recent collection date", () => {
    const insights = insightsFor([
      lv("Glucose", 85, "2021-01-01"),
      lv("Glucose", 130, "2024-06-01"),
      lv("LDL", 90, "2024-06-01", { low: null, high: 100 }),
      lv("TSH", 2.0, "2021-01-01", { low: 0.45, high: 4.5 }, "mIU/L"),
    ]);
    const summary = latestDrawSummary(insights);
    expect(summary).not.toBeNull();
    expect(summary!.sampledAt).toBe("2024-06-01");
    expect(summary!.measured).toBe(2);
    expect(summary!.outOfRange).toBe(1);
    // TSH was not drawn on that date
    expect(summary!.markerIds).toEqual(expect.arrayContaining(["glucose", "ldl"]));
    expect(summary!.markerIds).not.toContain("tsh");
  });

  it("is null with no data", () => {
    expect(latestDrawSummary([])).toBeNull();
  });
});
