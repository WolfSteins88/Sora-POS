"use client";

import { useId, useState } from "react";
import { money } from "@/lib/format";

type Point = { label: string; revenue: number; trx: number };
type RangeKey = "today" | "week" | "month";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Hari ini" },
  { key: "week", label: "7 hari" },
  { key: "month", label: "30 hari" },
];

const VB_W = 640;
const VB_H = 220;
const PAD = { l: 48, r: 8, t: 12, b: 28 };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function compactAxis(value: number) {
  if (value >= 1_000_000) {
    const scaled = value / 1_000_000;
    const text = scaled >= 10 ? String(Math.round(scaled)) : scaled.toFixed(1).replace(".", ",");
    return `${text} jt`;
  }
  if (value >= 1_000) return `${Math.round(value / 1000)} rb`;
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace(".", ",");
}

function axisLabel(label: string, range: RangeKey) {
  if (range === "today") return label.slice(0, 5);
  const [year, month, day] = label.split("-");
  if (!year || !month || !day) return label;
  return `${Number(day)} ${MONTHS[Number(month) - 1] ?? ""}`;
}

export function SalesAreaChart({
  today,
  week,
  month,
}: {
  today: Point[];
  week: Point[];
  month: Point[];
}) {
  const [range, setRange] = useState<RangeKey>("today");
  const [active, setActive] = useState<number | null>(null);
  const gradId = useId().replace(/:/g, "");
  const source = range === "today" ? today : range === "week" ? week : month;
  const series = source.map((point) => ({ ...point, axis: axisLabel(point.label, range) }));
  const max = Math.max(...series.map((point) => point.revenue), 1);
  const innerW = VB_W - PAD.l - PAD.r;
  const innerH = VB_H - PAD.t - PAD.b;
  const baseY = PAD.t + innerH;
  const coords = series.map((point, index) => {
    const x = series.length <= 1 ? PAD.l + innerW / 2 : PAD.l + (index * innerW) / (series.length - 1);
    const y = PAD.t + innerH - (point.revenue / max) * innerH;
    return { ...point, x, y };
  });
  const line = smoothPath(coords);
  const area =
    coords.length > 0
      ? `${line} L ${coords[coords.length - 1].x.toFixed(1)} ${baseY} L ${coords[0].x.toFixed(1)} ${baseY} Z`
      : "";
  const ticks = [0, 0.5, 1].map((step) => ({
    step,
    y: PAD.t + innerH - step * innerH,
    label: compactAxis(max * step),
  }));
  const labelStep = range === "month" ? 5 : range === "today" ? 2 : 1;
  const total = series.reduce((sum, point) => sum + point.revenue, 0);
  const hovered = active == null ? null : coords[active];
  const rangeLabel = RANGES.find((item) => item.key === range)?.label ?? "Hari ini";

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Omset</h2>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{money(total)}</p>
          <p className="text-xs text-muted">{rangeLabel}</p>
        </div>
        <label>
          <span className="sr-only">Rentang omset</span>
          <select
            value={range}
            onChange={(event) => {
              setRange(event.target.value as RangeKey);
              setActive(null);
            }}
            className="min-h-11 rounded-full border border-line bg-surface px-3 text-sm"
          >
            {RANGES.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="h-56 w-full"
          role="img"
          aria-label={`Grafik omset ${rangeLabel}`}
          onMouseLeave={() => setActive(null)}
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            if (rect.width <= 0) return;
            const x = ((event.clientX - rect.left) / rect.width) * VB_W;
            let nearest = 0;
            let best = Number.POSITIVE_INFINITY;
            coords.forEach((point, index) => {
              const distance = Math.abs(point.x - x);
              if (distance < best) {
                best = distance;
                nearest = index;
              }
            });
            setActive(nearest);
          }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {ticks.map((tick) => (
            <g key={tick.step}>
              <line
                x1={PAD.l}
                x2={VB_W - PAD.r}
                y1={tick.y}
                y2={tick.y}
                className="stroke-line"
                strokeDasharray="3 4"
              />
              <text x={PAD.l - 8} y={tick.y + 4} textAnchor="end" className="fill-muted text-[11px]">
                {tick.label}
              </text>
            </g>
          ))}
          {area ? <path d={area} fill={`url(#${gradId})`} /> : null}
          {line ? (
            <path
              d={line}
              fill="none"
              className="stroke-accent"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
          {hovered ? <line x1={hovered.x} x2={hovered.x} y1={PAD.t} y2={baseY} className="stroke-accent/35" /> : null}
          {coords.map((point, index) => (
            <g key={`${point.label}-${index}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r={active === index ? 5 : 0}
                className="fill-surface stroke-accent motion-safe:transition-[r] motion-safe:duration-150"
                strokeWidth="2"
              />
              <circle
                cx={point.x}
                cy={point.y}
                r="10"
                className="fill-transparent outline-none focus-visible:fill-accent/20"
                tabIndex={0}
                role="button"
                aria-label={`${point.axis}, ${money(point.revenue)}, ${point.trx} transaksi`}
                onFocus={() => setActive(index)}
                onBlur={() => setActive((current) => (current === index ? null : current))}
              />
              {index % labelStep === 0 ? (
                <text x={point.x} y={VB_H - 6} textAnchor="middle" className="fill-muted text-[11px]">
                  {point.axis}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
        {hovered ? (
          <div
            className="pointer-events-none absolute z-10 min-w-28 -translate-x-1/2 -translate-y-[115%] rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-card"
            style={{ left: `${(hovered.x / VB_W) * 100}%`, top: `${(hovered.y / VB_H) * 100}%` }}
            role="status"
          >
            <p className="font-medium">{hovered.axis}</p>
            <p>{money(hovered.revenue)}</p>
            <p className="text-muted">{hovered.trx} transaksi</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
