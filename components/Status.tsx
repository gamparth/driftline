import type { MarkerStatus, Trend } from "@/lib/engine/insights";
import type { ReferenceRange } from "@/lib/engine/types";
import { formatPercent, formatValue } from "@/lib/format";

/** One place decides what each status looks like, so colour always means the same thing. */
export const STATUS_META: Record<MarkerStatus, { label: string; dot: string; text: string; chip: string }> = {
  "in-range": {
    label: "In range",
    dot: "bg-ok",
    text: "text-ok",
    chip: "border-ok/30 bg-ok-soft text-ok",
  },
  "out-of-range": {
    label: "Out of range",
    dot: "bg-alert",
    text: "text-alert",
    chip: "border-alert/30 bg-alert-soft text-alert",
  },
  unknown: {
    label: "No range printed",
    dot: "bg-muted",
    text: "text-muted",
    chip: "border-line bg-white text-muted",
  },
};

export function StatusChip({ status, compact }: { status: MarkerStatus; compact?: boolean }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] ${meta.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {compact ? (status === "out-of-range" ? "Out" : status === "in-range" ? "In" : "—") : meta.label}
    </span>
  );
}

export function TrendBadge({ trend, changePct }: { trend: Trend; changePct: number | null }) {
  if (trend === "insufficient" || changePct === null) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        First sample
      </span>
    );
  }
  const arrow = trend === "rising" ? "↑" : trend === "falling" ? "↓" : "→";
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tabular text-ink-soft">
      <span aria-hidden="true">{arrow}</span>
      {formatPercent(changePct)}
      <span className="text-muted">vs last</span>
    </span>
  );
}

/**
 * Where a value sits relative to the range its own lab printed. The single most
 * useful thing to see at a glance — it answers "is this fine?" without reading
 * a number, and degrades honestly when the report printed no range.
 */
export function RangeMeter({
  value,
  range,
  unit,
  showScale = true,
}: {
  value: number;
  range: ReferenceRange | null;
  unit: string;
  showScale?: boolean;
}) {
  if (!range) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 rounded-full bg-[#dce8e4]" />
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          No range printed
        </span>
      </div>
    );
  }

  const { low, high } = range;
  // Domain wide enough that an out-of-range value still lands on the track.
  let domainMin: number;
  let domainMax: number;
  if (low !== null && high !== null) {
    const pad = (high - low) * 0.75 || Math.abs(high) * 0.5 || 1;
    domainMin = low - pad;
    domainMax = high + pad;
  } else if (high !== null) {
    domainMin = 0;
    domainMax = high * 1.8 || 1;
  } else {
    domainMin = 0;
    domainMax = low! * 2.2 || 1;
  }
  domainMin = Math.min(domainMin, value);
  domainMax = Math.max(domainMax, value);

  const span = domainMax - domainMin || 1;
  const pct = (v: number) => ((v - domainMin) / span) * 100;

  const bandStart = low !== null ? pct(low) : 0;
  const bandEnd = high !== null ? pct(high) : 100;
  const valuePct = Math.min(Math.max(pct(value), 0), 100);
  const outside =
    (low !== null && value < low) || (high !== null && value > high);

  return (
    <div>
      <div className="relative h-2 rounded-full bg-[#dce8e4]">
        <div
          className="absolute inset-y-0 rounded-full bg-ok-soft"
          style={{ left: `${bandStart}%`, width: `${Math.max(bandEnd - bandStart, 1)}%` }}
        />
        <div
          className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm ${
            outside ? "bg-alert" : "bg-ok"
          }`}
          style={{ left: `${valuePct}%` }}
        />
      </div>
      {showScale ? (
        <div className="mt-2 flex justify-between font-mono text-[10px] tabular text-muted">
          <span>{low !== null ? formatValue(low) : "—"}</span>
          <span>
            reference {unit ? <span className="text-muted/70">{unit}</span> : null}
          </span>
          <span>{high !== null ? formatValue(high) : "—"}</span>
        </div>
      ) : null}
    </div>
  );
}
