import { z } from "zod";

/** One bound may be missing: "< 200" has only high, "> 40" only low. */
export const ReferenceRangeSchema = z
  .object({
    low: z.number().nullable(),
    high: z.number().nullable(),
  })
  .refine((r) => r.low !== null || r.high !== null, {
    message: "reference range needs at least one bound",
  });

export const LabValueSchema = z.object({
  marker: z.string().min(1),
  value: z.number().finite(),
  unit: z.string().min(1),
  referenceRange: ReferenceRangeSchema.nullable(),
  sampledAt: z.iso.date(), // YYYY-MM-DD
  lab: z.string().min(1),
});

export const LabReportSchema = z.object({
  lab: z.string().min(1),
  sampledAt: z.iso.date(),
  values: z.array(LabValueSchema).min(1),
});

export type ReferenceRange = z.infer<typeof ReferenceRangeSchema>;
export type LabValue = z.infer<typeof LabValueSchema>;
export type LabReport = z.infer<typeof LabReportSchema>;

/** A LabValue whose marker/unit/range have been mapped to canonical form. */
export interface NormalizedValue extends LabValue {
  /** canonical marker id, e.g. "ldl" — or raw marker slug if unknown */
  markerId: string;
  /** display name, e.g. "LDL Cholesterol" */
  markerLabel: string;
  /** true when markerId came from the known-marker registry */
  known: boolean;
}

export interface MarkerSeries {
  markerId: string;
  markerLabel: string;
  unit: string;
  points: NormalizedValue[]; // sorted by sampledAt ascending
}

export type DriftKind = "out-of-range" | "delta";

export interface DriftFlag {
  markerId: string;
  markerLabel: string;
  kind: DriftKind;
  sampledAt: string;
  value: number;
  unit: string;
  /** for out-of-range: the violated bound; for delta: previous value */
  detail: string;
  /** percent change vs previous sample (delta flags only) */
  deltaPct?: number;
}
