import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { extractPdfLines } from "@/lib/pdf/text";
import { parseReport } from "@/lib/engine/parse";
import { normalizeValue } from "@/lib/engine/normalize";
import type { NormalizedValue } from "@/lib/engine/types";

interface ExpectedValue {
  markerId: string;
  value: number;
  unit: string;
  referenceRange: { low: number | null; high: number | null } | null;
}
interface Expected {
  lab: string;
  sampledAt: string;
  values: ExpectedValue[];
}

const FIXTURES = ["acme-2021", "northgate-2022", "helix-2024", "meridian-2025"];

async function loadFixture(slug: string) {
  const pdf = await readFile(path.join(process.cwd(), "tests/fixtures/pdfs", `${slug}.pdf`));
  const expected: Expected = JSON.parse(
    await readFile(path.join(process.cwd(), "tests/fixtures/expected", `${slug}.json`), "utf8"),
  );
  const lines = await extractPdfLines(new Uint8Array(pdf));
  const report = parseReport(lines);
  return { expected, report };
}

/** field-level accuracy across every expected value of every fixture */
const scoreboard = { fields: 0, correct: 0, rows: 0, rowsFound: 0 };

function closeEnough(a: number, b: number) {
  return Math.abs(a - b) <= Math.max(0.01, Math.abs(b) * 0.0005);
}

function checkField(ok: boolean) {
  scoreboard.fields++;
  if (ok) scoreboard.correct++;
  return ok;
}

describe.each(FIXTURES)("extraction: %s", (slug) => {
  it("extracts lab, date and every expected marker", async () => {
    const { expected, report } = await loadFixture(slug);

    expect(report).not.toBeNull();
    expect(report!.lab).toBe(expected.lab);
    expect(report!.sampledAt).toBe(expected.sampledAt);

    const normalized: NormalizedValue[] = report!.values.map(normalizeValue);
    const byId = new Map(normalized.map((v) => [v.markerId, v]));

    for (const want of expected.values) {
      scoreboard.rows++;
      const got = byId.get(want.markerId);
      expect(got, `missing marker ${want.markerId} in ${slug}`).toBeDefined();
      scoreboard.rowsFound++;

      expect(checkField(closeEnough(got!.value, want.value))).toBe(true);
      expect(checkField(got!.unit === want.unit)).toBe(true);

      if (want.referenceRange === null) {
        expect(checkField(got!.referenceRange === null)).toBe(true);
      } else {
        const r = got!.referenceRange;
        expect(r, `no range parsed for ${want.markerId}`).not.toBeNull();
        const lowOk =
          want.referenceRange.low === null
            ? r!.low === null
            : r!.low !== null && closeEnough(r!.low, want.referenceRange.low);
        const highOk =
          want.referenceRange.high === null
            ? r!.high === null
            : r!.high !== null && closeEnough(r!.high, want.referenceRange.high);
        expect(checkField(lowOk)).toBe(true);
        expect(checkField(highOk)).toBe(true);
      }

      expect(checkField(got!.sampledAt === expected.sampledAt)).toBe(true);
      expect(checkField(got!.lab === expected.lab)).toBe(true);
    }
  });

  it("does not hallucinate extra markers", async () => {
    const { expected, report } = await loadFixture(slug);
    const wantIds = new Set(expected.values.map((v) => v.markerId));
    const extra = report!.values.map(normalizeValue).filter((v) => !wantIds.has(v.markerId));
    expect(extra.map((v) => `${v.markerId}=${v.value}`)).toEqual([]);
  });
});

describe("golden suite accuracy", () => {
  it("reports field accuracy", () => {
    const pct = (scoreboard.correct / scoreboard.fields) * 100;
    const rowPct = (scoreboard.rowsFound / scoreboard.rows) * 100;
    console.log(
      `\n  extraction field accuracy: ${pct.toFixed(1)}% (${scoreboard.correct}/${scoreboard.fields} fields)` +
        `\n  marker recall: ${rowPct.toFixed(1)}% (${scoreboard.rowsFound}/${scoreboard.rows} rows)\n`,
    );
    expect(pct).toBe(100);
    expect(rowPct).toBe(100);
  });
});
