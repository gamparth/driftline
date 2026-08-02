import Link from "next/link";
import { Sparkline } from "./Chart";
import { RangeMeter, StatusChip, TrendBadge } from "./Status";
import type { MarkerInsight } from "@/lib/engine/insights";
import { formatDate, formatValue } from "@/lib/format";

export function markerHref(insight: { markerId: string; unit: string }): string {
  return `/marker?id=${encodeURIComponent(insight.markerId)}&unit=${encodeURIComponent(insight.unit)}`;
}

export function MarkerCard({ insight }: { insight: MarkerInsight }) {
  return (
    <Link
      href={markerHref(insight)}
      className="group flex flex-col rounded-xl border border-line bg-surface p-5 transition-all duration-200 hover:border-line-strong hover:shadow-[var(--shadow-lift)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-base text-ink">{insight.markerLabel}</p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            {insight.sampleCount} sample{insight.sampleCount === 1 ? "" : "s"}
          </p>
        </div>
        <StatusChip status={insight.status} compact />
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span
          className={`font-mono text-2xl tabular ${
            insight.status === "out-of-range" ? "text-alert" : "text-ink"
          }`}
        >
          {formatValue(insight.latest.value)}
        </span>
        <span className="font-mono text-[11px] text-muted">{insight.unit}</span>
      </div>

      <div className="mt-3">
        <RangeMeter
          value={insight.latest.value}
          range={insight.latest.referenceRange}
          unit=""
          showScale={false}
        />
      </div>

      <div className="mt-4 -mx-1">
        <Sparkline series={insight.series} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
        <TrendBadge trend={insight.trend} changePct={insight.changePct} />
        <span className="font-mono text-[10px] tabular text-muted">
          {formatDate(insight.latest.sampledAt)}
        </span>
      </div>
    </Link>
  );
}
