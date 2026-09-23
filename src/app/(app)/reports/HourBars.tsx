"use client";

import { useState } from "react";
import { money } from "@/lib/format";

type Hour = { hour: number; sales: number; trx: number };

function compactAxis(value: number) {
  if (value >= 1_000_000) {
    const scaled = value / 1_000_000;
    const text = scaled >= 10 ? String(Math.round(scaled)) : scaled.toFixed(1).replace(".", ",");
    return `${text} jt`;
  }
  if (value >= 1_000) return `${Math.round(value / 1000)} rb`;
  return String(Math.round(value));
}

function pad(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function HourBars({ hours }: { hours: Hour[] }) {
  const [metric, setMetric] = useState<"sales" | "trx">("sales");
  const [hover, setHover] = useState<number | null>(null);
  const plotted = hours.filter((hour) => (metric === "sales" ? hour.sales : hour.trx) > 0);
  const values = plotted.map((hour) => (metric === "sales" ? hour.sales : hour.trx));
  const max = Math.max(1, ...values);
  const width = 640;
  const height = 220;
  const padL = 46;
  const padR = 8;
  const padT = 28;
  const padB = 28;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const slot = innerW / Math.max(1, plotted.length);
  const barW = Math.min(36, Math.max(8, slot * 0.62));
  const ticks = [0, 0.5, 1];

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold">Penjualan Per Jam</h2>
        <label>
          <span className="sr-only">Metrik grafik</span>
          <select
            value={metric}
            onChange={(event) => {
              setMetric(event.target.value as "sales" | "trx");
              setHover(null);
            }}
            className="h-10 rounded-full border border-line bg-white px-3 text-sm outline-none focus:border-accent"
          >
            <option value="sales">Penjualan</option>
            <option value="trx">Jumlah Transaksi</option>
          </select>
        </label>
      </div>
      {values.every((value) => value <= 0) ? (
        <p className="py-16 text-center text-sm text-muted">Belum ada penjualan pada periode ini.</p>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="min-h-56 w-full flex-1" role="img" aria-label="Penjualan per jam">
          {ticks.map((tick) => {
            const y = padT + innerH - tick * innerH;
            const label = metric === "sales" ? compactAxis(max * tick) : String(Math.round(max * tick));
            return (
              <g key={tick}>
                <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="var(--line)" strokeWidth="1" />
                <text x={padL - 8} y={y + 4} textAnchor="end" className="fill-muted text-[10px]">
                  {label}
                </text>
              </g>
            );
          })}
          {plotted.map((hour, index) => {
            const value = values[index] ?? 0;
            const h = (value / max) * innerH;
            const x = padL + index * slot + (slot - barW) / 2;
            const y = padT + innerH - h;
            const active = hover === index;
            return (
              <g key={hour.hour} onMouseEnter={() => setHover(index)} onMouseLeave={() => setHover(null)}>
                {active && value > 0 ? (
                  <text x={x + barW / 2} y={Math.max(12, y - 8)} textAnchor="middle" className="fill-ink text-[10px] font-semibold">
                    {pad(hour.hour)} · {metric === "sales" ? money(value) : String(value)}
                  </text>
                ) : null}
                <rect x={x} y={y} width={barW} height={Math.max(value > 0 ? 3 : 0, h)} rx="4" fill={active ? "var(--accent)" : "color-mix(in srgb, var(--accent) 72%, #c4a484)"} />
                <text x={x + barW / 2} y={height - 8} textAnchor="middle" className="fill-muted text-[9px]">
                  {plotted.length > 16 && index % 2 === 1 ? "" : pad(hour.hour)}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
