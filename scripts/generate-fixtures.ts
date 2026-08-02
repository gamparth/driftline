/**
 * Renders the synthetic lab-report PDFs used by the golden extraction suite.
 * Four labs, four deliberately different layouts, one synthetic patient
 * sampled 2021 → 2025 so the timeline and drift rules have real history.
 *
 *   npm run fixtures
 *
 * Expected extraction results live in tests/fixtures/expected/*.json and are
 * authored by hand — they are not derived from this file.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "tests", "fixtures", "pdfs");
const PUBLIC_DIR = path.join(process.cwd(), "public", "demo");

type Cell = { text: string; x: number };
type Line = { y: number; cells: Cell[]; bold?: boolean; size?: number };

interface Layout {
  slug: string;
  lines: Line[];
}

const PAGE_W = 612;
const PAGE_H = 792;

/** classic US tabular: Test | Result | Units | Reference Range */
function acme(): Layout {
  const rows: Array<[string, string, string, string]> = [
    ["Glucose, Fasting", "88", "mg/dL", "70 - 99"],
    ["Total Cholesterol", "182", "mg/dL", "125 - 200"],
    ["LDL Cholesterol", "104", "mg/dL", "0 - 100"],
    ["HDL Cholesterol", "56", "mg/dL", "40 - 60"],
    ["Triglycerides", "110", "mg/dL", "0 - 150"],
    ["Creatinine", "0.95", "mg/dL", "0.70 - 1.30"],
    ["ALT (SGPT)", "24", "U/L", "7 - 56"],
    ["TSH", "1.8", "mIU/L", "0.45 - 4.50"],
  ];
  const lines: Line[] = [
    { y: 730, cells: [{ text: "ACME DIAGNOSTICS", x: 60 }], bold: true, size: 16 },
    { y: 710, cells: [{ text: "Comprehensive Metabolic & Lipid Panel", x: 60 }], size: 10 },
    {
      y: 686,
      cells: [
        { text: "Patient: Sample Patient (synthetic)", x: 60 },
        { text: "Collected: 06/12/2021", x: 340 },
      ],
      size: 10,
    },
    { y: 668, cells: [{ text: "Accession: A-2021-88214", x: 60 }], size: 10 },
    {
      y: 632,
      cells: [
        { text: "Test", x: 60 },
        { text: "Result", x: 260 },
        { text: "Units", x: 340 },
        { text: "Reference Range", x: 430 },
      ],
      bold: true,
      size: 10,
    },
  ];
  rows.forEach((r, i) => {
    lines.push({
      y: 610 - i * 20,
      size: 10,
      cells: [
        { text: r[0], x: 60 },
        { text: r[1], x: 260 },
        { text: r[2], x: 340 },
        { text: r[3], x: 430 },
      ],
    });
  });
  lines.push({
    y: 610 - rows.length * 20 - 30,
    size: 8,
    cells: [{ text: "Results apply to the specimen tested. Synthetic document for testing.", x: 60 }],
  });
  return { slug: "acme-2021", lines };
}

/** European SI-unit lab: dot dates, S-/B- prefixes, one-sided intervals */
function northgate(): Layout {
  const rows: Array<[string, string, string, string]> = [
    ["S-Glucose", "5.1", "mmol/L", "3.9 - 5.5"],
    ["S-Cholesterol", "4.9", "mmol/L", "< 5.2"],
    ["S-LDL", "2.9", "mmol/L", "< 3.0"],
    ["S-HDL", "1.4", "mmol/L", "> 1.0"],
    ["S-Creatinine", "84", "µmol/L", "62 - 106"],
    ["B-HbA1c", "36", "mmol/mol", "< 42"],
    ["B-Hemoglobin", "148", "g/L", "135 - 175"],
    ["S-Ferritin", "96", "µg/L", "30 - 400"],
  ];
  const lines: Line[] = [
    { y: 740, cells: [{ text: "NORTHGATE PATHOLOGY", x: 55 }], bold: true, size: 15 },
    { y: 722, cells: [{ text: "Klinisk kemi / Clinical Chemistry", x: 55 }], size: 9 },
    { y: 698, cells: [{ text: "Provtagning / Collected: 03.11.2022", x: 55 }], size: 10 },
    { y: 684, cells: [{ text: "Remiss: NG-4471", x: 55 }], size: 10 },
    {
      y: 650,
      cells: [
        { text: "Analyte", x: 55 },
        { text: "Value", x: 250 },
        { text: "Unit", x: 330 },
        { text: "Ref. interval", x: 425 },
      ],
      bold: true,
      size: 10,
    },
  ];
  rows.forEach((r, i) => {
    lines.push({
      y: 628 - i * 19,
      size: 10,
      cells: [
        { text: r[0], x: 55 },
        { text: r[1], x: 250 },
        { text: r[2], x: 330 },
        { text: r[3], x: 425 },
      ],
    });
  });
  return { slug: "northgate-2022", lines };
}

