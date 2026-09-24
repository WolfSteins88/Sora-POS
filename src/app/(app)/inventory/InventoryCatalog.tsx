"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, MoreHorizontal, Search } from "lucide-react";

const PILL = "h-11 shrink-0 rounded-full border border-line bg-white px-3 text-sm outline-none focus:border-accent";

export type InventoryRow = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  stock: number;
  minimum: number;
  level: "safe" | "low" | "out";
  number: number;
};

type Query = {
  q: string;
  level: string;
  page: string;
  id: string;
  edit: string;
  adjust: string;
  fresh: string;
};

const LEVEL_LABEL = { safe: "Aman", low: "Menipis", out: "Habis" } as const;
const LEVEL_CLASS = {
  safe: "bg-ok-soft text-ok",
  low: "bg-warn-soft text-warn",
  out: "bg-danger/10 text-danger",
} as const;

function href(query: Query, patch: Partial<Query>) {
  const next = { ...query, ...patch };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.level) params.set("level", next.level);
  if (next.page && next.page !== "1") params.set("page", next.page);
  if (next.id) params.set("id", next.id);
  if (next.edit) params.set("edit", next.edit);
  if (next.adjust) params.set("adjust", next.adjust);
  if (next.fresh) params.set("new", "1");
  const text = params.toString();
  return text ? `/inventory?${text}` : "/inventory";
}

