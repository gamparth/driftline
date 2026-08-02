import { extractPdfLines } from "@/lib/pdf/text";
import { parseReport } from "@/lib/engine/parse";
import { normalizeValue } from "@/lib/engine/normalize";
import { extractWithLlm, anthropicInvoker } from "@/lib/llm/extract";
import { getApiKey } from "@/lib/llm/client";
import {
  hashBytes,
  hasReport,
  putReport,
  putReviewItem,
  type ExtractionSource,
} from "@/lib/storage/db";

/**
 * One PDF in, one stored report out. Heuristic parser first; the LLM only sees
 * a report the parser couldn't read, and only when the user has supplied a key.
 */

export type IngestOutcome =
  | { status: "added"; filename: string; markers: number; source: ExtractionSource }
  | { status: "duplicate"; filename: string }
  | { status: "needs-review"; filename: string; reason: string };

export async function ingestPdf(
  filename: string,
  bytes: Uint8Array,
  source: ExtractionSource = "heuristic",
): Promise<IngestOutcome> {
  const hash = await hashBytes(bytes);
  if (await hasReport(hash)) return { status: "duplicate", filename };

  let lines: string[];
  try {
    lines = await extractPdfLines(bytes);
  } catch (error) {
    const reason = `Could not read the PDF: ${error instanceof Error ? error.message : String(error)}`;
    await putReviewItem({ hash, filename, addedAt: new Date().toISOString(), reason, lines: [] });
    return { status: "needs-review", filename, reason };
  }

  const parsed = parseReport(lines);
  if (parsed) {
    await putReport({
      hash,
      filename,
      addedAt: new Date().toISOString(),
      lab: parsed.lab,
      sampledAt: parsed.sampledAt,
      source,
      values: parsed.values.map(normalizeValue),
    });
    return { status: "added", filename, markers: parsed.values.length, source };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    const reason =
      "This layout needs the AI extractor, which requires an Anthropic API key in Settings.";
    await putReviewItem({ hash, filename, addedAt: new Date().toISOString(), reason, lines });
    return { status: "needs-review", filename, reason };
  }

  const result = await extractWithLlm(lines, anthropicInvoker(apiKey));
  if (result.status === "ok") {
    await putReport({
      hash,
      filename,
      addedAt: new Date().toISOString(),
      lab: result.report.lab,
      sampledAt: result.report.sampledAt,
      source: "llm",
      values: result.report.values.map(normalizeValue),
    });
    return { status: "added", filename, markers: result.report.values.length, source: "llm" };
  }

  await putReviewItem({
    hash,
    filename,
    addedAt: new Date().toISOString(),
    reason: result.reason,
    lines,
  });
  return { status: "needs-review", filename, reason: result.reason };
}

/** The four synthetic reports behind the demo button, run through the real pipeline. */
export const DEMO_FILES = [
  "acme-2021.pdf",
  "northgate-2022.pdf",
  "helix-2024.pdf",
  "meridian-2025.pdf",
];

export async function loadDemoData(
  onProgress?: (filename: string) => void,
): Promise<IngestOutcome[]> {
  const outcomes: IngestOutcome[] = [];
  for (const name of DEMO_FILES) {
    onProgress?.(name);
    const response = await fetch(`/demo/${name}`);
    if (!response.ok) {
      outcomes.push({
        status: "needs-review",
        filename: name,
        reason: `Demo file failed to load (${response.status}).`,
      });
      continue;
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    outcomes.push(await ingestPdf(name, bytes, "demo"));
  }
  return outcomes;
}
