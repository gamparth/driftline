import { describe, expect, it } from "vitest";
import { resolveMarker } from "@/lib/engine/markers";
import { normalizeValue } from "@/lib/engine/normalize";
import type { LabValue } from "@/lib/engine/types";

function lv(partial: Partial<LabValue>): LabValue {
  return {
    marker: "Glucose",
    value: 92,
    unit: "mg/dL",
    referenceRange: { low: 70, high: 99 },
    sampledAt: "2022-03-15",
    lab: "ACME Diagnostics",
    ...partial,
  };
}

describe("resolveMarker", () => {
  it("maps aliases to canonical ids", () => {
    expect(resolveMarker("Glucose")?.id).toBe("glucose");
    expect(resolveMarker("GLUCOSE, FASTING")?.id).toBe("glucose");
    expect(resolveMarker("LDL Cholesterol")?.id).toBe("ldl");
    expect(resolveMarker("LDL-C")?.id).toBe("ldl");
    expect(resolveMarker("Total Cholesterol")?.id).toBe("total-cholesterol");
    expect(resolveMarker("Cholesterol, Total")?.id).toBe("total-cholesterol");
    expect(resolveMarker("HbA1c")?.id).toBe("hba1c");
    expect(resolveMarker("Hemoglobin A1c")?.id).toBe("hba1c");
    expect(resolveMarker("S-Creatinine")?.id).toBe("creatinine");
    expect(resolveMarker("ALT (SGPT)")?.id).toBe("alt");
  });

  it("returns null for unknown markers", () => {
    expect(resolveMarker("Frobnicase")).toBeNull();
  });
});

describe("normalizeValue", () => {
  it("keeps canonical-unit values untouched", () => {
    const n = normalizeValue(lv({}));
    expect(n.markerId).toBe("glucose");
    expect(n.value).toBe(92);
    expect(n.unit).toBe("mg/dL");
    expect(n.known).toBe(true);
  });

  it("converts glucose mmol/L to mg/dL, range included", () => {
    const n = normalizeValue(
      lv({ value: 5.2, unit: "mmol/L", referenceRange: { low: 3.9, high: 5.5 } }),
    );
    expect(n.unit).toBe("mg/dL");
    expect(n.value).toBeCloseTo(93.7, 0);
    expect(n.referenceRange!.low!).toBeCloseTo(70.3, 0);
    expect(n.referenceRange!.high!).toBeCloseTo(99.1, 0);
  });

  it("converts cholesterol-family mmol/L to mg/dL", () => {
    const ldl = normalizeValue(
      lv({ marker: "LDL", value: 3.1, unit: "mmol/L", referenceRange: { low: null, high: 3.4 } }),
    );
    expect(ldl.value).toBeCloseTo(119.9, 0);
    const trig = normalizeValue(
      lv({ marker: "Triglycerides", value: 1.5, unit: "mmol/L", referenceRange: null }),
    );
    expect(trig.value).toBeCloseTo(132.9, 0);
  });

  it("converts creatinine µmol/L to mg/dL", () => {
    const n = normalizeValue(
      lv({ marker: "Creatinine", value: 80, unit: "µmol/L", referenceRange: { low: 62, high: 115 } }),
    );
    expect(n.value).toBeCloseTo(0.9, 1);
    expect(n.unit).toBe("mg/dL");
  });

  it("converts hemoglobin g/L to g/dL", () => {
    const n = normalizeValue(
      lv({ marker: "Hemoglobin", value: 145, unit: "g/L", referenceRange: { low: 135, high: 175 } }),
    );
    expect(n.value).toBeCloseTo(14.5, 1);
    expect(n.unit).toBe("g/dL");
  });

  it("converts HbA1c IFCC mmol/mol to NGSP %", () => {
    const n = normalizeValue(
      lv({ marker: "HbA1c", value: 36, unit: "mmol/mol", referenceRange: { low: null, high: 42 } }),
    );
    expect(n.unit).toBe("%");
    expect(n.value).toBeCloseTo(5.4, 1);
    expect(n.referenceRange!.high!).toBeCloseTo(6.0, 1);
  });

  it("passes unknown markers through with slug id", () => {
    const n = normalizeValue(lv({ marker: "Frobnicase", value: 3, unit: "U/L" }));
    expect(n.known).toBe(false);
    expect(n.markerId).toBe("frobnicase");
    expect(n.value).toBe(3);
  });

  it("treats unit synonyms as canonical (case, micro sign)", () => {
    const a = normalizeValue(lv({ marker: "Creatinine", value: 88.4, unit: "umol/l", referenceRange: null }));
    expect(a.value).toBeCloseTo(1.0, 2);
    const b = normalizeValue(lv({ unit: "MG/DL" }));
    expect(b.value).toBe(92);
    expect(b.unit).toBe("mg/dL");
  });
});
