"use client";

import { useState } from "react";
import { money } from "@/lib/format";

type Slice = { name: string; today: number; week: number; month: number };
type RangeKey = "today" | "week" | "month";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Hari ini" },
  { key: "week", label: "7 hari" },
  { key: "month", label: "30 hari" },
];

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

export function CategoryDonut({ slices }: { slices: Slice[] }) {
  const [range, setRange] = useState<RangeKey>("today");
  const [hover, setHover] = useState<number | null>(null);
  const [locked, setLocked] = useState<number | null>(null);
  const values = slices
    .map((slice, index) => ({
      name: slice.name,
      value: slice[range],
      color: COLORS[index % COLORS.length],
    }))
    .filter((slice) => slice.value > 0);
  const total = values.reduce((sum, slice) => sum + slice.value, 0);
  const active = hover ?? locked;
  const focus = active == null ? null : values[active];
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
  const rangeLabel = RANGES.find((item) => item.key === range)?.label ?? "Hari ini";

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-semibold">Penjualan per kategori</h2>
        <label>
          <span className="sr-only">Rentang kategori</span>
          <select
            value={range}
            onChange={(event) => {
              setRange(event.target.value as RangeKey);
              setHover(null);
              setLocked(null);
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
      {total <= 0 ? (
        <p className="py-10 text-center text-sm text-muted">Belum ada penjualan pada {rangeLabel.toLowerCase()}.</p>
      ) : (
        <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row">
          <svg viewBox="0 0 200 200" className="h-44 w-44 shrink-0" role="img" aria-label={`Donat kategori ${rangeLabel}`}>
            <g transform="rotate(-90 100 100)">
              {arcs.map((arc, index) => (
                <circle
                  key={arc.name}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={active === index ? 22 : 16}
                  strokeLinecap="butt"
                  strokeDasharray={`${arc.length} ${circumference - arc.length}`}
                  strokeDashoffset={-arc.offset}
                  tabIndex={0}
                  role="button"
                  aria-label={`${arc.name}, ${money(arc.value)}, ${Math.round((arc.value / total) * 100)} persen`}
                  aria-pressed={locked === index}
                  className="cursor-pointer outline-none motion-safe:transition-[stroke-width] motion-safe:duration-150"
                  style={{ pointerEvents: "stroke" }}
                  onMouseEnter={() => setHover(index)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(index)}
                  onBlur={() => setHover(null)}
                  onClick={() => setLocked((current) => (current === index ? null : index))}
                />
              ))}
            </g>
            <text x="100" y="96" textAnchor="middle" className="fill-ink text-[15px] font-semibold">
              {compactCenter(focus ? focus.value : total)}
            </text>
            <text x="100" y="116" textAnchor="middle" className="fill-muted text-[11px]">
              {(focus ? focus.name : "Total omset").slice(0, 18)}
            </text>
          </svg>
          <ul className="w-full min-w-0 space-y-1">
            {arcs.map((arc, index) => {
              const pct = Math.round((arc.value / total) * 100);
              return (
                <li key={arc.name}>
                  <button
                    type="button"
                    aria-pressed={locked === index}
                    className="flex min-h-11 w-full items-center gap-2 rounded-xl px-2 text-left text-sm hover:bg-chip focus-visible:bg-chip"
                    onMouseEnter={() => setHover(index)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(index)}
                    onBlur={() => setHover(null)}
                    onClick={() => setLocked((current) => (current === index ? null : index))}
                  >
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: arc.color }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{arc.name}</span>
                    <span className="shrink-0 text-muted">{pct}%</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
