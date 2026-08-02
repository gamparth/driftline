import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { extractPdfLines } from "@/lib/pdf/text";
import { parseReport } from "@/lib/engine/parse";
import { parseRow, parseDate, parseRange } from "@/lib/engine/parse";
import { normalizeValue } from "@/lib/engine/normalize";
import { buildSeries } from "@/lib/engine/series";
import { detectDrift } from "@/lib/engine/drift";
import type { MarkerSeries, DriftFlag } from "@/lib/engine/types";

const FIXTURES = ["acme-2021", "northgate-2022", "helix-2024", "meridian-2025"];

let series: MarkerSeries[];
let flags: DriftFlag[];

beforeAll(async () => {
  const values = [];
  for (const slug of FIXTURES) {
    const buf = await readFile(path.join(process.cwd(), "tests/fixtures/pdfs", `${slug}.pdf`));
    const report = parseReport(await extractPdfLines(new Uint8Array(buf)));
    expect(report, `${slug} failed to parse`).not.toBeNull();
    values.push(...report!.values.map(normalizeValue));
  }
  series = buildSeries(values);
  flags = detectDrift(series);
});

describe("longitudinal timeline across four labs", () => {
  it("stitches one multi-year series per marker despite differing units", () => {
    const glucose = series.find((s) => s.markerId === "glucose")!;
    expect(glucose.unit).toBe("mg/dL");
    expect(glucose.points.map((p) => p.sampledAt)).toEqual([
      "2021-06-12",
      "2022-11-03",
      "2024-01-19",
      "2025-04-07",
    ]);
    // 2022 report was in mmol/L and still lands on the mg/dL scale
    expect(glucose.points[1].value).toBeCloseTo(91.89, 1);
    expect(glucose.points[1].lab).toBe("NORTHGATE PATHOLOGY");
  });

  it("keeps each marker on a single unit", () => {
    for (const s of series) {
      expect(new Set(s.points.map((p) => p.unit)).size).toBe(1);
    }
  });

  it("spans more than three years", () => {
    const all = series.flatMap((s) => s.points.map((p) => p.sampledAt)).sort();
    expect(all[0]).toBe("2021-06-12");
    expect(all[all.length - 1]).toBe("2025-04-07");
  });

  it("is idempotent — re-parsing the same reports adds no points", async () => {
    const doubled = [];
    for (const slug of FIXTURES) {
      const buf = await readFile(path.join(process.cwd(), "tests/fixtures/pdfs", `${slug}.pdf`));
      const report = parseReport(await extractPdfLines(new Uint8Array(buf)));
      doubled.push(...report!.values.map(normalizeValue));
      doubled.push(...report!.values.map(normalizeValue));
    }
    const rebuilt = buildSeries(doubled);
    expect(rebuilt.flatMap((s) => s.points).length).toBe(series.flatMap((s) => s.points).length);
  });
});

describe("drift flags on the known anomaly", () => {
  it("flags the creatinine jump between 2024 and 2025", () => {
    const creatinine = flags.filter((f) => f.markerId === "creatinine");
    const delta = creatinine.find((f) => f.kind === "delta")!;
    expect(delta).toBeDefined();
    expect(delta.sampledAt).toBe("2025-04-07");
    expect(delta.deltaPct).toBeCloseTo(34, 0);
    expect(creatinine.some((f) => f.kind === "out-of-range" && f.sampledAt === "2025-04-07")).toBe(
      true,
    );
  });

  it("does not flag creatinine's earlier stable samples", () => {
    const early = flags.filter(
      (f) => f.markerId === "creatinine" && f.sampledAt < "2025-01-01",
    );
    expect(early).toEqual([]);
  });

  it("flags every out-of-range LDL sample and no in-range one", () => {
    const ldl = flags.filter((f) => f.markerId === "ldl" && f.kind === "out-of-range");
    expect(ldl.map((f) => f.sampledAt).sort()).toEqual(["2021-06-12", "2024-01-19", "2025-04-07"]);
  });

  it("flags the below-range vitamin D", () => {
    const vitD = flags.find((f) => f.markerId === "vitamin-d");
    expect(vitD?.kind).toBe("out-of-range");
    expect(vitD?.detail).toContain("below");
  });

  it("flags a large move even when both samples sit inside the range", () => {
    // TSH 1.8 → 2.4 mIU/L is in range at both ends but a 33% move
    const tsh = flags.filter((f) => f.markerId === "tsh");
    expect(tsh).toHaveLength(1);
    expect(tsh[0].kind).toBe("delta");
  });

  it("leaves in-range markers with no comparison point unflagged", () => {
    expect(flags.some((f) => f.markerId === "hemoglobin")).toBe(false);
    expect(flags.some((f) => f.markerId === "hdl")).toBe(false);
  });
});

describe("parser robustness", () => {
  it("returns null when no date is present", () => {
    expect(parseReport(["ACME LABS", "Glucose   88   mg/dL   70 - 99"])).toBeNull();
  });

  it("returns null when no rows parse", () => {
    expect(parseReport(["ACME LABS", "Collected: 2024-01-01", "Thank you for your visit."])).toBeNull();
  });

  it("rejects header and prose lines as result rows", () => {
    expect(parseRow("Test   Result   Units   Reference Range")).toBeNull();
    expect(parseRow("Accession: A-2021-88214")).toBeNull();
    expect(parseRow("Patient: Sample Patient (synthetic)")).toBeNull();
    expect(parseRow("1200 Sample Parkway, Suite 400")).toBeNull();
  });

  it("reads both column and inline row shapes", () => {
    expect(parseRow("Glucose   88   mg/dL   70 - 99")).toMatchObject({
      value: 88,
      unit: "mg/dL",
      referenceRange: { low: 70, high: 99 },
    });
    expect(parseRow("LDL-C: 138 mg/dL [H] (ref <100)")).toMatchObject({
      value: 138,
      referenceRange: { low: null, high: 100 },
    });
  });

  it("reads the date conventions each fixture lab uses", () => {
    expect(parseDate("Collected: 06/12/2021")).toBe("2021-06-12");
    expect(parseDate("Collected: 03.11.2022")).toBe("2022-11-03");
    expect(parseDate("Specimen collected: January 19, 2024")).toBe("2024-01-19");
    expect(parseDate("Date of Service: 2025-04-07")).toBe("2025-04-07");
    expect(parseDate("Collected: 25/12/2023")).toBe("2023-12-25");
    expect(parseDate("no date here")).toBeNull();
  });

  it("reads one-sided and two-sided ranges", () => {
    expect(parseRange("70 - 99")).toEqual({ low: 70, high: 99 });
    expect(parseRange("(ref <5.7)")).toEqual({ low: null, high: 5.7 });
    expect(parseRange(">40")).toEqual({ low: 40, high: null });
    expect(parseRange("not applicable")).toBeNull();
  });
});
