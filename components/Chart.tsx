"use client";

import { useState } from "react";
import { buildGeometry } from "@/lib/chart/geometry";
import type { MarkerSeries } from "@/lib/engine/types";
import { formatDate, formatMonthYear, formatValue } from "@/lib/format";

/** Thumbnail trend. Time-spaced, so cadence reads honestly even at this size. */
export function Sparkline({ series }: { series: MarkerSeries }) {
  const g = buildGeometry(series, { width: 260, height: 56, padding: 6 });
  return (
    <svg
      viewBox={`0 0 ${g.width} ${g.height}`}
      className="h-14 w-full"
      role="img"
      aria-label={`${series.markerLabel} trend, ${series.points.length} samples`}
      preserveAspectRatio="none"
    >
      {g.bands.map((band, i) => (
        <rect
          key={i}
          x={band.x0}
          y={band.y}
          width={band.x1 - band.x0}
          height={band.height}
          className="fill-ok-soft"
        />
      ))}
      <polyline
        points={g.path}
        fill="none"
        className="stroke-ink-soft"
        strokeWidth={1.5}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {g.points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={p.outOfRange ? 3.2 : 2}
          className={p.outOfRange ? "fill-alert" : "fill-ink-soft"}
        />
      ))}
    </svg>
  );
}

const W = 760;
const H = 300;
const PAD_L = 52;
const PAD_R = 20;
const PAD_T = 20;
const PAD_B = 44;

/** Full marker chart: reference band, gridlines, and per-sample inspection. */
export function MarkerChart({ series }: { series: MarkerSeries }) {
  const [active, setActive] = useState<number | null>(null);

  const g = buildGeometry(series, { width: W, height: H, padding: 0 });
  // buildGeometry pads symmetrically; this chart needs asymmetric axis gutters,
  // so it maps the normalised geometry into the plot rectangle itself.
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const mapX = (x: number) => PAD_L + (x / W) * plotW;
  const mapY = (y: number) => PAD_T + (y / H) * plotH;

  const points = g.points.map((p) => ({ ...p, cx: mapX(p.x), cy: mapY(p.y) }));
  const path = points.map((p) => `${p.cx},${p.cy}`).join(" ");
  const ticks = 4;
  const activePoint = active !== null ? points[active] : null;

  return (
    <div className="rounded-xl border border-line bg-surface p-5 md:p-6">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[600px]"
          role="img"
          aria-label={`${series.markerLabel} over time in ${series.unit}`}
          onMouseLeave={() => setActive(null)}
        >
          {Array.from({ length: ticks + 1 }, (_, i) => {
            const y = PAD_T + (plotH / ticks) * i;
            const value = g.yMax - ((g.yMax - g.yMin) / ticks) * i;
            return (
              <g key={i}>
                <line
                  x1={PAD_L}
                  x2={W - PAD_R}
                  y1={y}
                  y2={y}
                  className="stroke-line"
                  strokeWidth={1}
                />
                <text
                  x={PAD_L - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-muted font-mono text-[10px] tabular"
                >
                  {formatValue(value)}
                </text>
              </g>
            );
          })}

          {/* One band per sample: identical ranges tile into a flat band, and
              differing ones step, so every point is shown against its own. */}
          {g.bands.map((band, i) => {
            const x0 = mapX(band.x0);
            const x1 = mapX(band.x1);
            const y = mapY(band.y);
            const height = (band.height / H) * plotH;
            return (
              <g key={`band-${i}`}>
                <rect x={x0} y={y} width={x1 - x0} height={height} className="fill-ok-soft" />
                {!band.openTop ? (
                  <line x1={x0} x2={x1} y1={y} y2={y} className="stroke-ok/45" strokeWidth={1} />
                ) : null}
                {!band.openBottom ? (
                  <line
                    x1={x0}
                    x2={x1}
                    y1={y + height}
                    y2={y + height}
                    className="stroke-ok/45"
                    strokeWidth={1}
                  />
                ) : null}
              </g>
            );
          })}

          <polyline
            points={path}
            fill="none"
            className="stroke-ink"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {activePoint ? (
            <line
              x1={activePoint.cx}
              x2={activePoint.cx}
              y1={PAD_T}
              y2={PAD_T + plotH}
              className="stroke-line-strong"
              strokeWidth={1}
            />
          ) : null}

          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.cx}
                cy={p.cy}
                r={active === i ? 6.5 : p.outOfRange ? 5 : 4}
                className={p.outOfRange ? "fill-alert" : "fill-ink"}
              />
              {/* generous invisible hit area so hovering a 4px dot is easy */}
              <circle
                cx={p.cx}
                cy={p.cy}
                r={18}
                fill="transparent"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                tabIndex={0}
                role="button"
                aria-label={`${formatDate(p.value.sampledAt)}: ${formatValue(p.value.value)} ${series.unit}`}
                className="cursor-pointer outline-none"
              />
            </g>
          ))}

          {points.map((p, i) => {
            // Label only the ends plus the active point, so dense series stay legible.
            const show = i === 0 || i === points.length - 1 || active === i;
            if (!show) return null;
            return (
              <text
                key={`x-${i}`}
                x={p.cx}
                y={H - 16}
                textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
                className={`font-mono text-[10px] tabular ${active === i ? "fill-ink" : "fill-muted"}`}
              >
                {formatMonthYear(p.value.sampledAt)}
              </text>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
        <div className="flex flex-wrap items-center gap-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {g.bands.length > 0 ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-4 rounded-sm bg-ok-soft" />
              {g.band ? "reference range" : "reference range — steps where labs differ"}
            </span>
          ) : (
            <span>No reference ranges printed</span>
          )}
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-alert" /> outside range
          </span>
        </div>

        <div className="font-mono text-[11px] tabular text-ink">
          {activePoint ? (
            <>
              {formatDate(activePoint.value.sampledAt)} ·{" "}
              <span className={activePoint.outOfRange ? "text-alert" : "text-ink"}>
                {formatValue(activePoint.value.value)} {series.unit}
              </span>{" "}
              <span className="text-muted">· {activePoint.value.lab}</span>
            </>
          ) : (
            <span className="text-muted">Hover a point for detail</span>
          )}
        </div>
      </div>
    </div>
  );
}
