/**
 * PDF → text lines. Reconstructs visual lines from pdf.js text items by
 * grouping on the baseline y, then joining items left-to-right with a
 * separator that reflects the horizontal gap — so a two-column table row
 * comes back as one line with column boundaries still legible as runs of
 * whitespace.
 */

/** vertical distance (pt) within which two items count as the same line */
const LINE_TOLERANCE = 2.5;
/** horizontal gap (pt) above which we insert a double space (column break) */
const COLUMN_GAP = 6;

interface Item {
  text: string;
  x: number;
  y: number;
  width: number;
}

export interface PdfPageLines {
  page: number;
  lines: string[];
}

const isNode =
  typeof process !== "undefined" && process.versions?.node && typeof window === "undefined";

async function loadPdfjs() {
  // Node has no DOMMatrix/Path2D, so tests load the legacy build; the browser
  // gets the modern one. Both expose the same getDocument API.
  const pdfjs = isNode
    ? await import("pdfjs-dist/legacy/build/pdf.mjs")
    : await import("pdfjs-dist/build/pdf.mjs");
  if (!isNode) {
    // Bundle the worker alongside the app rather than fetching it from a CDN —
    // nothing about a report may leave the machine.
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.mjs",
      import.meta.url,
    ).toString();
  }
  return pdfjs;
}

export async function extractPdfPages(data: Uint8Array): Promise<PdfPageLines[]> {
  const pdfjs = await loadPdfjs();
  // Buffer transfer would detach the caller's array; hand pdf.js its own copy.
  // No isEvalSupported here: pdf.js v6 removed both the option and the
  // eval-based font path it guarded, so passing it is a type error and a no-op.
  const task = pdfjs.getDocument({
    data: new Uint8Array(data),
    useSystemFonts: false,
    // Only text extraction is needed, so missing glyph data is harmless — but
    // pointing at the bundled copy keeps pdf.js from warning on every page.
    standardFontDataUrl: isNode
      ? new URL("../../node_modules/pdfjs-dist/standard_fonts/", import.meta.url).toString()
      : "/pdfjs/standard_fonts/",
  });
  const doc = await task.promise;

  const pages: PdfPageLines[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items: Item[] = [];
    for (const raw of content.items) {
      if (!("str" in raw)) continue;
      const str = raw.str;
      if (!str.trim()) continue;
      items.push({ text: str, x: raw.transform[4], y: raw.transform[5], width: raw.width ?? 0 });
    }
    pages.push({ page: p, lines: groupIntoLines(items) });
    page.cleanup();
  }
  await task.destroy();
  return pages;
}

/** Flatten every page into one ordered list of lines. */
export async function extractPdfLines(data: Uint8Array): Promise<string[]> {
  const pages = await extractPdfPages(data);
  return pages.flatMap((p) => p.lines);
}

export function groupIntoLines(items: Item[]): string[] {
  const rows: Item[][] = [];

  for (const item of [...items].sort((a, b) => b.y - a.y)) {
    const row = rows.find((r) => Math.abs(r[0].y - item.y) <= LINE_TOLERANCE);
    if (row) row.push(item);
    else rows.push([item]);
  }

  return rows.map((row) => {
    row.sort((a, b) => a.x - b.x);
    let out = "";
    let cursorX: number | null = null;
    for (const item of row) {
      if (cursorX !== null) {
        const gap = item.x - cursorX;
        out += gap > COLUMN_GAP ? "   " : gap > 0.8 ? " " : "";
      }
      out += item.text;
      cursorX = item.x + item.width;
    }
    return out.replace(/\s+$/, "");
  });
}
