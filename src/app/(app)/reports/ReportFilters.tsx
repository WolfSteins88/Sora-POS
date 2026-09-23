"use client";

import Link from "next/link";
import { Calendar, RotateCcw } from "lucide-react";

const PILL = "h-11 shrink-0 rounded-full border border-line bg-white text-sm outline-none focus:border-accent";

const METHODS = [
  { value: "cash", label: "Tunai" },
  { value: "qris", label: "QRIS" },
  { value: "debit", label: "Debit" },
  { value: "credit", label: "Kredit" },
  { value: "ewallet", label: "E-wallet" },
];

export function ReportFilters({
  tab,
  from,
  to,
  cashier,
  method,
  cashiers,
}: {
  tab: string;
  from: string;
  to: string;
  cashier: string;
  method: string;
  cashiers: { id: string; name: string }[];
}) {
  const reset = tab && tab !== "ringkasan" ? `/reports?tab=${tab}` : "/reports";
  return (
    <form className="flex flex-wrap items-center gap-2">
      {tab && tab !== "ringkasan" ? <input type="hidden" name="tab" value={tab} /> : null}
      <div className={`${PILL} inline-flex items-center gap-2 px-3`}>
        <Calendar size={16} className="shrink-0 text-muted" aria-hidden />
        <input name="from" type="date" defaultValue={from} aria-label="Dari tanggal" className="w-[9.25rem] bg-transparent outline-none" />
        <span className="text-muted" aria-hidden>
          –
        </span>
        <input name="to" type="date" defaultValue={to} aria-label="Sampai tanggal" className="w-[9.25rem] bg-transparent outline-none" />
      </div>
      <select name="cashier" defaultValue={cashier} aria-label="Kasir" className={`${PILL} max-w-48 px-3`}>
        <option value="">Semua Kasir</option>
        {cashiers.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <select name="method" defaultValue={method} aria-label="Pembayaran" className={`${PILL} px-3`}>
        <option value="">Semua Pembayaran</option>
        {METHODS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <button type="submit" className="btn inline-flex items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white">
        Terapkan Filter
      </button>
      <Link href={reset} className="btn inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-medium">
        <RotateCcw size={15} aria-hidden />
        Reset
      </Link>
    </form>
  );
}
