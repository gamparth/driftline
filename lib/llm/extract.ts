import { LabReportSchema, type LabReport } from "@/lib/engine/types";
import { MODEL, createClient } from "./client";

/**
 * LLM extraction path — used only when the deterministic parser can't read a
 * report's layout. Same target schema, validated with the same zod schema, so
 * a hallucinated row can never reach the timeline. One retry, then the report
 * goes to the needs-review queue rather than being silently dropped.
 */

export type ExtractionResult =
  | { status: "ok"; report: LabReport }
  | { status: "needs-review"; reason: string; raw?: string };

/** Seam for tests: anything that turns a prompt into model text. */
export type LlmInvoker = (prompt: string) => Promise<string>;

export const EXTRACTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    lab: { type: "string", description: "Name of the laboratory, as printed" },
    sampledAt: { type: "string", description: "Collection date as YYYY-MM-DD" },
    values: {
      type: "array",
      items: {
        type: "object",
        properties: {
          marker: { type: "string", description: "Test name exactly as printed" },
          value: { type: "number" },
          unit: { type: "string", description: "Unit exactly as printed, e.g. mg/dL" },
          referenceRange: {
            anyOf: [
              {
                type: "object",
                properties: {
                  low: { anyOf: [{ type: "number" }, { type: "null" }] },
                  high: { anyOf: [{ type: "number" }, { type: "null" }] },
                },
                required: ["low", "high"],
                additionalProperties: false,
              },
              { type: "null" },
            ],
          },
          sampledAt: { type: "string" },
          lab: { type: "string" },
        },
        required: ["marker", "value", "unit", "referenceRange", "sampledAt", "lab"],
        additionalProperties: false,
      },
    },
  },
  required: ["lab", "sampledAt", "values"],
  additionalProperties: false,
} as const;

const SYSTEM = `You transcribe laboratory reports into structured data.

Rules:
- Transcribe only what is printed. Never infer, convert, or calculate a value.
- Keep marker names and units exactly as they appear on the report.
- A one-sided reference range uses null for the missing bound: "< 5.7" is {"low": null, "high": 5.7}, "> 40" is {"low": 40, "high": null}. No printed range at all is null.
- sampledAt is the collection date in YYYY-MM-DD. If the report prints an ambiguous numeric date, prefer the interpretation the lab's own locale implies.
- Skip anything that is not a test result: patient details, accession numbers, footnotes, page headers.
- Every value repeats the report's lab and sampledAt.`;

export function buildExtractionPrompt(lines: string[]): string {
  return `Transcribe every test result in this lab report.\n\n<report>\n${lines.join("\n")}\n</report>`;
}

/** Models sometimes wrap JSON in a fence even when asked not to. */
function stripFence(text: string): string {
  const fenced = text.trim().match(/^```(?:json)?\s*\n([\s\S]*?)\n?```$/);
  return (fenced ? fenced[1] : text).trim();
}

function validate(raw: string): ExtractionResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFence(raw));
  } catch {
    return { status: "needs-review", reason: "Model response was not valid JSON.", raw };
  }

  const result = LabReportSchema.safeParse(parsed);
  if (!result.success) {
    const issue = result.error.issues[0];
    return {
      status: "needs-review",
      reason: `Extracted data failed validation: ${issue.path.join(".") || "root"} — ${issue.message}`,
      raw,
    };
  }
  return { status: "ok", report: result.data };
}

export async function extractWithLlm(
  lines: string[],
  invoke: LlmInvoker,
): Promise<ExtractionResult> {
  const prompt = buildExtractionPrompt(lines);
  let last: ExtractionResult | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    let raw: string;
    try {
      raw = await invoke(prompt);
    } catch (error) {
      return {
        status: "needs-review",
        reason: `Extraction call failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
    last = validate(raw);
    if (last.status === "ok") return last;
  }

  return last!;
}

/** Real invoker: structured output constrained to the extraction schema. */
export function anthropicInvoker(apiKey: string): LlmInvoker {
  const client = createClient(apiKey);
  return async (prompt: string) => {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { format: { type: "json_schema", schema: EXTRACTION_JSON_SCHEMA } },
      messages: [{ role: "user", content: prompt }],
    });
    return response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
  };
}
