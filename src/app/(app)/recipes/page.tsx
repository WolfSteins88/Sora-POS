import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { BookOpen, CircleCheck, Clock, Plus, ChefHat, Pencil, X } from "lucide-react";
import { duplicateRecipe } from "@/app/actions/ops";
import { ProductImage } from "@/components/ProductImage";
import { getDb } from "@/lib/db";
import { money } from "@/lib/format";
import { categories, inventoryItems, products, recipeItems, recipes } from "@/lib/schema";
import { RecipeCatalog } from "./RecipeCatalog";

const PAGE_SIZE = 8;

function amount(value: string | number | null | undefined) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function qtyText(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(value);
}

function share(count: number, total: number) {
  if (total <= 0) return "0% dari total";
  return `${Math.round((count / total) * 100)}% dari total`;
}

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; status?: string; page?: string; id?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      image: products.image,
      price: products.price,
      categoryId: categories.id,
      category: categories.name,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.kind, "recipe"), eq(products.catalogPack, "fnb")))
    .orderBy(products.name);
  const lines = await db
    .select({
      productId: recipes.productId,
      name: inventoryItems.name,
      unit: inventoryItems.unit,
      quantity: recipeItems.quantity,
      cost: inventoryItems.cost,
      stock: inventoryItems.currentStock,
      minimum: inventoryItems.minimumStock,
    })
    .from(recipeItems)
    .innerJoin(recipes, eq(recipes.id, recipeItems.recipeId))
    .innerJoin(inventoryItems, eq(inventoryItems.id, recipeItems.inventoryItemId));
  const byProduct = new Map<string, typeof lines>();
  for (const line of lines) {
    const list = byProduct.get(line.productId) ?? [];
    list.push(line);
    byProduct.set(line.productId, list);
  }
  const items = rows.map((row) => {
    const recipeLines = byProduct.get(row.id) ?? [];
    const priced = recipeLines.map((line) => {
      const quantity = amount(line.quantity);
      const cost = amount(line.cost);
      return {
        name: line.name,
        unit: line.unit,
        quantity,
        hpp: quantity * cost,
        low: amount(line.stock) <= amount(line.minimum),
      };
    });
    const hpp = priced.reduce((sum, line) => sum + line.hpp, 0);
    const price = amount(row.price);
    const margin = price > 0 ? Math.round(((price - hpp) / price) * 100) : 0;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      image: row.image,
      categoryId: row.categoryId,
      category: row.category,
      price,
      hpp,
      margin,
      review: priced.length === 0 || priced.some((line) => line.low),
      lines: priced,
    };
  });
  const totalCount = items.length;
  const activeCount = items.filter((row) => !row.review).length;
  const reviewCount = totalCount - activeCount;
  const categoryCounts = new Map<string, number>();
  for (const row of items) categoryCounts.set(row.category, (categoryCounts.get(row.category) ?? 0) + 1);
  const topCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "id"))[0];
  const categoriesForFilter = [...new Map(items.map((row) => [row.categoryId, row.category])).entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
  const q = params.q?.trim().toLowerCase() ?? "";
  const category = categoriesForFilter.some((item) => item.id === params.category) ? params.category! : "";
  const status = params.status === "active" || params.status === "review" ? params.status : "";
  const filtered = items.filter((row) => {
    if (q && !row.name.toLowerCase().includes(q) && !row.lines.some((line) => line.name.toLowerCase().includes(q))) return false;
    if (category && row.categoryId !== category) return false;
    if (status === "active" && row.review) return false;
    if (status === "review" && !row.review) return false;
    return true;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(params.page) || 1), pages);
  const startIndex = (page - 1) * PAGE_SIZE;
  const current = items.find((row) => row.id === params.id) ?? null;
  const query = { q: params.q?.trim() ?? "", category, status, page: String(page), id: current?.id ?? "" };
  const backParams = new URLSearchParams();
  if (query.q) backParams.set("q", query.q);
  if (query.category) backParams.set("category", query.category);
  if (query.status) backParams.set("status", query.status);
  if (query.page !== "1") backParams.set("page", query.page);
  const backHref = backParams.size ? `/recipes?${backParams.toString()}` : "/recipes";

  return (
    <div>
      <p className="text-sm text-muted">
        <Link href="/products" className="hover:text-ink">
          Produk
        </Link>
        <span className="px-1.5">/</span>
        Resep
      </p>
      <div className="mt-1 mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resep</h1>
          <p className="mt-1 text-sm text-muted">Kelola resep produk, tentukan komposisi bahan dan standar porsi.</p>
        </div>
        <Link href="/recipes/new" className="btn inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white">
          <Plus size={16} aria-hidden />
          Tambah Resep
        </Link>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={ChefHat} label="Total Resep" value={String(totalCount)} hint="menu racikan" tone="bg-chip text-ink" />
        <Kpi icon={CircleCheck} label="Resep Aktif" value={String(activeCount)} hint={share(activeCount, totalCount)} tone="bg-ok-soft text-ok" />
        <Kpi icon={Clock} label="Perlu Review" value={String(reviewCount)} hint="stok bahan rendah" tone="bg-warn-soft text-warn" />
        <Kpi
          icon={BookOpen}
          label="Kategori Terbanyak"
          value={topCategory?.[0] ?? "—"}
          hint={topCategory ? `${topCategory[1]} resep` : "belum ada"}
          tone="bg-accent-soft text-accent"
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <RecipeCatalog
          query={query}
          categories={categoriesForFilter}
          rows={filtered.slice(startIndex, startIndex + PAGE_SIZE).map((row, index) => ({
            id: row.id,
            name: row.name,
            image: row.image,
            category: row.category,
            hpp: row.hpp,
            ingredientCount: row.lines.length,
            review: row.review,
            number: startIndex + index + 1,
          }))}
          total={filtered.length}
          page={page}
          pages={pages}
          start={filtered.length === 0 ? 0 : startIndex + 1}
          end={Math.min(startIndex + PAGE_SIZE, filtered.length)}
        />
        <aside className="rounded-2xl border border-line bg-surface p-4 shadow-card">
          {current ? (
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold">Detail Resep</h2>
                <Link href={backHref} aria-label="Tutup detail" className="inline-flex size-8 items-center justify-center rounded-full hover:bg-chip">
                  <X size={16} />
                </Link>
              </div>
              <div className="mt-4 flex items-start gap-3">
                <ProductImage kind="products" filename={current.image} name={current.name} className="size-20 shrink-0 rounded-2xl object-cover" />
                <div className="min-w-0">
                  <p className="font-semibold">{current.name}</p>
                  <span className="mt-1 inline-flex rounded-full bg-chip px-2.5 py-1 text-xs font-semibold">{current.category}</span>
                  {current.description && current.description.trim().toLowerCase() !== current.name.trim().toLowerCase() ? (
                    <p className="mt-2 text-sm text-muted">{current.description}</p>
                  ) : null}
                </div>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <Row label="Kategori" value={current.category} />
                <Row label="Harga Jual" value={money(current.price)} />
                <Row label="HPP (per porsi)" value={money(current.hpp)} />
                <Row label="Margin" value={`${current.margin}%`} />
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Status</dt>
                  <dd>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${current.review ? "bg-warn-soft text-warn" : "bg-ok-soft text-ok"}`}>
                      {current.review ? "Perlu Review" : "Aktif"}
                    </span>
                  </dd>
                </div>
              </dl>
              <div className="mt-5 flex items-center justify-between gap-3">
                <h3 className="font-semibold">Daftar Bahan</h3>
                <Link href={`/recipes/${current.id}`} className="btn inline-flex items-center gap-1 rounded-full border border-line px-3 text-sm font-medium">
                  <Plus size={14} aria-hidden />
                  Tambah Bahan
                </Link>
              </div>
              {current.lines.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Belum ada bahan.</p>
              ) : (
                <table className="mt-3 w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="pb-2 font-medium">#</th>
                      <th className="pb-2 font-medium">Nama Bahan</th>
                      <th className="pb-2 font-medium">Jumlah</th>
                      <th className="pb-2 font-medium">Satuan</th>
                      <th className="pb-2 text-right font-medium">HPP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.lines.map((line, index) => (
                      <tr key={`${line.name}-${index}`} className="border-t border-line">
                        <td className="py-2 pr-2 text-muted">{index + 1}</td>
                        <td className="py-2 pr-2">{line.name}</td>
                        <td className="py-2 pr-2">{qtyText(line.quantity)}</td>
                        <td className="py-2 pr-2">{line.unit}</td>
                        <td className="py-2 text-right">{money(line.hpp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Link href={`/recipes/${current.id}`} className="btn inline-flex items-center justify-center gap-2 rounded-full border border-line text-sm font-medium">
                  <Pencil size={15} aria-hidden />
                  Edit Resep
                </Link>
                <form action={duplicateRecipe}>
                  <input type="hidden" name="id" value={current.id} />
                  <button type="submit" className="btn inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent text-sm font-semibold text-white">
                    Duplikasi Resep
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="font-semibold">Detail Resep</h2>
              <p className="mt-3 text-sm text-muted">Pilih resep untuk melihat komposisi bahan.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof ChefHat;
  label: string;
  value: string;
  hint: string;
  tone: string;
}) {
  return (
    <article className="h-full rounded-2xl border border-line bg-surface p-4 shadow-card">
      <span className={`inline-flex size-10 items-center justify-center rounded-xl ${tone}`}>
        <Icon size={18} aria-hidden />
      </span>
      <p className="mt-3 text-sm text-muted">{label}</p>
      <p className="truncate text-2xl font-semibold tracking-tight" title={value}>
        {value}
      </p>
      <p className="text-xs text-muted">{hint}</p>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
