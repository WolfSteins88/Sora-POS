"use client";

import { useState } from "react";
import { money } from "@/lib/format";

type Point = { label: string; revenue: number; trx: number };
type RangeKey = "today" | "week" | "month";

const RANGES: { key: RangeKey; label: string; caption: string }[] = [
  { key: "today", label: "Hari ini", caption: "dibanding kemarin" },
  { key: "week", label: "7 hari", caption: "dibanding 7 hari sebelumnya" },
  { key: "month", label: "30 hari", caption: "dibanding 30 hari sebelumnya" },
];

const VB_W = 640;
const VB_H = 220;
const PAD = { l: 48, r: 8, t: 16, b: 28 };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

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

function ChangeBadge({ current, previous, caption }: { current: number; previous: number; caption: string }) {
  if (previous <= 0 && current <= 0) {
    return <p className="text-xs text-muted">0% {caption}</p>;
  }
  if (previous <= 0) {
    return <p className="text-xs font-medium text-ok">Baru {caption}</p>;
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  const up = pct >= 0;
  return (
    <p className={`text-xs font-medium ${up ? "text-ok" : "text-danger"}`}>
      {up ? "+" : ""}
      {pct}% {caption}
    </p>
  );
}

export function RetailBarChart({
  today,
  week,
  month,
  compare,
}: {
  today: Point[];
  week: Point[];
  month: Point[];
  compare: { today: number; week: number; month: number };
}) {
  const [range, setRange] = useState<RangeKey>("today");
  const [active, setActive] = useState<number | null>(null);
  const meta = RANGES.find((item) => item.key === range) ?? RANGES[0];
  const source = range === "today" ? today : range === "week" ? week : month;
  const series = source.map((point) => ({ ...point, axis: axisLabel(point.label, range) }));
  const max = Math.max(...series.map((point) => point.revenue), 1);
  const innerW = VB_W - PAD.l - PAD.r;
  const innerH = VB_H - PAD.t - PAD.b;
  const baseY = PAD.t + innerH;
  const slot = series.length > 0 ? innerW / series.length : innerW;
  const barW = Math.max(4, Math.min(22, slot * 0.55));
  const coords = series.map((point, index) => {
    const x = PAD.l + index * slot + slot / 2;
    const h = (point.revenue / max) * innerH;
    return { ...point, x, h: Math.max(point.revenue > 0 ? 4 : 0, h) };
  });
  const ticks = [0, 0.5, 1].map((step) => ({
    step,
    y: PAD.t + innerH - step * innerH,
    label: compactAxis(max * step),
  }));
  const labelStep = range === "month" ? 5 : range === "today" ? 2 : 1;
  const total = series.reduce((sum, point) => sum + point.revenue, 0);
  const hovered = active == null ? null : coords[active];

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Penjualan</h2>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{money(total)}</p>
          <ChangeBadge current={total} previous={compare[range]} caption={meta.caption} />
        </div>
        <label>
          <span className="sr-only">Rentang penjualan</span>
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
        {series.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">Belum ada penjualan pada {meta.label.toLowerCase()}.</p>
        ) : (
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="h-56 w-full"
            role="img"
            aria-label={`Grafik penjualan ${meta.label}`}
            onMouseLeave={() => setActive(null)}
            onMouseMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              if (rect.width <= 0 || coords.length === 0) return;
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
            {ticks.map((tick) => (
              <g key={tick.step}>
                <line x1={PAD.l} x2={VB_W - PAD.r} y1={tick.y} y2={tick.y} className="stroke-line" strokeDasharray="3 4" />
                <text x={PAD.l - 8} y={tick.y + 4} textAnchor="end" className="fill-muted text-[11px]">
                  {tick.label}
                </text>
              </g>
            ))}
            {coords.map((point, index) => (
              <g key={`${point.label}-${index}`}>
                <rect
                  x={point.x - barW / 2}
                  y={baseY - point.h}
                  width={barW}
                  height={point.h}
                  rx="4"
                  className={active === index ? "fill-accent" : "fill-accent/45"}
                />
                <rect
                  x={point.x - slot / 2}
                  y={PAD.t}
                  width={slot}
                  height={innerH}
                  className="fill-transparent outline-none focus-visible:fill-accent/10"
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
        )}
        {hovered ? (
          <div
            className="pointer-events-none absolute z-10 min-w-28 -translate-x-1/2 rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-card"
            style={{
              left: `${Math.min(88, Math.max(12, (hovered.x / VB_W) * 100))}%`,
              top: 12,
            }}
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
