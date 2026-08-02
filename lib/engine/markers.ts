/**
 * Canonical marker registry: panel, display name, canonical unit, and unit
 * conversions. Deterministic table — the LLM never does unit math, and no
 * entry here encodes a clinical opinion. Reference ranges always come from the
 * report the value was printed on, never from this file.
 */

export type PanelId =
  | "lipids"
  | "metabolic"
  | "kidney"
  | "liver"
  | "thyroid"
  | "blood-count"
  | "vitamins"
  | "inflammation"
  | "hormones"
  | "electrolytes"
  | "other";

export interface Panel {
  id: PanelId;
  label: string;
  blurb: string;
}

export const PANELS: Panel[] = [
  { id: "lipids", label: "Lipids", blurb: "Cholesterol fractions and triglycerides" },
  { id: "metabolic", label: "Metabolic", blurb: "Glucose handling and long-term control" },
  { id: "kidney", label: "Kidney", blurb: "Filtration and nitrogen waste" },
  { id: "liver", label: "Liver", blurb: "Enzymes, bilirubin, and proteins" },
  { id: "thyroid", label: "Thyroid", blurb: "Thyroid-axis hormones" },
  { id: "blood-count", label: "Blood count", blurb: "Cells, haemoglobin, and indices" },
  { id: "vitamins", label: "Vitamins & minerals", blurb: "Micronutrient and iron status" },
  { id: "inflammation", label: "Inflammation", blurb: "Acute-phase and inflammatory markers" },
  { id: "hormones", label: "Hormones", blurb: "Endocrine markers outside the thyroid axis" },
  { id: "electrolytes", label: "Electrolytes", blurb: "Salts, minerals, and acid-base" },
  { id: "other", label: "Other", blurb: "Markers not in the built-in registry" },
];

export function getPanel(id: PanelId): Panel {
  return PANELS.find((p) => p.id === id) ?? PANELS[PANELS.length - 1];
}

export interface MarkerDef {
  id: string;
  label: string;
  panel: PanelId;
  canonicalUnit: string;
  /** unit (normalized key) → multiply factor into canonical unit */
  conversions?: Record<string, number>;
  /** non-linear conversions, e.g. HbA1c IFCC→NGSP */
  convertFns?: Record<string, (v: number) => number>;
  aliases: string[];
}

// Molar-mass conversion constants, kept named so the table stays readable.
const MGDL_PER_MMOL_GLUCOSE = 18.0182;
const MGDL_PER_MMOL_CHOL = 38.67;
const MGDL_PER_MMOL_TRIG = 88.57;
const MGDL_PER_UMOL_CREATININE = 1 / 88.4;
const MGDL_PER_MMOL_UREA_BUN = 2.8; // urea mmol/L → BUN mg/dL
const MGDL_PER_UMOL_BILIRUBIN = 1 / 17.1;
const MGDL_PER_UMOL_URATE = 1 / 59.48;
const MGDL_PER_MMOL_CALCIUM = 4.008;
const NGML_PER_NMOL_VITD = 1 / 2.496;
const PGML_PER_PMOL_B12 = 1 / 0.7378;
const NGML_PER_NMOL_FOLATE = 1 / 2.266;
const UGDL_PER_UMOL_IRON = 1 / 0.179;

