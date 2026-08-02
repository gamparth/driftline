/**
 * Canonical marker registry: display name, canonical unit, and unit
 * conversions. Deterministic table — the LLM never does unit math.
 */

export interface MarkerDef {
  id: string;
  label: string;
  canonicalUnit: string;
  /** unit (normalized key) → multiply factor into canonical unit */
  conversions?: Record<string, number>;
  /** non-linear conversions, e.g. HbA1c IFCC→NGSP */
  convertFns?: Record<string, (v: number) => number>;
  aliases: string[];
}

const MG_DL_FROM_MMOL_GLUCOSE = 18.0182;
const MG_DL_FROM_MMOL_CHOL = 38.67;
const MG_DL_FROM_MMOL_TRIG = 88.57;
const MG_DL_FROM_UMOL_CREATININE = 1 / 88.4;

export const MARKERS: MarkerDef[] = [
  {
    id: "glucose",
    label: "Glucose",
    canonicalUnit: "mg/dL",
    conversions: { "mmol/l": MG_DL_FROM_MMOL_GLUCOSE },
    aliases: ["glucose", "glucose fasting", "fasting glucose", "blood glucose", "glucose serum", "p-glucose", "s-glucose"],
  },
  {
    id: "total-cholesterol",
    label: "Total Cholesterol",
    canonicalUnit: "mg/dL",
    conversions: { "mmol/l": MG_DL_FROM_MMOL_CHOL },
    aliases: ["total cholesterol", "cholesterol total", "cholesterol", "s-cholesterol"],
  },
  {
    id: "ldl",
    label: "LDL Cholesterol",
    canonicalUnit: "mg/dL",
    conversions: { "mmol/l": MG_DL_FROM_MMOL_CHOL },
    aliases: ["ldl cholesterol", "ldl-c", "ldl", "ldl chol calc", "ldl calculated", "s-ldl"],
  },
  {
    id: "hdl",
    label: "HDL Cholesterol",
    canonicalUnit: "mg/dL",
    conversions: { "mmol/l": MG_DL_FROM_MMOL_CHOL },
    aliases: ["hdl cholesterol", "hdl-c", "hdl", "s-hdl"],
  },
  {
    id: "triglycerides",
    label: "Triglycerides",
    canonicalUnit: "mg/dL",
    conversions: { "mmol/l": MG_DL_FROM_MMOL_TRIG },
    aliases: ["triglycerides", "triglyceride", "trig", "s-triglycerides"],
  },
  {
    id: "creatinine",
    label: "Creatinine",
    canonicalUnit: "mg/dL",
    conversions: { "umol/l": MG_DL_FROM_UMOL_CREATININE },
    aliases: ["creatinine", "creatinine serum", "s-creatinine", "p-creatinine"],
  },
  {
    id: "hba1c",
    label: "HbA1c",
    canonicalUnit: "%",
    // IFCC (mmol/mol) → NGSP (%): NGSP = 0.0915 × IFCC + 2.15
    convertFns: { "mmol/mol": (v) => 0.0915 * v + 2.15 },
    aliases: ["hba1c", "hemoglobin a1c", "haemoglobin a1c", "a1c", "glycated hemoglobin", "b-hba1c"],
  },
  {
    id: "tsh",
    label: "TSH",
    canonicalUnit: "mIU/L",
    conversions: { "uiu/ml": 1 },
    aliases: ["tsh", "thyroid stimulating hormone", "s-tsh", "thyrotropin"],
  },
  {
    id: "hemoglobin",
    label: "Hemoglobin",
    canonicalUnit: "g/dL",
    conversions: { "g/l": 0.1 },
    aliases: ["hemoglobin", "haemoglobin", "hgb", "hb", "b-hemoglobin"],
  },
  {
    id: "alt",
    label: "ALT",
    canonicalUnit: "U/L",
    conversions: { "iu/l": 1 },
    aliases: ["alt", "alt sgpt", "sgpt", "alanine aminotransferase", "s-alt"],
  },
  {
    id: "ast",
    label: "AST",
    canonicalUnit: "U/L",
    conversions: { "iu/l": 1 },
    aliases: ["ast", "ast sgot", "sgot", "aspartate aminotransferase", "s-ast"],
  },
  {
    id: "vitamin-d",
    label: "Vitamin D (25-OH)",
    canonicalUnit: "ng/mL",
    conversions: { "nmol/l": 1 / 2.496 },
    aliases: ["vitamin d", "vitamin d 25-oh", "25-oh vitamin d", "25-hydroxyvitamin d", "vitamin d3"],
  },
  {
    id: "ferritin",
    label: "Ferritin",
    canonicalUnit: "ng/mL",
    conversions: { "ug/l": 1 },
    aliases: ["ferritin", "s-ferritin"],
  },
  {
    id: "wbc",
    label: "WBC",
    canonicalUnit: "10³/µL",
    conversions: { "10^9/l": 1 },
    aliases: ["wbc", "white blood cell count", "white blood cells", "leukocytes"],
  },
];

/** lowercase, strip punctuation and extra spaces, drop parentheticals */
export function normalizeMarkerName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[,:;*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const aliasIndex = new Map<string, MarkerDef>();
for (const def of MARKERS) {
  for (const alias of def.aliases) aliasIndex.set(alias, def);
}

export function resolveMarker(raw: string): MarkerDef | null {
  const name = normalizeMarkerName(raw);
  const direct = aliasIndex.get(name);
  if (direct) return direct;
  // retry with parenthetical content kept as its own token, e.g. "ALT (SGPT)"
  const withParens = raw
    .toLowerCase()
    .replace(/[(),:;*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return aliasIndex.get(withParens) ?? null;
}

export function getMarker(id: string): MarkerDef | null {
  return MARKERS.find((m) => m.id === id) ?? null;
}
