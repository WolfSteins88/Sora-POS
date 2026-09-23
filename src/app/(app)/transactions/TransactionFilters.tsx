"use client";

import { Calendar, Search } from "lucide-react";

const PILL = "h-11 shrink-0 rounded-full border border-line bg-white text-sm outline-none focus:border-accent";

export function TransactionFilters({
  q,
  from,
  to,
  method,
  status,
  cashier,
  payments,
  cashiers,
}: {
  q?: string;
  from?: string;
  to?: string;
  method?: string;
  status?: string;
  cashier?: string;
  payments: { value: string; label: string }[];
  cashiers: { id: string; name: string }[];
}) {
  return (
    <form
      className="mb-4 flex flex-wrap items-center gap-2"
      onChange={(event) => {
        const target = event.target;
        if (target instanceof HTMLInputElement && target.name === "q") return;
        event.currentTarget.requestSubmit();
      }}
    >
      <label className="relative min-w-48 flex-1 basis-56">
        <span className="sr-only">Cari transaksi</span>
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden />
        <input
          name="q"
          defaultValue={q}
          placeholder="Cari nomor, produk, atau kasir..."
          className="h-11 w-full rounded-full border border-line bg-white pr-3 pl-9 text-sm outline-none focus:border-accent"
        />
      </label>
      <div className={`${PILL} inline-flex items-center gap-2 px-3`}>
        <Calendar size={16} className="shrink-0 text-muted" aria-hidden />
        <input name="from" type="date" defaultValue={from} aria-label="Dari tanggal" className="w-[9.25rem] bg-transparent outline-none" />
        <span className="text-muted" aria-hidden>
          –
        </span>
        <input name="to" type="date" defaultValue={to} aria-label="Sampai tanggal" className="w-[9.25rem] bg-transparent outline-none" />
      </div>
      <select name="method" defaultValue={method || ""} aria-label="Metode bayar" className={`${PILL} px-3`}>
        <option value="">Semua pembayaran</option>
        {payments.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <select name="status" defaultValue={status || ""} aria-label="Status" className={`${PILL} px-3`}>
        <option value="">Semua status</option>
        <option value="completed">Selesai</option>
        <option value="cancelled">Refund</option>
      </select>
      <select name="cashier" defaultValue={cashier || ""} aria-label="Kasir" className={`${PILL} max-w-48 px-3`}>
        <option value="">Semua kasir</option>
        {cashiers.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <button type="submit" className="sr-only">
        Terapkan
      </button>
    </form>
  );
}
