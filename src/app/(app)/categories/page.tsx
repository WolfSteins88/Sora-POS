import { getSql } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { catalogPackFromQuery } from "@/lib/theme";
import { listCategories } from "@/server/queries";
import { CategoryCatalog } from "./CategoryCatalog";
import { CategoryForm } from "./CategoryForm";

const PAGE_SIZE = 8;

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string; page?: string; id?: string; new?: string; pack?: string }>;
}) {
  const params = await searchParams;
  const shopMode = await getSetting("shop_mode", "fnb");
  const pack = catalogPackFromQuery(params.pack, shopMode);
  const [rows, counts] = await Promise.all([
    listCategories(false, pack),
    getSql()<{ id: string; n: number }[]>`
      SELECT category_id::text AS id, COUNT(*)::int AS n FROM products GROUP BY category_id
    `,
  ]);
  const countById = new Map(counts.map((row) => [row.id, Number(row.n) || 0]));
  const q = params.q?.trim().toLowerCase() ?? "";
  const status = params.status === "active" || params.status === "inactive" ? params.status : "";
  const sort = params.sort === "name" || params.sort === "count" ? params.sort : "order";
  const filtered = rows
    .map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      image: row.image,
      sortOrder: row.sortOrder,
      status: row.status,
      productCount: countById.get(row.id) ?? 0,
    }))
    .filter((row) => {
      if (q && !row.name.toLowerCase().includes(q)) return false;
      if (status && row.status !== status) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "id");
      if (sort === "count") return b.productCount - a.productCount || a.name.localeCompare(b.name, "id");
      return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "id");
    });
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(params.page) || 1), pages);
  const startIndex = (page - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(startIndex, startIndex + PAGE_SIZE).map((row, index) => ({ ...row, number: startIndex + index + 1 }));
  const creating = params.new === "1";
  const current = creating ? null : rows.find((row) => row.id === params.id) ?? null;
  const query = {
    q: params.q?.trim() ?? "",
    status,
    sort,
    page: String(page),
    id: current?.id ?? "",
    fresh: creating ? "1" : "",
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Kategori</h1>
        <p className="mt-1 text-sm text-muted">Kelola kategori menu untuk mengatur produk dengan lebih rapi.</p>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <CategoryCatalog
          query={query}
          rows={pageRows}
          total={filtered.length}
          page={page}
          pages={pages}
          start={filtered.length === 0 ? 0 : startIndex + 1}
          end={Math.min(startIndex + PAGE_SIZE, filtered.length)}
        />
        <aside className="rounded-2xl border border-line bg-surface p-4 shadow-card">
          {creating || current ? (
            <>
              <h2 className="mb-4 font-semibold">{current ? "Detail Kategori" : "Tambah Kategori"}</h2>
              <CategoryForm
                key={current?.id ?? "new"}
                category={
                  current
                    ? {
                        id: current.id,
                        name: current.name,
                        description: current.description,
                        image: current.image,
                        sortOrder: current.sortOrder,
                        status: current.status,
                      }
                    : null
                }
                pack={pack}
              />
            </>
          ) : (
            <div>
              <h2 className="font-semibold">Detail Kategori</h2>
              <p className="mt-3 text-sm text-muted">Pilih kategori untuk melihat dan mengubah detailnya.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