/** inline prose style: "Marker: value unit [flag] (ref ...)" */
function helix(): Layout {
  const rows = [
    "Glucose (Fasting): 103 mg/dL [H] (ref 70-99)",
    "Hemoglobin A1c: 5.9 % [H] (ref <5.7)",
    "LDL-C: 138 mg/dL [H] (ref <100)",
    "HDL-C: 48 mg/dL (ref >40)",
    "Triglycerides: 165 mg/dL [H] (ref 0-150)",
    "TSH: 2.4 mIU/L (ref 0.45-4.50)",
    "Vitamin D, 25-OH: 22 ng/mL [L] (ref 30-100)",
    "Creatinine: 1.06 mg/dL (ref 0.70-1.30)",
  ];
  const lines: Line[] = [
    { y: 735, cells: [{ text: "HELIX LABS", x: 64 }], bold: true, size: 17 },
    { y: 716, cells: [{ text: "Lipid & Metabolic Screen — Report 24-0119", x: 64 }], size: 10 },
    { y: 692, cells: [{ text: "Specimen collected: January 19, 2024", x: 64 }], size: 10 },
    { y: 678, cells: [{ text: "Ordering provider: Dr. Sample (synthetic)", x: 64 }], size: 10 },
    { y: 650, cells: [{ text: "RESULTS", x: 64 }], bold: true, size: 11 },
  ];
  rows.forEach((text, i) => {
    lines.push({ y: 626 - i * 22, size: 11, cells: [{ text, x: 64 }] });
  });
  return { slug: "helix-2024", lines };
}

/** all-caps column report with a separate H/L flag column */
function meridian(): Layout {
  const rows: Array<[string, string, string, string, string]> = [
    ["GLUCOSE, FASTING", "118", "H", "mg/dL", "70-99"],
    ["HEMOGLOBIN A1C", "6.4", "H", "%", "<5.7"],
    ["LDL CHOLESTEROL", "141", "H", "mg/dL", "<100"],
    ["HDL CHOLESTEROL", "44", "", "mg/dL", ">40"],
    ["TRIGLYCERIDES", "198", "H", "mg/dL", "<150"],
    ["CREATININE", "1.42", "H", "mg/dL", "0.70-1.30"],
    ["ALT (SGPT)", "62", "H", "U/L", "7-56"],
    ["FERRITIN", "412", "H", "ng/mL", "30-400"],
  ];
  const lines: Line[] = [
    { y: 742, cells: [{ text: "MERIDIAN HEALTH LABORATORY", x: 50 }], bold: true, size: 14 },
    { y: 726, cells: [{ text: "1200 Sample Parkway, Suite 400", x: 50 }], size: 9 },
    { y: 700, cells: [{ text: "Date of Service: 2025-04-07", x: 50 }], size: 10 },
    { y: 686, cells: [{ text: "Report ID: MH-25-0407-119", x: 50 }], size: 10 },
    {
      y: 654,
      cells: [
        { text: "TEST NAME", x: 50 },
        { text: "RESULT", x: 240 },
        { text: "FLAG", x: 310 },
        { text: "UNITS", x: 370 },
        { text: "REFERENCE", x: 460 },
      ],
      bold: true,
      size: 9,
    },
  ];
  rows.forEach((r, i) => {
    lines.push({
      y: 632 - i * 20,
      size: 10,
      cells: [
        { text: r[0], x: 50 },
        { text: r[1], x: 240 },
        { text: r[2], x: 310 },
        { text: r[3], x: 370 },
        { text: r[4], x: 460 },
      ],
    });
  });
  lines.push({
    y: 632 - rows.length * 20 - 28,
    size: 8,
    cells: [{ text: "H = above reference, L = below reference. Synthetic document for testing.", x: 50 }],
  });
  return { slug: "meridian-2025", lines };
}

async function render(layout: Layout): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  for (const line of layout.lines) {
    for (const cell of line.cells) {
      if (!cell.text) continue;
      page.drawText(cell.text, {
        x: cell.x,
        y: line.y,
        size: line.size ?? 10,
        font: line.bold ? bold : regular,
        color: rgb(0.05, 0.05, 0.05),
      });
    }
  }
  return doc.save();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(PUBLIC_DIR, { recursive: true });
  const layouts = [acme(), northgate(), helix(), meridian()];
  for (const layout of layouts) {
    const bytes = await render(layout);
    const name = `${layout.slug}.pdf`;
    await writeFile(path.join(OUT_DIR, name), bytes);
    await writeFile(path.join(PUBLIC_DIR, name), bytes);
    console.log(`wrote ${name} (${bytes.length} bytes)`);
  }
}

main();
