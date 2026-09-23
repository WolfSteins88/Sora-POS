"use client";

import { Search } from "lucide-react";

const PILL = "h-11 shrink-0 rounded-full border border-line bg-white px-3 text-sm outline-none focus:border-accent";

export function ShiftFilters({
  q,
  date,
  cashier,
  status,
  id,
  edit,
  cashiers,
}: {
  q?: string;
  date?: string;
  cashier?: string;
  status?: string;
  id?: string;
  edit?: string;
  cashiers: { id: string; name: string }[];
}) {
  return (
    <form
      className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
      onChange={(event) => {
        const target = event.target;
        if (target instanceof HTMLInputElement && target.name === "q") return;
        event.currentTarget.requestSubmit();
      }}
    >
      {status ? <input type="hidden" name="status" value={status} /> : null}
      {id ? <input type="hidden" name="id" value={id} /> : null}
      {edit ? <input type="hidden" name="edit" value={edit} /> : null}
      <input name="date" type="date" defaultValue={date} aria-label="Tanggal shift" className={PILL} />
      <select name="cashier" defaultValue={cashier || ""} aria-label="Kasir" className={`${PILL} max-w-48`}>
        <option value="">Semua Kasir</option>
        {cashiers.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <label className="relative min-w-40 flex-1 basis-40">
        <span className="sr-only">Cari shift</span>
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden />
        <input
          name="q"
          defaultValue={q}
          placeholder="Cari kasir atau nomor shift..."
          className="h-11 w-full rounded-full border border-line bg-white pr-3 pl-9 text-sm outline-none focus:border-accent"
        />
      </label>
      <button type="submit" className="sr-only">
        Terapkan
      </button>
    </form>
  );
}
