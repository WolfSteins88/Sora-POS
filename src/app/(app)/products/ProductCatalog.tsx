"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, List, MoreHorizontal, Search } from "lucide-react";
import { useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import { toggleProductStatus } from "@/app/actions/ops";
import { money, num } from "@/lib/format";
import { productHref, type ProductQuery } from "./productQuery";

const PILL = "h-11 shrink-0 rounded-full border border-line bg-white px-3 text-sm outline-none focus:border-accent";
const CHIPS = ["bg-accent-soft text-accent", "bg-chip text-ink", "bg-ok-soft text-ok", "bg-warn-soft text-warn"];

export type CatalogRow = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  categoryName: string;
  price: string;
  kind: "goods" | "recipe";
  status: "active" | "inactive";
  stockStatus: "available" | "sold_out";
  currentStock: string;
  minimumStock: string;
};

function chipClass(name: string) {
  let total = 0;
  for (const char of name) total += char.charCodeAt(0);
  return CHIPS[total % CHIPS.length];
}

function stockAmount(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function stockText(value: string) {
  const amount = stockAmount(value);
  if (Number.isInteger(amount)) return String(amount);
  return String(Math.round(amount * 1000) / 1000).replace(".", ",");
}

function stockView(row: CatalogRow) {
  if (row.kind === "recipe") {
    const out = row.stockStatus === "sold_out";
    return { label: out ? "habis" : "tersedia", tone: out ? "bg-danger" : "bg-ok" };
  }
  const stock = stockAmount(row.currentStock);
  const minimum = stockAmount(row.minimumStock);
  if (row.stockStatus === "sold_out" || stock <= 0) return { label: stockText(row.currentStock), tone: "bg-danger" };
  if (stock <= minimum) return { label: stockText(row.currentStock), tone: "bg-warn" };
  return { label: stockText(row.currentStock), tone: "bg-ok" };
}

function StatusToggle({ id, active }: { id: string; active: boolean }) {
  return (
    <form action={toggleProductStatus} onClick={(event) => event.stopPropagation()}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={active ? "inactive" : "active"} />
      <button
        type="submit"
        role="switch"
        aria-checked={active}
        aria-label={active ? "Nonaktifkan produk" : "Aktifkan produk"}
        className={`relative h-6 w-11 rounded-full transition ${active ? "bg-accent" : "bg-line"}`}
      >
        <span className={`absolute top-0.5 size-5 rounded-full bg-white ${active ? "left-5" : "left-0.5"}`} />
      </button>
    </form>
  );
}

export function ProductCatalog({
  query,
  rows,
  categories,
  page,
  pages,
  total,
  currency,
  emptyLabel,
}: {
  query: ProductQuery;
  rows: CatalogRow[];
  categories: { id: string; name: string }[];
  page: number;
  pages: number;
  total: number;
  currency: string;
  emptyLabel: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "grid">("list");
  const start = total === 0 ? 0 : (page - 1) * 8 + 1;
  const end = Math.min(page * 8, total);
  const open = (id: string) => router.push(productHref(query, { id, page: page > 1 ? String(page) : "" }));

  return (
    <section className="min-w-0 rounded-2xl border border-line bg-surface p-4 shadow-card">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form
          className="contents"
          onChange={(event) => {
            const target = event.target;
            if (target instanceof HTMLInputElement && target.name === "q") return;
            event.currentTarget.requestSubmit();
          }}
        >
          <input type="hidden" name="pack" value={query.pack || ""} />
          {query.edit ? <input type="hidden" name="edit" value={query.edit} /> : null}
          <label className="relative min-w-48 flex-1 basis-56">
            <span className="sr-only">Cari nama produk</span>
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden />
            <input
              name="q"
              defaultValue={query.q}
              placeholder="Cari nama produk..."
              className="h-11 w-full rounded-full border border-line bg-white pr-3 pl-9 text-sm outline-none focus:border-accent"
            />
          </label>
          <select name="category" defaultValue={query.category || ""} aria-label="Kategori" className={PILL}>
            <option value="">Semua Kategori</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={query.status || ""} aria-label="Status" className={PILL}>
            <option value="">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
          <select name="sort" defaultValue={query.sort === "name" ? "name" : "new"} aria-label="Urutkan" className={PILL}>
            <option value="new">Urutkan: Terbaru</option>
            <option value="name">Urutkan: Nama</option>
          </select>
          <button type="submit" className="sr-only">
            Terapkan
          </button>
        </form>
        <div className="ml-auto inline-flex rounded-full border border-line p-1">
          <button
            type="button"
            aria-label="Tampilan daftar"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
            className={`rounded-full p-2 ${view === "list" ? "bg-accent text-white" : "text-muted"}`}
          >
            <List size={16} />
          </button>
          <button
            type="button"
            aria-label="Tampilan kartu"
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
            className={`rounded-full p-2 ${view === "grid" ? "bg-accent text-white" : "text-muted"}`}
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">{emptyLabel}</p>
      ) : view === "list" ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="pb-2 font-medium">Produk</th>
                <th className="pb-2 font-medium">Kategori</th>
                <th className="pb-2 font-medium">Harga</th>
                <th className="pb-2 font-medium">Stok</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const stock = stockView(row);
                const selected = query.id === row.id;
                return (
                  <tr
                    key={row.id}
                    onClick={() => open(row.id)}
                    className={`cursor-pointer border-t border-line ${selected ? "bg-chip" : "hover:bg-chip/60"}`}
                  >
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <ProductImage kind="products" filename={row.image} name={row.name} className="h-12 w-12 rounded-xl object-cover" />
                        <div>
                          <p className="font-semibold">{row.name}</p>
                          {row.description && row.description.trim().toLowerCase() !== row.name.trim().toLowerCase() ? (
                            <p className="line-clamp-1 text-xs text-muted">{row.description}</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${chipClass(row.categoryName)}`}>{row.categoryName}</span>
                    </td>
                    <td className="py-3 pr-3">{money(num(row.price), currency)}</td>
                    <td className="py-3 pr-3">
                      <span className="inline-flex items-center gap-2">
                        <span className={`size-2 rounded-full ${stock.tone}`} aria-hidden />
                        {stock.label}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <StatusToggle id={row.id} active={row.status === "active"} />
                    </td>
                    <td className="py-3">
                      <details className="relative" onClick={(event) => event.stopPropagation()}>
                        <summary className="flex size-9 cursor-pointer list-none items-center justify-center rounded-full hover:bg-white [&::-webkit-details-marker]:hidden" aria-label="Aksi produk">
                          <MoreHorizontal size={16} />
                        </summary>
                        <div className="menu-pop absolute right-0 z-20 mt-1 w-40 rounded-xl border border-line bg-white p-1 shadow-card">
                          <Link href={productHref(query, { edit: row.id, id: row.id })} className="block rounded-lg px-3 py-2 hover:bg-chip">
                            Edit produk
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
          {rows.map((row) => {
            const stock = stockView(row);
            return (
              <div
                key={row.id}
                className={`relative rounded-2xl border p-3 text-left ${query.id === row.id ? "border-accent bg-chip" : "border-line"}`}
              >
                <button type="button" className="absolute inset-0 rounded-2xl" aria-label={`Buka ${row.name}`} onClick={() => open(row.id)} />
                <div className="pointer-events-none">
                  <ProductImage kind="products" filename={row.image} name={row.name} className="h-36 w-full rounded-xl object-cover" />
                  <p className="mt-3 font-semibold">{row.name}</p>
                  <p className="text-sm text-muted">{money(num(row.price), currency)}</p>
                  <p className="mt-2 inline-flex items-center gap-2 text-sm">
                    <span className={`size-2 rounded-full ${stock.tone}`} aria-hidden />
                    {stock.label}
                  </p>
                </div>
                <div className="relative z-10 mt-2 flex justify-end">
                  <StatusToggle id={row.id} active={row.status === "active"} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <p>
          Menampilkan {start} - {end} dari {total} produk
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
  query: ProductQuery;
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
    <Link href={productHref(query, { page: page > 1 ? String(page) : "" })} className={className} aria-current={current ? "page" : undefined}>
      {label}
    </Link>
  );
}
