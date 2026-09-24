"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, List, MoreHorizontal, Plus, Search } from "lucide-react";
import { toggleCategoryStatus } from "@/app/actions/ops";
import { ProductImage } from "@/components/ProductImage";

const PILL = "h-11 shrink-0 rounded-full border border-line bg-white px-3 text-sm outline-none focus:border-accent";

export type CategoryRow = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  sortOrder: number;
  status: "active" | "inactive";
  productCount: number;
  number: number;
};

type Query = {
  q: string;
  status: string;
  sort: string;
  page: string;
  id: string;
  fresh: string;
};

function href(query: Query, patch: Partial<Query>) {
  const next = { ...query, ...patch };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.status) params.set("status", next.status);
  if (next.sort && next.sort !== "order") params.set("sort", next.sort);
  if (next.page && next.page !== "1") params.set("page", next.page);
  if (next.id) params.set("id", next.id);
  if (next.fresh) params.set("new", "1");
  const text = params.toString();
  return text ? `/categories?${text}` : "/categories";
}

function StatusToggle({ id, active }: { id: string; active: boolean }) {
  return (
    <form action={toggleCategoryStatus} onClick={(event) => event.stopPropagation()}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={active ? "inactive" : "active"} />
      <button
        type="submit"
        role="switch"
        aria-checked={active}
        aria-label={active ? "Nonaktifkan kategori" : "Aktifkan kategori"}
        className={`relative h-6 w-11 rounded-full transition ${active ? "bg-accent" : "bg-line"}`}
      >
        <span className={`absolute top-0.5 size-5 rounded-full bg-white ${active ? "left-5" : "left-0.5"}`} />
      </button>
    </form>
  );
}

export function CategoryCatalog({
  query,
  rows,
  total,
  page,
  pages,
  start,
  end,
}: {
  query: Query;
  rows: CategoryRow[];
  total: number;
  page: number;
  pages: number;
  start: number;
  end: number;
}) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "grid">("list");
  const [checked, setChecked] = useState<string[]>([]);
  const pageIds = rows.map((row) => row.id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => checked.includes(id));

  function open(id: string) {
    router.push(href(query, { id, fresh: "" }));
  }

  function toggleAll() {
    setChecked((current) => (allChecked ? current.filter((id) => !pageIds.includes(id)) : [...new Set([...current, ...pageIds])]));
  }

  function toggleOne(id: string) {
    setChecked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
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
          {query.fresh ? <input type="hidden" name="new" value="1" /> : null}
          <label className="relative min-w-40 flex-1 basis-48">
            <span className="sr-only">Cari kategori</span>
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden />
            <input
              name="q"
              defaultValue={query.q}
              placeholder="Cari kategori..."
              className="h-11 w-full rounded-full border border-line bg-white pr-3 pl-9 text-sm outline-none focus:border-accent"
            />
          </label>
          <select name="status" defaultValue={query.status} aria-label="Status" className={PILL}>
            <option value="">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
          <select name="sort" defaultValue={query.sort || "order"} aria-label="Urutan" className={PILL}>
            <option value="order">Urutan</option>
            <option value="name">Nama</option>
            <option value="count">Jumlah produk</option>
          </select>
          <button type="submit" className="sr-only">
            Terapkan
          </button>
        </form>
        <div className="inline-flex rounded-full border border-line bg-white p-1">
          <button
            type="button"
            aria-label="Tampilan kartu"
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
            className={`inline-flex size-9 items-center justify-center rounded-full ${view === "grid" ? "bg-accent text-white" : "text-muted"}`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            aria-label="Tampilan daftar"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
            className={`inline-flex size-9 items-center justify-center rounded-full ${view === "list" ? "bg-accent text-white" : "text-muted"}`}
          >
            <List size={16} />
          </button>
        </div>
        <Link href={href(query, { id: "", fresh: "1", page: "" })} className="btn inline-flex items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white">
          <Plus size={16} aria-hidden />
          Tambah Kategori
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Tidak ada kategori yang cocok.</p>
      ) : view === "list" ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="w-8 pb-2">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Pilih semua kategori di halaman ini" />
                </th>
                <th className="pb-2 font-medium">#</th>
                <th className="pb-2 font-medium">Gambar</th>
                <th className="pb-2 font-medium">Nama Kategori</th>
                <th className="pb-2 font-medium">Deskripsi</th>
                <th className="pb-2 font-medium">Jumlah Produk</th>
                <th className="pb-2 font-medium">Urutan</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const selected = query.id === row.id;
                return (
                  <tr
                    key={row.id}
                    onClick={() => open(row.id)}
                    className={`cursor-pointer border-t border-line transition-colors duration-ui ${selected ? "bg-accent-soft/50" : "hover:bg-accent-soft/40"}`}
                  >
                    <td className="py-2.5 pr-2" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={checked.includes(row.id)}
                        onChange={() => toggleOne(row.id)}
                        aria-label={`Pilih ${row.name}`}
                      />
                    </td>
                    <td className="py-2.5 pr-3 text-muted">{row.number}</td>
                    <td className="py-2.5 pr-3">
                      <ProductImage kind="categories" filename={row.image} name={row.name} className="size-10 rounded-xl object-cover text-xs" />
                    </td>
                    <td className="py-2.5 pr-3 font-medium">{row.name}</td>
                    <td className="max-w-56 truncate py-2.5 pr-3 text-muted">{row.description || "-"}</td>
                    <td className="py-2.5 pr-3">{row.productCount}</td>
                    <td className="py-2.5 pr-3">{row.sortOrder}</td>
                    <td className="py-2.5 pr-3">
                      <StatusToggle id={row.id} active={row.status === "active"} />
                    </td>
                    <td className="py-2.5" onClick={(event) => event.stopPropagation()}>
                      <details className="relative">
                        <summary className="flex size-8 cursor-pointer list-none items-center justify-center rounded-full hover:bg-chip [&::-webkit-details-marker]:hidden" aria-label={`Aksi ${row.name}`}>
                          <MoreHorizontal size={16} />
                        </summary>
                        <div className="menu-pop absolute right-0 z-20 mt-1 w-32 rounded-xl border border-line bg-white p-1 shadow-card">
                          <Link href={href(query, { id: row.id, fresh: "" })} className="block rounded-lg px-3 py-2 hover:bg-chip">
                            Ubah
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
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <div key={row.id} className={`relative rounded-2xl border p-3 ${query.id === row.id ? "border-accent bg-accent-soft/40" : "border-line"}`}>
              <button type="button" className="absolute inset-0 rounded-2xl" aria-label={`Buka ${row.name}`} onClick={() => open(row.id)} />
              <div className="pointer-events-none">
                <ProductImage kind="categories" filename={row.image} name={row.name} className="h-32 w-full rounded-xl object-cover" />
                <p className="mt-3 font-semibold">{row.name}</p>
                <p className="line-clamp-2 text-sm text-muted">{row.description || "Tanpa deskripsi"}</p>
                <p className="mt-2 text-sm">{row.productCount} produk</p>
              </div>
              <div className="relative z-10 mt-2 flex justify-end">
                <StatusToggle id={row.id} active={row.status === "active"} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <p>
          Menampilkan {start} - {end} dari {total} kategori
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
