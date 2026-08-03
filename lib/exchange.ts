import { z } from "zod";
import { LabValueSchema } from "@/lib/engine/types";
import type { StoredReport } from "@/lib/storage/db";
import {
  LABLINE_EXPORT_FORMAT,
  LEGACY_EXPORT_FORMAT,
  MARKLINE_EXPORT_FORMAT,
  PRODUCT_EXPORT_FORMAT,
  PRODUCT_NAME,
} from "@/lib/product";

/**
 * Local export and import. A record you can only ever read inside one browser
 * is a record you don't really own — this writes a plain file to your disk and
 * reads it back. It is a download, not an upload: nothing is transmitted.
 */

export const EXPORT_FORMAT = PRODUCT_EXPORT_FORMAT;
export const EXPORT_VERSION = 1;

const NormalizedValueSchema = LabValueSchema.extend({
  markerId: z.string().min(1),
  markerLabel: z.string().min(1),
  known: z.boolean(),
});

const StoredReportSchema = z.object({
  hash: z.string().min(1),
  filename: z.string(),
  addedAt: z.string(),
  lab: z.string(),
  sampledAt: z.iso.date(),
  source: z.enum(["heuristic", "llm", "demo"]),
  values: z.array(NormalizedValueSchema),
});

export const ExportBundleSchema = z.object({
  format: z.union([
    z.literal(EXPORT_FORMAT),
    z.literal(MARKLINE_EXPORT_FORMAT),
    z.literal(LABLINE_EXPORT_FORMAT),
    z.literal(LEGACY_EXPORT_FORMAT),
  ]),
  version: z.number().int().positive(),
  exportedAt: z.string(),
  reports: z.array(StoredReportSchema),
});

export type ExportBundle = z.infer<typeof ExportBundleSchema>;

export function buildExportBundle(reports: StoredReport[], exportedAt: string): ExportBundle {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt,
    reports,
  };
}

export type ImportResult =
  | { status: "ok"; reports: StoredReport[] }
  | { status: "error"; reason: string };

export function parseImportBundle(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { status: "error", reason: "That file isn't valid JSON." };
  }

  const result = ExportBundleSchema.safeParse(parsed);
  if (!result.success) {
    const shape = (parsed as { format?: unknown })?.format;
    if (shape !== undefined && shape !== EXPORT_FORMAT) {
      return { status: "error", reason: `That file isn't a ${PRODUCT_NAME} export.` };
    }
    return { status: "error", reason: `That export is missing fields ${PRODUCT_NAME} needs.` };
  }

  if (result.data.version > EXPORT_VERSION) {
    return {
      status: "error",
      reason: `That export was written by a newer version of ${PRODUCT_NAME} (v${result.data.version}).`,
    };
  }

  return { status: "ok", reports: result.data.reports as StoredReport[] };
}

/** Flat CSV of every measurement — the shape a spreadsheet or a doctor expects. */
export function toCsv(reports: StoredReport[]): string {
  const header = [
    "sampled_at",
    "marker",
    "marker_id",
    "value",
    "unit",
    "reference_low",
    "reference_high",
    "lab",
    "source_file",
  ];

  const rows: string[][] = reports
    .flatMap((report) =>
      report.values.map((value) => [
        value.sampledAt,
        value.markerLabel,
        value.markerId,
        String(value.value),
        value.unit,
        value.referenceRange?.low === null || value.referenceRange === null
          ? ""
          : String(value.referenceRange.low),
        value.referenceRange?.high === null || value.referenceRange === null
          ? ""
          : String(value.referenceRange.high),
        value.lab,
        report.filename,
      ]),
    )
    .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Triggers a browser download without touching the network. */
export function downloadFile(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