export const MARKERS: MarkerDef[] = [
  // ---- Lipids ----
  {
    id: "total-cholesterol",
    label: "Total Cholesterol",
    panel: "lipids",
    canonicalUnit: "mg/dL",
    conversions: { "mmol/l": MGDL_PER_MMOL_CHOL },
    aliases: ["total cholesterol", "cholesterol total", "cholesterol", "s-cholesterol", "chol total", "cholesterol serum"],
  },
  {
    id: "ldl",
    label: "LDL Cholesterol",
    panel: "lipids",
    canonicalUnit: "mg/dL",
    conversions: { "mmol/l": MGDL_PER_MMOL_CHOL },
    aliases: ["ldl cholesterol", "ldl-c", "ldl", "ldl chol calc", "ldl calculated", "s-ldl", "ldl cholesterol calc", "cholesterol ldl"],
  },
  {
    id: "hdl",
    label: "HDL Cholesterol",
    panel: "lipids",
    canonicalUnit: "mg/dL",
    conversions: { "mmol/l": MGDL_PER_MMOL_CHOL },
    aliases: ["hdl cholesterol", "hdl-c", "hdl", "s-hdl", "cholesterol hdl"],
  },
  {
    id: "vldl",
    label: "VLDL Cholesterol",
    panel: "lipids",
    canonicalUnit: "mg/dL",
    conversions: { "mmol/l": MGDL_PER_MMOL_CHOL },
    aliases: ["vldl cholesterol", "vldl-c", "vldl", "vldl chol calc"],
  },
  {
    id: "non-hdl",
    label: "Non-HDL Cholesterol",
    panel: "lipids",
    canonicalUnit: "mg/dL",
    conversions: { "mmol/l": MGDL_PER_MMOL_CHOL },
    aliases: ["non hdl cholesterol", "non-hdl cholesterol", "non hdl", "non-hdl-c"],
  },
  {
    id: "triglycerides",
    label: "Triglycerides",
    panel: "lipids",
    canonicalUnit: "mg/dL",
    conversions: { "mmol/l": MGDL_PER_MMOL_TRIG },
    aliases: ["triglycerides", "triglyceride", "trig", "s-triglycerides", "tg"],
  },
  {
    id: "lipoprotein-a",
    label: "Lipoprotein(a)",
    panel: "lipids",
    canonicalUnit: "nmol/L",
    aliases: ["lipoprotein a", "lp a", "lipoprotein little a"],
  },
  {
    id: "apob",
    label: "Apolipoprotein B",
    panel: "lipids",
    canonicalUnit: "mg/dL",
    conversions: { "g/l": 100 },
    aliases: ["apolipoprotein b", "apo b", "apob", "apolipoprotein b100"],
  },

  // ---- Metabolic ----
  {
    id: "glucose",
    label: "Glucose",
    panel: "metabolic",
    canonicalUnit: "mg/dL",
    conversions: { "mmol/l": MGDL_PER_MMOL_GLUCOSE },
    aliases: ["glucose", "glucose fasting", "fasting glucose", "blood glucose", "glucose serum", "p-glucose", "s-glucose", "fasting blood sugar", "fbs", "glucose plasma"],
  },
  {
    id: "hba1c",
    label: "HbA1c",
    panel: "metabolic",
    canonicalUnit: "%",
    // IFCC (mmol/mol) → NGSP (%): NGSP = 0.0915 × IFCC + 2.15
    convertFns: { "mmol/mol": (v) => 0.0915 * v + 2.15 },
    aliases: ["hba1c", "hemoglobin a1c", "haemoglobin a1c", "a1c", "glycated hemoglobin", "b-hba1c", "glycosylated hemoglobin", "hb a1c"],
  },
  {
    id: "insulin",
    label: "Insulin",
    panel: "metabolic",
    canonicalUnit: "µIU/mL",
    conversions: { "miu/l": 1, "pmol/l": 1 / 6.945 },
    aliases: ["insulin", "insulin fasting", "fasting insulin", "s-insulin"],
  },
  {
    id: "c-peptide",
    label: "C-Peptide",
    panel: "metabolic",
    canonicalUnit: "ng/mL",
    conversions: { "nmol/l": 3.021 },
    aliases: ["c peptide", "c-peptide", "connecting peptide"],
  },

  // ---- Kidney ----
  {
    id: "creatinine",
    label: "Creatinine",
    panel: "kidney",
    canonicalUnit: "mg/dL",
    conversions: { "umol/l": MGDL_PER_UMOL_CREATININE },
    aliases: ["creatinine", "creatinine serum", "s-creatinine", "p-creatinine", "serum creatinine", "creat"],
  },
  {
    id: "egfr",
    label: "eGFR",
    panel: "kidney",
    canonicalUnit: "mL/min/1.73m²",
    conversions: { "ml/min/1.73m2": 1, "ml/min": 1 },
    aliases: ["egfr", "estimated gfr", "gfr estimated", "gfr", "egfr ckd-epi", "egfr non-african american", "estimated glomerular filtration rate"],
  },
  {
    id: "bun",
    label: "Blood Urea Nitrogen",
    panel: "kidney",
    canonicalUnit: "mg/dL",
    conversions: { "mmol/l": MGDL_PER_MMOL_UREA_BUN },
    aliases: ["bun", "blood urea nitrogen", "urea nitrogen", "urea", "s-urea", "blood urea"],
  },
  {
    id: "uric-acid",
    label: "Uric Acid",
    panel: "kidney",
    canonicalUnit: "mg/dL",
    conversions: { "umol/l": MGDL_PER_UMOL_URATE },
    aliases: ["uric acid", "urate", "s-uric acid", "serum uric acid"],
  },
  {
    id: "albumin-creatinine-ratio",
    label: "Albumin/Creatinine Ratio",
    panel: "kidney",
    canonicalUnit: "mg/g",
    aliases: ["albumin creatinine ratio", "acr", "urine albumin creatinine ratio", "microalbumin creatinine ratio"],
  },

  // ---- Liver ----
  {
    id: "alt",
    label: "ALT",
    panel: "liver",
    canonicalUnit: "U/L",
    conversions: { "iu/l": 1 },
    aliases: ["alt", "alt sgpt", "sgpt", "alanine aminotransferase", "s-alt", "alat", "alt serum"],
  },
  {
    id: "ast",
    label: "AST",
    panel: "liver",
    canonicalUnit: "U/L",
    conversions: { "iu/l": 1 },
    aliases: ["ast", "ast sgot", "sgot", "aspartate aminotransferase", "s-ast", "asat"],
  },
  {
    id: "alp",
    label: "Alkaline Phosphatase",
    panel: "liver",
    canonicalUnit: "U/L",
    conversions: { "iu/l": 1 },
    aliases: ["alkaline phosphatase", "alp", "alk phos", "s-alp", "alkaline phosphatase serum"],
  },
  {
    id: "ggt",
    label: "GGT",
    panel: "liver",
    canonicalUnit: "U/L",
    conversions: { "iu/l": 1 },
    aliases: ["ggt", "gamma gt", "gamma glutamyl transferase", "gamma-glutamyl transpeptidase", "ggtp"],
  },
  {
    id: "bilirubin-total",
    label: "Bilirubin, Total",
    panel: "liver",
    canonicalUnit: "mg/dL",
    conversions: { "umol/l": MGDL_PER_UMOL_BILIRUBIN },
    aliases: ["bilirubin total", "total bilirubin", "bilirubin", "s-bilirubin", "t bilirubin"],
  },
  {
    id: "bilirubin-direct",
    label: "Bilirubin, Direct",
    panel: "liver",
    canonicalUnit: "mg/dL",
    conversions: { "umol/l": MGDL_PER_UMOL_BILIRUBIN },
    aliases: ["bilirubin direct", "direct bilirubin", "conjugated bilirubin", "d bilirubin"],
  },
  {
    id: "albumin",
    label: "Albumin",
    panel: "liver",
    canonicalUnit: "g/dL",
    conversions: { "g/l": 0.1 },
    aliases: ["albumin", "serum albumin", "s-albumin", "alb"],
  },
  {
    id: "total-protein",
    label: "Total Protein",
    panel: "liver",
    canonicalUnit: "g/dL",
    conversions: { "g/l": 0.1 },
    aliases: ["total protein", "protein total", "serum protein", "s-protein"],
  },

  // ---- Thyroid ----
  {
    id: "tsh",
    label: "TSH",
    panel: "thyroid",
    canonicalUnit: "mIU/L",
    conversions: { "uiu/ml": 1, "miu/ml": 1000 },
    aliases: ["tsh", "thyroid stimulating hormone", "s-tsh", "thyrotropin", "tsh 3rd generation", "thyroid-stimulating hormone"],
  },
  {
    id: "free-t4",
    label: "Free T4",
    panel: "thyroid",
    canonicalUnit: "ng/dL",
    conversions: { "pmol/l": 1 / 12.87 },
    aliases: ["free t4", "ft4", "t4 free", "free thyroxine", "thyroxine free"],
  },
  {
    id: "free-t3",
    label: "Free T3",
    panel: "thyroid",
    canonicalUnit: "pg/mL",
    conversions: { "pmol/l": 1 / 1.536 },
    aliases: ["free t3", "ft3", "t3 free", "free triiodothyronine", "triiodothyronine free"],
  },
  {
    id: "tpo-antibodies",
    label: "TPO Antibodies",
    panel: "thyroid",
    canonicalUnit: "IU/mL",
    conversions: { "ku/l": 1 },
    aliases: ["tpo antibodies", "anti tpo", "thyroid peroxidase antibodies", "tpo ab", "anti-tpo antibody"],
  },

  // ---- Blood count ----
  {
    id: "hemoglobin",
    label: "Hemoglobin",
    panel: "blood-count",
    canonicalUnit: "g/dL",
    conversions: { "g/l": 0.1, "mmol/l": 1.611 },
    aliases: ["hemoglobin", "haemoglobin", "hgb", "hb", "b-hemoglobin", "hemoglobin blood"],
  },
  {
    id: "hematocrit",
    label: "Hematocrit",
    panel: "blood-count",
    canonicalUnit: "%",
    conversions: { "l/l": 100 },
    aliases: ["hematocrit", "haematocrit", "hct", "pcv", "packed cell volume"],
  },
  {
    id: "wbc",
    label: "White Blood Cells",
    panel: "blood-count",
    canonicalUnit: "10³/µL",
    conversions: { "10^9/l": 1, "10*9/l": 1, "k/ul": 1, "cells/ul": 0.001 },
    aliases: ["wbc", "white blood cell count", "white blood cells", "leukocytes", "leucocyte count", "total leukocyte count", "tlc", "b-leukocytes"],
  },
  {
    id: "rbc",
    label: "Red Blood Cells",
    panel: "blood-count",
    canonicalUnit: "10⁶/µL",
    conversions: { "10^12/l": 1, "10*12/l": 1, "m/ul": 1 },
    aliases: ["rbc", "red blood cell count", "red blood cells", "erythrocytes", "erythrocyte count"],
  },
  {
    id: "platelets",
    label: "Platelets",
    panel: "blood-count",
    canonicalUnit: "10³/µL",
    conversions: { "10^9/l": 1, "10*9/l": 1, "k/ul": 1 },
    aliases: ["platelets", "platelet count", "plt", "thrombocytes", "thrombocyte count", "b-platelets"],
  },
  {
    id: "mcv",
    label: "MCV",
    panel: "blood-count",
    canonicalUnit: "fL",
    aliases: ["mcv", "mean corpuscular volume", "mean cell volume"],
  },
  {
    id: "mch",
    label: "MCH",
    panel: "blood-count",
    canonicalUnit: "pg",
    aliases: ["mch", "mean corpuscular hemoglobin", "mean cell hemoglobin"],
  },
  {
    id: "rdw",
    label: "RDW",
    panel: "blood-count",
    canonicalUnit: "%",
    aliases: ["rdw", "red cell distribution width", "rdw-cv"],
  },
  {
    id: "neutrophils",
    label: "Neutrophils",
    panel: "blood-count",
    canonicalUnit: "%",
    aliases: ["neutrophils", "neutrophil", "neutrophils percent", "polymorphs", "segmented neutrophils"],
  },
  {
    id: "lymphocytes",
    label: "Lymphocytes",
    panel: "blood-count",
    canonicalUnit: "%",
    aliases: ["lymphocytes", "lymphocyte", "lymphocytes percent", "lymphs"],
  },

  // ---- Vitamins & minerals ----
  {
    id: "vitamin-d",
    label: "Vitamin D (25-OH)",
    panel: "vitamins",
    canonicalUnit: "ng/mL",
    conversions: { "nmol/l": NGML_PER_NMOL_VITD },
    aliases: ["vitamin d", "vitamin d 25-oh", "25-oh vitamin d", "25-hydroxyvitamin d", "vitamin d3", "vitamin d total", "25 oh vitamin d total", "s-vitamin d"],
  },
  {
    id: "vitamin-b12",
    label: "Vitamin B12",
    panel: "vitamins",
    canonicalUnit: "pg/mL",
    conversions: { "pmol/l": PGML_PER_PMOL_B12, "ng/l": 1 },
    aliases: ["vitamin b12", "b12", "cobalamin", "vit b12", "vitamin b-12"],
  },
  {
    id: "folate",
    label: "Folate",
    panel: "vitamins",
    canonicalUnit: "ng/mL",
    conversions: { "nmol/l": NGML_PER_NMOL_FOLATE, "ug/l": 1 },
    aliases: ["folate", "folic acid", "serum folate", "vitamin b9"],
  },
  {
    id: "ferritin",
    label: "Ferritin",
    panel: "vitamins",
    canonicalUnit: "ng/mL",
    conversions: { "ug/l": 1 },
    aliases: ["ferritin", "s-ferritin", "serum ferritin"],
  },
  {
    id: "iron",
    label: "Iron",
    panel: "vitamins",
    canonicalUnit: "µg/dL",
    conversions: { "umol/l": UGDL_PER_UMOL_IRON },
    aliases: ["iron", "serum iron", "s-iron", "iron total"],
  },
  {
    id: "transferrin-saturation",
    label: "Transferrin Saturation",
    panel: "vitamins",
    canonicalUnit: "%",
    aliases: ["transferrin saturation", "tsat", "iron saturation", "saturation transferrin", "% saturation"],
  },
  {
    id: "magnesium",
    label: "Magnesium",
    panel: "vitamins",
    canonicalUnit: "mg/dL",
    conversions: { "mmol/l": 2.43 },
    aliases: ["magnesium", "mg", "serum magnesium", "s-magnesium"],
  },

  // ---- Inflammation ----
  {
    id: "crp",
    label: "C-Reactive Protein",
    panel: "inflammation",
    canonicalUnit: "mg/L",
    conversions: { "mg/dl": 10 },
    aliases: ["crp", "c reactive protein", "c-reactive protein", "hs crp", "hs-crp", "high sensitivity crp", "crp quantitative"],
  },
  {
    id: "esr",
    label: "ESR",
    panel: "inflammation",
    canonicalUnit: "mm/hr",
    conversions: { "mm/h": 1 },
    aliases: ["esr", "erythrocyte sedimentation rate", "sed rate", "sedimentation rate"],
  },
  {
    id: "homocysteine",
    label: "Homocysteine",
    panel: "inflammation",
    canonicalUnit: "µmol/L",
    aliases: ["homocysteine", "total homocysteine", "hcy"],
  },

  // ---- Hormones ----
  {
    id: "testosterone-total",
    label: "Testosterone, Total",
    panel: "hormones",
    canonicalUnit: "ng/dL",
    conversions: { "nmol/l": 28.84 },
    aliases: ["testosterone total", "total testosterone", "testosterone", "s-testosterone"],
  },
  {
    id: "cortisol",
    label: "Cortisol",
    panel: "hormones",
    canonicalUnit: "µg/dL",
    conversions: { "nmol/l": 1 / 27.59 },
    aliases: ["cortisol", "cortisol morning", "serum cortisol", "cortisol am"],
  },
  {
    id: "psa",
    label: "PSA",
    panel: "hormones",
    canonicalUnit: "ng/mL",
    conversions: { "ug/l": 1 },
    aliases: ["psa", "prostate specific antigen", "psa total", "total psa"],
  },

  // ---- Electrolytes ----
  {
    id: "sodium",
    label: "Sodium",
    panel: "electrolytes",
    canonicalUnit: "mmol/L",
    conversions: { "meq/l": 1 },
    aliases: ["sodium", "na", "s-sodium", "serum sodium"],
  },
  {
    id: "potassium",
    label: "Potassium",
    panel: "electrolytes",
    canonicalUnit: "mmol/L",
    conversions: { "meq/l": 1 },
    aliases: ["potassium", "k", "s-potassium", "serum potassium"],
  },
  {
    id: "chloride",
    label: "Chloride",
    panel: "electrolytes",
    canonicalUnit: "mmol/L",
    conversions: { "meq/l": 1 },
    aliases: ["chloride", "cl", "s-chloride", "serum chloride"],
  },
  {
    id: "bicarbonate",
    label: "Bicarbonate",
    panel: "electrolytes",
    canonicalUnit: "mmol/L",
    conversions: { "meq/l": 1 },
    aliases: ["bicarbonate", "co2", "carbon dioxide", "hco3", "total co2"],
  },
  {
    id: "calcium",
    label: "Calcium",
    panel: "electrolytes",
    canonicalUnit: "mg/dL",
    conversions: { "mmol/l": MGDL_PER_MMOL_CALCIUM },
    aliases: ["calcium", "ca", "s-calcium", "serum calcium", "calcium total"],
  },
  {
    id: "phosphorus",
    label: "Phosphorus",
    panel: "electrolytes",
    canonicalUnit: "mg/dL",
    conversions: { "mmol/l": 3.097 },
    aliases: ["phosphorus", "phosphate", "inorganic phosphorus", "s-phosphate"],
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
  for (const alias of def.aliases) {
    if (aliasIndex.has(alias) && aliasIndex.get(alias) !== def) {
      throw new Error(`Duplicate marker alias "${alias}"`);
    }
    aliasIndex.set(alias, def);
  }
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

export function panelForMarker(id: string): PanelId {
  return getMarker(id)?.panel ?? "other";
}
