"use client";

import { useState } from "react";
import { money } from "@/lib/format";

type Slice = { name: string; revenue: number };

const COLORS = [
  "var(--accent)",
  "color-mix(in srgb, var(--accent) 58%, #c4a484)",
  "color-mix(in srgb, var(--accent) 42%, #6f8f72)",
  "color-mix(in srgb, var(--accent) 24%, #d7c4b0)",
  "#a8a29e",
];

function compactCenter(value: number) {
  if (value >= 1_000_000) {
    const scaled = value / 1_000_000;
    const text = scaled >= 10 ? String(Math.round(scaled)) : scaled.toFixed(1).replace(".", ",");
    return `Rp ${text} jt`;
  }
  return money(value);
}

export function ReportDonut({ slices }: { slices: Slice[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const values = slices.map((slice, index) => ({
    name: slice.name,
    value: slice.revenue,
    color: COLORS[index % COLORS.length],
  }));
  const total = values.reduce((sum, slice) => sum + slice.value, 0);
  const focus = hover == null ? null : values[hover];
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const gap = values.length > 1 ? 5 : 0;
  let cursor = 0;
  const arcs = values.map((slice) => {
    const raw = total > 0 ? (slice.value / total) * circumference : 0;
    const length = Math.max(0, raw - gap);
    const arc = { ...slice, length, offset: cursor };
    cursor += raw;
    return arc;
  });

  return (
    <div className="flex h-full min-w-0 flex-col">
      <h2 className="font-semibold">Penjualan Berdasarkan Kategori</h2>
      {total <= 0 ? (
        <p className="py-16 text-center text-sm text-muted">Belum ada penjualan pada periode ini.</p>
      ) : (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-6 sm:flex-row">
          <svg viewBox="0 0 200 200" className="h-52 w-52 shrink-0" role="img" aria-label="Donat kategori">
            <g transform="rotate(-90 100 100)">
              {arcs.map((arc, index) => (
                <circle
                  key={arc.name}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={hover === index ? 22 : 16}
                  strokeDasharray={`${arc.length} ${circumference - arc.length}`}
                  strokeDashoffset={-arc.offset}
                  onMouseEnter={() => setHover(index)}
                  onMouseLeave={() => setHover(null)}
                />
              ))}
            </g>
            <text x="100" y="96" textAnchor="middle" className="fill-ink text-[15px] font-semibold">
              {compactCenter(focus ? focus.value : total)}
            </text>
            <text x="100" y="116" textAnchor="middle" className="fill-muted text-[11px]">
              {(focus ? focus.name : "Total").slice(0, 18)}
            </text>
          </svg>
          <ul className="w-full max-w-56 space-y-2.5">
            {arcs.map((arc, index) => (
              <li
                key={arc.name}
                className="flex items-center gap-2 text-sm"
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: arc.color }} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{arc.name}</span>
                <span className="shrink-0 text-muted">{Math.round((arc.value / total) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
