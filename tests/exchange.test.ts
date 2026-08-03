import { describe, expect, it } from "vitest";
import {
  EXPORT_FORMAT,
  buildExportBundle,
  parseImportBundle,
  toCsv,
} from "@/lib/exchange";
import { normalizeValue } from "@/lib/engine/normalize";
import type { StoredReport } from "@/lib/storage/db";

function report(hash: string, sampledAt: string, value = 90): StoredReport {
  return {
    hash,
    filename: `${hash}.pdf`,
    addedAt: "2026-08-02T00:00:00.000Z",
    lab: "ACME DIAGNOSTICS",
    sampledAt,
    source: "heuristic",
    values: [
      normalizeValue({
        marker: "Glucose",
        value,
        unit: "mg/dL",
        referenceRange: { low: 70, high: 99 },
        sampledAt,
        lab: "ACME DIAGNOSTICS",
      }),
    ],
  };
}

describe("export / import round trip", () => {
  it("survives a full round trip unchanged", () => {
    const reports = [report("a", "2021-06-12"), report("b", "2024-01-19", 120)];
    const bundle = buildExportBundle(reports, "2026-08-02T10:00:00.000Z");
    const result = parseImportBundle(JSON.stringify(bundle));

    expect(result.status).toBe("ok");
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.reports).toHaveLength(2);
    expect(result.reports[1].values[0].value).toBe(120);
    expect(result.reports[0].values[0].markerId).toBe("glucose");
  });

  it("stamps the format and version", () => {
    const bundle = buildExportBundle([], "2026-08-02T10:00:00.000Z");
    expect(bundle.format).toBe(EXPORT_FORMAT);
    expect(bundle.version).toBe(1);
  });

  it("rejects a file that isn't JSON", () => {
    const result = parseImportBundle("not json");
    expect(result.status).toBe("error");
    if (result.status !== "error") throw new Error("expected error");
    expect(result.reason).toMatch(/valid JSON/i);
  });

  it("rejects a JSON file that isn't a Labloom export", () => {
    const result = parseImportBundle(JSON.stringify({ format: "something-else", data: [] }));
    expect(result.status).toBe("error");
    if (result.status !== "error") throw new Error("expected error");
    expect(result.reason).toMatch(/isn't a Labloom export/i);
  });

  it("rejects an export written by a newer version", () => {
    const bundle = { ...buildExportBundle([], "2026-08-02T10:00:00.000Z"), version: 99 };
    const result = parseImportBundle(JSON.stringify(bundle));
    expect(result.status).toBe("error");
    if (result.status !== "error") throw new Error("expected error");
    expect(result.reason).toMatch(/newer version/i);
  });

  it("rejects a bundle whose rows fail validation rather than importing junk", () => {
    const bundle = buildExportBundle([report("a", "2021-06-12")], "2026-08-02T10:00:00.000Z");
    // corrupt one value
    (bundle.reports[0].values[0] as unknown as { value: string }).value = "ninety";
    const result = parseImportBundle(JSON.stringify(bundle));
    expect(result.status).toBe("error");
  });
});

describe("toCsv", () => {
  it("writes one row per measurement with a header", () => {
    const csv = toCsv([report("a", "2021-06-12"), report("b", "2024-01-19", 120)]);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("sampled_at");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("2021-06-12");
    expect(lines[1]).toContain("Glucose");
    expect(lines[1]).toContain("70");
  });

  it("sorts by date so the file reads chronologically", () => {
    const csv = toCsv([report("b", "2024-01-19"), report("a", "2021-06-12")]);
    const lines = csv.split("\n");
    expect(lines[1]).toContain("2021-06-12");
    expect(lines[2]).toContain("2024-01-19");
  });

  it("quotes cells containing commas", () => {
    const r = report("a", "2021-06-12");
    // each value carries its own lab; that is what the CSV reports
    r.values[0].lab = "ACME, Inc.";
    expect(toCsv([r])).toContain('"ACME, Inc."');
  });

  it("leaves missing reference bounds empty rather than writing null", () => {
    const r = report("a", "2021-06-12");
    r.values[0].referenceRange = null;
    const line = toCsv([r]).split("\n")[1];
    expect(line).not.toContain("null");
    expect(line).toContain(",,");
  });
});
