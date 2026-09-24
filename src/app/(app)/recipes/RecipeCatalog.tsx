"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, List, MoreHorizontal, Search } from "lucide-react";
import { duplicateRecipe } from "@/app/actions/ops";
import { ProductImage } from "@/components/ProductImage";
import { money } from "@/lib/format";

const PILL = "h-11 shrink-0 rounded-full border border-line bg-white px-3 text-sm outline-none focus:border-accent";
const CHIPS = ["bg-accent-soft text-accent", "bg-chip text-ink", "bg-ok-soft text-ok", "bg-warn-soft text-warn"];

export type RecipeRow = {
  id: string;
  name: string;
  image: string | null;
  category: string;
  hpp: number;
  ingredientCount: number;
  review: boolean;
  number: number;
};

type Query = {
  q: string;
  category: string;
  status: string;
  page: string;
  id: string;
};

function href(query: Query, patch: Partial<Query>) {
  const next = { ...query, ...patch };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.category) params.set("category", next.category);
  if (next.status) params.set("status", next.status);
  if (next.page && next.page !== "1") params.set("page", next.page);
  if (next.id) params.set("id", next.id);
  const text = params.toString();
  return text ? `/recipes?${text}` : "/recipes";
}

function chipClass(name: string) {
  let total = 0;
  for (const char of name) total += char.charCodeAt(0);
  return CHIPS[total % CHIPS.length];
}

export function RecipeCatalog({
  query,
  rows,
  categories,
  total,
  page,
  pages,
  start,
  end,
}: {
  query: Query;
  rows: RecipeRow[];
  categories: { id: string; name: string }[];
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
    router.push(href(query, { id }));
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
          method="get"
          action="/recipes"
          className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
          onChange={(event) => {
            const target = event.target;
            if (target instanceof HTMLInputElement && target.name === "q") return;
            event.currentTarget.requestSubmit();
          }}
        >
          {query.id ? <input type="hidden" name="id" value={query.id} /> : null}
          <label className="relative min-w-40 flex-1 basis-52">
            <span className="sr-only">Cari resep</span>
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden />
            <input
              name="q"
              defaultValue={query.q}
              placeholder="Cari nama produk atau bahan..."
              className="h-11 w-full rounded-full border border-line bg-white pr-3 pl-9 text-sm outline-none focus:border-accent"
            />
          </label>
          <select name="category" defaultValue={query.category} aria-label="Kategori" className={PILL}>
            <option value="">Semua Kategori</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={query.status} aria-label="Status" className={PILL}>
            <option value="">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="review">Perlu Review</option>
          </select>
          <button type="submit" className="sr-only">
            Terapkan
          </button>
        </form>
        <div className="inline-flex rounded-full border border-line bg-white p-1">
          <button
            type="button"
            aria-label="Tampilan daftar"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
            className={`inline-flex size-9 items-center justify-center rounded-full ${view === "list" ? "bg-accent text-white" : "text-muted"}`}
          >
            <List size={16} />
          </button>
          <button
            type="button"
            aria-label="Tampilan kartu"
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
            className={`inline-flex size-9 items-center justify-center rounded-full ${view === "grid" ? "bg-accent text-white" : "text-muted"}`}
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Tidak ada resep yang cocok.</p>
      ) : view === "list" ? (
        <RecipeTable rows={rows} query={query} checked={checked} allChecked={allChecked} onOpen={open} onToggleAll={toggleAll} onToggleOne={toggleOne} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => {
            const selected = query.id === row.id;
            return (
              <article
                key={row.id}
                onClick={() => open(row.id)}
                className={`cursor-pointer rounded-2xl border p-3 ${selected ? "border-accent bg-accent-soft/40" : "border-line hover:bg-accent-soft/30"}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={checked.includes(row.id)}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() => toggleOne(row.id)}
                    aria-label={`Pilih ${row.name}`}
                  />
                  <ProductImage kind="products" filename={row.image} name={row.name} className="size-16 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{row.name}</p>
                    <span className={`mt-1 inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${chipClass(row.category)}`}>{row.category}</span>
                    <p className="mt-2 text-sm">{money(row.hpp)}</p>
                    <StatusPill review={row.review} />
                  </div>
                  <RowMenu id={row.id} name={row.name} />
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <p>
          Menampilkan {start} - {end} dari {total} resep
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

function RecipeTable({
  rows,
  query,
  checked,
  allChecked,
  onOpen,
  onToggleAll,
  onToggleOne,
}: {
  rows: RecipeRow[];
  query: Query;
  checked: string[];
  allChecked: boolean;
  onOpen: (id: string) => void;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[46rem] border-separate border-spacing-y-1.5 text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="w-8 px-3 pb-1 font-medium first:pl-4">
              <input type="checkbox" checked={allChecked} onChange={onToggleAll} aria-label="Pilih semua resep di halaman ini" />
            </th>
            <th className="px-3 pb-1 font-medium">#</th>
            <th className="px-3 pb-1 font-medium">Foto</th>
            <th className="px-3 pb-1 font-medium">Nama Produk</th>
            <th className="px-3 pb-1 font-medium">Kategori</th>
            <th className="px-3 pb-1 font-medium">Jumlah Bahan</th>
            <th className="px-3 pb-1 font-medium">HPP (per porsi)</th>
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
              <tr key={row.id} onClick={() => onOpen(row.id)} className="group cursor-pointer text-ink">
                <td className={cell} onClick={(event) => event.stopPropagation()}>
                  <input type="checkbox" checked={checked.includes(row.id)} onChange={() => onToggleOne(row.id)} aria-label={`Pilih ${row.name}`} />
                </td>
                <td className={`${cell} text-muted`}>{row.number}</td>
                <td className={cell}>
                  <ProductImage kind="products" filename={row.image} name={row.name} className="size-10 shrink-0 rounded-xl bg-white object-cover ring-1 ring-white" />
                </td>
                <td className={cell}>
                  <span className="whitespace-nowrap font-medium">{row.name}</span>
                </td>
                <td className={cell}>
                  <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${chipClass(row.category)}`}>{row.category}</span>
                </td>
                <td className={`${cell} whitespace-nowrap`}>{row.ingredientCount}</td>
                <td className={`${cell} whitespace-nowrap`}>{money(row.hpp)}</td>
                <td className={cell}>
                  <StatusPill review={row.review} />
                </td>
                <td className={cell} onClick={(event) => event.stopPropagation()}>
                  <RowMenu id={row.id} name={row.name} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ review }: { review: boolean }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${review ? "bg-warn-soft text-warn" : "bg-ok-soft text-ok"}`}>
      {review ? "Perlu Review" : "Aktif"}
    </span>
  );
}

function RowMenu({ id, name }: { id: string; name: string }) {
  return (
    <details className="relative">
      <summary className="flex size-8 cursor-pointer list-none items-center justify-center rounded-full bg-white hover:bg-chip [&::-webkit-details-marker]:hidden" aria-label={`Aksi ${name}`}>
        <MoreHorizontal size={16} />
      </summary>
      <div className="menu-pop absolute right-0 z-20 mt-1 w-40 rounded-xl border border-line bg-white p-1 shadow-card">
        <Link href={`/recipes/${id}`} className="block rounded-lg px-3 py-2 hover:bg-chip">
          Edit resep
        </Link>
        <form action={duplicateRecipe}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="w-full rounded-lg px-3 py-2 text-left hover:bg-chip">
            Duplikasi
          </button>
        </form>
      </div>
    </details>
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
