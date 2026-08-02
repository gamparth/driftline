import { buildGeometry } from "@/lib/chart/geometry";
import type { MarkerSeries } from "@/lib/engine/types";

export function Sparkline({ series }: { series: MarkerSeries }) {
  const g = buildGeometry(series, { width: 240, height: 64, padding: 6 });
  return (
    <svg
      viewBox={`0 0 ${g.width} ${g.height}`}
      className="h-16 w-full"
      role="img"
      aria-label={`${series.markerLabel} trend`}
      preserveAspectRatio="none"
    >
      {g.band ? (
        <rect
          x={0}
          y={g.band.y}
          width={g.width}
          height={g.band.height}
          className="fill-accent/8"
        />
      ) : null}
      <polyline points={g.path} fill="none" className="stroke-muted" strokeWidth={1.5} />
      {g.points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={p.outOfRange ? 3 : 2}
          className={p.outOfRange ? "fill-accent" : "fill-muted"}
        />
      ))}
    </svg>
  );
}

const CHART_W = 720;
const CHART_H = 280;
const PAD = 24;

export function MarkerChart({ series }: { series: MarkerSeries }) {
  const g = buildGeometry(series, { width: CHART_W, height: CHART_H, padding: PAD });
  const gridlines = 4;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="min-w-[560px] w-full"
        role="img"
        aria-label={`${series.markerLabel} over time, in ${series.unit}`}
      >
        {Array.from({ length: gridlines + 1 }, (_, i) => {
          const y = PAD + ((CHART_H - PAD * 2) / gridlines) * i;
          const value = g.yMax - ((g.yMax - g.yMin) / gridlines) * i;
          return (
            <g key={i}>
              <line
                x1={PAD}
                x2={CHART_W - PAD}
                y1={y}
                y2={y}
                className="stroke-white/10"
                strokeWidth={1}
              />
              <text
                x={0}
                y={y - 4}
                className="fill-muted font-mono text-[10px] tabular-nums"
              >
                {formatTick(value)}
              </text>
            </g>
          );
        })}

        {g.band ? (
          <>
            <rect
              x={PAD}
              y={g.band.y}
              width={CHART_W - PAD * 2}
              height={g.band.height}
              className="fill-accent/8"
            />
            <line
              x1={PAD}
              x2={CHART_W - PAD}
              y1={g.band.y}
              y2={g.band.y}
              className="stroke-accent/30"
              strokeDasharray="3 3"
            />
            <line
              x1={PAD}
              x2={CHART_W - PAD}
              y1={g.band.y + g.band.height}
              y2={g.band.y + g.band.height}
              className="stroke-accent/30"
              strokeDasharray="3 3"
            />
          </>
        ) : null}

        <polyline points={g.path} fill="none" className="stroke-paper" strokeWidth={2} />

        {g.points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={p.outOfRange ? 5 : 3.5}
              className={p.outOfRange ? "fill-accent" : "fill-paper"}
            />
            <text
              x={p.x}
              y={CHART_H - 6}
              textAnchor="middle"
              className="fill-muted font-mono text-[10px] tabular-nums"
            >
              {p.value.sampledAt.slice(0, 7)}
            </text>
          </g>
        ))}
      </svg>
      {g.band ? (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Shaded band = reference range · accent dots = outside it
        </p>
      ) : (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Labs printed different reference ranges — no shared band shown
        </p>
      )}
    </div>
  );
}

function formatTick(value: number): string {
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
}
