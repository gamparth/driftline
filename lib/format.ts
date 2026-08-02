import type { ReferenceRange } from "@/lib/engine/types";

/**
 * Display formatting. Unit conversion leaves values like 91.89282 and ranges
 * like 0.7014 – 1.1991; full precision is kept in storage, but showing it
 * implies the lab measured to four decimals when it didn't. Precision scales
 * with magnitude so 1.42 mg/dL and 189 mg/dL both read naturally.
 */
export function formatValue(value: number): string {
  const magnitude = Math.abs(value);
  const decimals = magnitude >= 100 ? 0 : magnitude >= 10 ? 1 : 2;
  // Number() drops trailing zeros: 14.80 → 14.8, 44.00 → 44
  return String(Number(value.toFixed(decimals)));
}

export function formatRange(range: ReferenceRange | null): string {
  if (!range) return "—";
  if (range.low !== null && range.high !== null) {
    return `${formatValue(range.low)} – ${formatValue(range.high)}`;
  }
  if (range.high !== null) return `< ${formatValue(range.high)}`;
  return `> ${formatValue(range.low!)}`;
}

export function formatPercent(pct: number): string {
  return `${pct > 0 ? "+" : ""}${Number(pct.toFixed(1))}%`;
}

export function formatSigned(value: number, decimals = 1): string {
  const rounded = Number(value.toFixed(decimals));
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** ISO date → "12 Jun 2021". Parsed by hand so no timezone can shift the day. */
export function formatDate(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  const [, year, month, day] = match;
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}

export function formatMonthYear(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})/);
  if (!match) return iso;
  return `${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

/** Human gap between two ISO dates, e.g. "2.3 years". */
export function describeGap(fromIso: string, toIso: string): string {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return "";
  const days = Math.round((to - from) / 86_400_000);
  if (days < 45) return `${days} day${days === 1 ? "" : "s"}`;
  const months = Math.round(days / 30.44);
  if (months < 24) return `${months} month${months === 1 ? "" : "s"}`;
  return `${Number((months / 12).toFixed(1))} years`;
}