export function InventoryCatalog({
  query,
  rows,
  total,
  page,
  pages,
  start,
  end,
}: {
  query: Query;
  rows: InventoryRow[];
  total: number;
  page: number;
  pages: number;
  start: number;
  end: number;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState<string[]>([]);
  const pageIds = rows.map((row) => row.id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => checked.includes(id));
  const exportParams = new URLSearchParams();
  if (query.q) exportParams.set("q", query.q);
  if (query.level) exportParams.set("level", query.level);

  function open(id: string) {
    router.push(href(query, { id, edit: "", adjust: "", fresh: "" }));
  }

  return (
    <section className="min-w-0 rounded-2xl border border-line bg-surface p-4 shadow-card">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form
          className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
          onChange={(event) => {
            const target = event.target;
            if (target instanceof HTMLInputElement && target.name === "q") return;
            event.currentTarget.requestSubmit();
          }}
        >
          {query.id ? <input type="hidden" name="id" value={query.id} /> : null}
          {query.edit ? <input type="hidden" name="edit" value={query.edit} /> : null}
          {query.adjust ? <input type="hidden" name="adjust" value={query.adjust} /> : null}
          {query.fresh ? <input type="hidden" name="new" value="1" /> : null}
          <label className="relative min-w-40 flex-1 basis-48">
            <span className="sr-only">Cari bahan</span>
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden />
            <input
              name="q"
              defaultValue={query.q}
              placeholder="Cari nama bahan..."
              className="h-11 w-full rounded-full border border-line bg-white pr-3 pl-9 text-sm outline-none focus:border-accent"
            />
          </label>
          <select name="level" defaultValue={query.level} aria-label="Status stok" className={PILL}>
            <option value="">Semua Status</option>
            <option value="safe">Aman</option>
            <option value="low">Menipis</option>
            <option value="out">Habis</option>
          </select>
          <button type="submit" className="sr-only">
            Terapkan
          </button>
        </form>
        <a
          href={`/api/inventory/export?${exportParams.toString()}`}
          className="btn inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-medium"
        >
          <Download size={15} aria-hidden />
          Ekspor
        </a>
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Tidak ada bahan yang cocok.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] border-separate border-spacing-y-1.5 text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="w-8 px-3 pb-1 font-medium first:pl-4">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={() =>
                      setChecked((current) =>
                        allChecked ? current.filter((id) => !pageIds.includes(id)) : [...new Set([...current, ...pageIds])],
                      )
                    }
                    aria-label="Pilih semua bahan di halaman ini"
                  />
                </th>
                <th className="px-3 pb-1 font-medium">#</th>
                <th className="px-3 pb-1 font-medium">Nama Bahan</th>
                <th className="px-3 pb-1 font-medium">Satuan</th>
                <th className="px-3 pb-1 font-medium">Stok Saat Ini</th>
                <th className="px-3 pb-1 font-medium">Stok Minimum</th>
                <th className="px-3 pb-1 font-medium">Status</th>
                <th className="px-3 pb-1 font-medium last:pr-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const selected = query.id === row.id;
                const tone = selected ? "bg-accent-soft/50" : "group-hover:bg-accent-soft/40";
                const cell = `px-3 py-2.5 align-middle transition-colors duration-ui first:rounded-l-2xl first:pl-4 last:rounded-r-2xl last:pr-4 ${tone}`;
                return (
                  <tr key={row.id} onClick={() => open(row.id)} className="group cursor-pointer text-ink">
                    <td className={cell} onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={checked.includes(row.id)}
                        onChange={() =>
                          setChecked((current) => (current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id]))
                        }
                        aria-label={`Pilih ${row.name}`}
                      />
                    </td>
                    <td className={`${cell} text-muted`}>{row.number}</td>
                    <td className={cell}>
                      <span className="inline-flex items-center gap-2 font-medium">
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-accent ring-1 ring-line">
                          {row.name.trim().slice(0, 1).toUpperCase() || "?"}
                        </span>
                        <span className="whitespace-nowrap">{row.name}</span>
                      </span>
                    </td>
                    <td className={`${cell} whitespace-nowrap`}>{row.unit}</td>
                    <td className={`${cell} whitespace-nowrap`}>{stockText(row.stock)}</td>
                    <td className={`${cell} whitespace-nowrap`}>{stockText(row.minimum)}</td>
                    <td className={cell}>
                      <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${LEVEL_CLASS[row.level]}`}>{LEVEL_LABEL[row.level]}</span>
                    </td>
                    <td className={cell} onClick={(event) => event.stopPropagation()}>
                      <details className="relative">
                        <summary className="flex size-8 cursor-pointer list-none items-center justify-center rounded-full hover:bg-chip [&::-webkit-details-marker]:hidden" aria-label={`Aksi ${row.name}`}>
                          <MoreHorizontal size={16} />
                        </summary>
                        <div className="menu-pop absolute right-0 z-20 mt-1 w-40 rounded-xl border border-line bg-white p-1 shadow-card">
                          <Link href={href(query, { id: row.id, edit: row.id, adjust: "", fresh: "" })} className="block rounded-lg px-3 py-2 hover:bg-chip">
                            Ubah
                          </Link>
                          <Link href={href(query, { id: row.id, edit: "", adjust: row.id, fresh: "" })} className="block rounded-lg px-3 py-2 hover:bg-chip">
                            Sesuaikan stok
                          </Link>
                        </div>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <p>
          Menampilkan {start} - {end} dari {total} bahan
        </p>
        <div className="flex items-center gap-1">
          <PageLink query={query} page={page - 1} disabled={page <= 1} label="Sebelumnya" />
          {Array.from({ length: pages }, (_, index) => index + 1)
            .filter((item) => pages <= 7 || Math.abs(item - page) <= 2 || item === 1 || item === pages)
            .map((item, index, list) => {
              const prev = list[index - 1];
              return (
                <span key={item} className="inline-flex items-center">
                  {prev && item - prev > 1 ? <span className="px-1">…</span> : null}
                  <PageLink query={query} page={item} current={item === page} label={String(item)} />
                </span>
              );
            })}
          <PageLink query={query} page={page + 1} disabled={page >= pages} label="Berikutnya" />
        </div>
      </div>
    </section>
  );
}

function stockText(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(value);
}

function PageLink({
  query,
  page,
  current,
  disabled,
  label,
}: {
  query: Query;
  page: number;
  current?: boolean;
  disabled?: boolean;
  label: string;
}) {
  const className = `inline-flex h-9 min-w-9 items-center justify-center rounded-full px-2 ${
    current ? "bg-accent text-white" : "hover:bg-chip"
  } ${disabled ? "pointer-events-none opacity-40" : ""}`;
  if (disabled) return <span className={className}>{label}</span>;
  return (
    <Link href={href(query, { page: page > 1 ? String(page) : "1" })} className={className} aria-current={current ? "page" : undefined}>
      {label}
    </Link>
  );
}
