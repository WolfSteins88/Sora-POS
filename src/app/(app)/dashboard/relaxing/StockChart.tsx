"use client";

import Link from "next/link";
import { formatIdDecimal } from "@/lib/format";

export type StockAlert = {
  id: string;
  name: string;
  href: string;
  stock: string;
  minimum: string;
  unit: string;
};

export function StockChart({ alerts }: { alerts: StockAlert[] }) {
  if (alerts.length === 0) {
    return <p className="text-sm text-muted">Semua stok di atas minimum.</p>;
  }

  const rows = alerts.map((row) => ({
    ...row,
    value: Math.max(0, Number(row.stock) || 0),
    floor: Math.max(0, Number(row.minimum) || 0),
  }));
  const peak = Math.max(...rows.map((row) => Math.max(row.value, row.floor, 1)));

  return (
    <div className="flex h-full min-h-0 flex-col justify-center gap-2.5 overflow-y-auto pr-1">
      <ul className="space-y-2.5">
        {rows.map((row) => {
          const width = Math.max(4, (row.value / peak) * 100);
          const critical = row.value <= row.floor;
          return (
            <li key={row.id}>
              <Link href={row.href} className="block min-w-0 rounded-xl px-1 py-1 hover:bg-chip focus-visible:bg-chip">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{row.name}</span>
                  <span className={`shrink-0 text-xs font-medium ${critical ? "text-danger" : "text-muted"}`}>
                    Sisa {formatIdDecimal(row.value)} {row.unit}
                  </span>
                </div>
                <svg viewBox="0 0 100 8" className="h-2.5 w-full" preserveAspectRatio="none" aria-hidden>
                  <rect x="0" y="0" width="100" height="8" rx="4" className="fill-chip" />
                  <rect
                    x="0"
                    y="0"
                    width={width}
                    height="8"
                    rx="4"
                    className={critical ? "fill-danger" : "fill-accent"}
                  />
                </svg>
                <p className="mt-1 text-[11px] text-muted">Min {formatIdDecimal(row.floor)} {row.unit}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
