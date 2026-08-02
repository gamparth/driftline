import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  allValues,
  deleteReport,
  hashBytes,
  hasReport,
  listReports,
  listReviewItems,
  loadQuestions,
  putReport,
  putReviewItem,
  deleteDatabase,
  saveQuestions,
  wipeAll,
  type StoredReport,
} from "@/lib/storage/db";
import { normalizeValue } from "@/lib/engine/normalize";

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

beforeEach(async () => {
  await deleteDatabase();
});

describe("hashBytes", () => {
  it("is stable for identical bytes and differs for different bytes", async () => {
    const a = await hashBytes(new Uint8Array([1, 2, 3]));
    const b = await hashBytes(new Uint8Array([1, 2, 3]));
    const c = await hashBytes(new Uint8Array([1, 2, 4]));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hashes a real fixture PDF the same way twice", async () => {
    const buf = await readFile(
      path.join(process.cwd(), "tests/fixtures/pdfs/acme-2021.pdf"),
    );
    expect(await hashBytes(new Uint8Array(buf))).toBe(await hashBytes(new Uint8Array(buf)));
  });
});

describe("report storage", () => {
  it("stores and reads back a report", async () => {
    expect(await putReport(report("aaa", "2021-06-12"))).toBe(true);
    const stored = await listReports();
    expect(stored).toHaveLength(1);
    expect(stored[0].values[0].markerId).toBe("glucose");
  });

  it("treats a re-upload of the same file as a no-op", async () => {
    await putReport(report("aaa", "2021-06-12", 90));
    const second = await putReport(report("aaa", "2021-06-12", 999));
    expect(second).toBe(false);
    const stored = await listReports();
    expect(stored).toHaveLength(1);
    expect(stored[0].values[0].value).toBe(90);
  });

  it("keeps reports sorted by sample date", async () => {
    await putReport(report("c", "2025-04-07"));
    await putReport(report("a", "2021-06-12"));
    await putReport(report("b", "2024-01-19"));
    expect((await listReports()).map((r) => r.sampledAt)).toEqual([
      "2021-06-12",
      "2024-01-19",
      "2025-04-07",
    ]);
  });

  it("reports whether a hash is already known", async () => {
    expect(await hasReport("aaa")).toBe(false);
    await putReport(report("aaa", "2021-06-12"));
    expect(await hasReport("aaa")).toBe(true);
  });

  it("flattens every stored value for the series builder", async () => {
    await putReport(report("a", "2021-06-12"));
    await putReport(report("b", "2024-01-19"));
    expect(await allValues()).toHaveLength(2);
  });

  it("deletes a single report without touching the others", async () => {
    await putReport(report("a", "2021-06-12"));
    await putReport(report("b", "2024-01-19"));
    await deleteReport("a");
    expect((await listReports()).map((r) => r.hash)).toEqual(["b"]);
  });
});

describe("needs-review queue and questions", () => {
  it("stores review items", async () => {
    await putReviewItem({
      hash: "zzz",
      filename: "weird.pdf",
      addedAt: "2026-08-02T00:00:00.000Z",
      reason: "Model response was not valid JSON.",
      lines: ["garbled"],
    });
    const items = await listReviewItems();
    expect(items).toHaveLength(1);
    expect(items[0].reason).toMatch(/JSON/);
  });

  it("keeps only the latest question set", async () => {
    await saveQuestions([{ question: "First?", markerIds: ["glucose"] }], "2026-08-01T00:00:00.000Z");
    await saveQuestions([{ question: "Second?", markerIds: ["ldl"] }], "2026-08-02T00:00:00.000Z");
    const stored = await loadQuestions();
    expect(stored?.questions).toHaveLength(1);
    expect(stored?.questions[0].question).toBe("Second?");
  });
});

describe("wipe control", () => {
  it("empties every store", async () => {
    await putReport(report("a", "2021-06-12"));
    await putReviewItem({
      hash: "z",
      filename: "x.pdf",
      addedAt: "2026-08-02T00:00:00.000Z",
      reason: "unreadable",
      lines: [],
    });
    await saveQuestions([{ question: "Q?", markerIds: ["glucose"] }], "2026-08-02T00:00:00.000Z");

    await wipeAll();

    expect(await listReports()).toEqual([]);
    expect(await listReviewItems()).toEqual([]);
    expect(await loadQuestions()).toBeUndefined();
  });
});
