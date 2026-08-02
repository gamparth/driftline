import { resolveMarker } from "./markers";
import { LabReportSchema, type LabReport, type LabValue, type ReferenceRange } from "./types";

/**
 * Deterministic lab-report parser. Works on the visual lines produced by
 * lib/pdf/text — column layouts arrive as one line with runs of whitespace
 * marking column boundaries, inline layouts as "Marker: value unit (ref …)".
 * Anything this cannot read falls through to the LLM extractor.
 */

const DATE_KEYWORDS =
  /\b(collected|collection|drawn|specimen|sampled|date of service|service date|report(ed)? date|test date|visit date)\b/i;

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

/** flag columns/markers labs print next to a value */
const FLAG_TOKEN = /^\[?(H{1,2}|L{1,2}|A|N|ABN|CRIT)\]?$/i;

/** units without a slash that still name a real unit */
const SLASHLESS_UNITS = new Set(["%", "ratio", "miu", "iu", "pg", "fl", "meq", "mmhg"]);

const NUMBER = /^-?\d[\d,]*(\.\d+)?$/;

function iso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
}

/**
 * Slash dates are read month-first (US convention) unless the first component
 * is >12; dot dates are read day-first (European convention). Documented in
 * docs/DECISIONS.md — ambiguous dates have no correct answer without a locale.
 */
export function parseDate(text: string): string | null {
  const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) return iso(+isoMatch[1], +isoMatch[2], +isoMatch[3]);

  const longMatch = text.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/);
  if (longMatch) {
    const month = MONTHS[longMatch[1].toLowerCase()];
    if (month) return iso(+longMatch[3], month, +longMatch[2]);
  }

  const dayFirstLong = text.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})\b/);
  if (dayFirstLong) {
    const month = MONTHS[dayFirstLong[2].toLowerCase()];
    if (month) return iso(+dayFirstLong[3], month, +dayFirstLong[1]);
  }

  const dotted = text.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/);
  if (dotted) return iso(+dotted[3], +dotted[2], +dotted[1]);

  const slashed = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (slashed) {
    const a = +slashed[1];
    const b = +slashed[2];
    return a > 12 ? iso(+slashed[3], b, a) : iso(+slashed[3], a, b);
  }

  return null;
}

function looksLikeUnit(token: string): boolean {
  const t = token.replace(/[[\]()]/g, "");
  if (!t) return false;
  if (t === "%") return true;
  if (SLASHLESS_UNITS.has(t.toLowerCase())) return true;
  return /^(10\^?\d+|[A-Za-zµμ]+)(\/[A-Za-zµμ0-9]+)+$/.test(t);
}

function toNumber(token: string): number | null {
  if (!NUMBER.test(token)) return null;
  const n = Number(token.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function parseRange(raw: string): ReferenceRange | null {
  const text = raw
    .replace(/[[\]()]/g, " ")
    .replace(/\b(ref(erence)?|normal|interval|range)\b[:.]?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;

  const between = text.match(
    /(-?\d[\d,]*(?:\.\d+)?)\s*(?:[-–—]|to)\s*(-?\d[\d,]*(?:\.\d+)?)/,
  );
  if (between) {
    const low = toNumber(between[1]);
    const high = toNumber(between[2]);
    if (low !== null && high !== null) return { low, high };
  }

  const upper = text.match(/[<≤]\s*=?\s*(-?\d[\d,]*(?:\.\d+)?)/);
  if (upper) {
    const high = toNumber(upper[1]);
    if (high !== null) return { low: null, high };
  }

  const lower = text.match(/[>≥]\s*=?\s*(-?\d[\d,]*(?:\.\d+)?)/);
  if (lower) {
    const low = toNumber(lower[1]);
    if (low !== null) return { low, high: null };
  }

  return null;
}

interface RowParse {
  marker: string;
  value: number;
  unit: string;
  referenceRange: ReferenceRange | null;
}

/** Split a visual line into a marker name and everything that follows it. */
function splitLine(line: string): { name: string; rest: string } | null {
  const columns = line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
  if (columns.length >= 2) {
    return { name: columns[0], rest: columns.slice(1).join(" ") };
  }
  const colon = line.indexOf(":");
  if (colon > 0) {
    return { name: line.slice(0, colon).trim(), rest: line.slice(colon + 1).trim() };
  }
  return null;
}

export function parseRow(line: string): RowParse | null {
  const split = splitLine(line);
  if (!split || !split.name) return null;

  const tokens = split.rest.split(/\s+/).filter((t) => t && !FLAG_TOKEN.test(t));

  let valueIdx = -1;
  let value: number | null = null;
  for (let i = 0; i < tokens.length; i++) {
    const n = toNumber(tokens[i]);
    if (n !== null) {
      value = n;
      valueIdx = i;
      break;
    }
  }
  if (value === null) return null;

  let unit: string | null = null;
  let unitIdx = -1;
  for (let i = valueIdx + 1; i < tokens.length; i++) {
    if (looksLikeUnit(tokens[i])) {
      unit = tokens[i].replace(/[[\]()]/g, "");
      unitIdx = i;
      break;
    }
    // a second bare number before any unit means this line is not a result row
    if (toNumber(tokens[i]) !== null) break;
  }
  if (!unit) return null;

  const referenceRange = parseRange(tokens.slice(unitIdx + 1).join(" "));
  const known = resolveMarker(split.name) !== null;
  if (!known && !referenceRange) return null;

  return { marker: split.name, value, unit, referenceRange };
}

function parseLab(lines: string[]): string {
  const first = lines.find((l) => l.trim().length > 0) ?? "Unknown lab";
  return first
    .split(/\s+[—–-]\s+/)[0]
    .replace(/\s{2,}.*$/, "")
    .trim();
}

function parseSampledAt(lines: string[]): string | null {
  for (const line of lines) {
    if (!DATE_KEYWORDS.test(line)) continue;
    const d = parseDate(line);
    if (d) return d;
  }
  for (const line of lines) {
    const d = parseDate(line);
    if (d) return d;
  }
  return null;
}

/**
 * Parse extracted PDF lines into a validated LabReport, or null when the
 * layout yields no usable rows (caller then tries the LLM extractor).
 */
export function parseReport(lines: string[]): LabReport | null {
  const lab = parseLab(lines);
  const sampledAt = parseSampledAt(lines);
  if (!sampledAt) return null;

  const values: LabValue[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (DATE_KEYWORDS.test(line)) continue;
    const row = parseRow(line);
    if (!row) continue;
    const key = resolveMarker(row.marker)?.id ?? row.marker.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    values.push({ ...row, sampledAt, lab });
  }

  if (values.length === 0) return null;

  const parsed = LabReportSchema.safeParse({ lab, sampledAt, values });
  return parsed.success ? parsed.data : null;
}
