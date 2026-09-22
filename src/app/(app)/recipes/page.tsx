import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { Badge, Card, PageHeader, ghostButtonClass } from "@/components/ui";
import { getDb } from "@/lib/db";
import { money } from "@/lib/format";
import { categories, products, recipes } from "@/lib/schema";

export default async function RecipesPage() {
  const db = getDb();
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      price: products.price,
      category: categories.name,
      recipeId: recipes.id,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(recipes, eq(recipes.productId, products.id))
    .where(and(eq(products.kind, "recipe"), eq(products.catalogPack, "fnb")));

  return (
    <div>
      <PageHeader title="Resep" description="BOM hanya untuk produk racikan." />
      <Card className="overflow-hidden p-0">
        <div className="hidden lg:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold tracking-wide text-muted uppercase">
                <th className="px-5 py-3 font-semibold">Produk</th>
                <th className="px-5 py-3 font-semibold">SKU</th>
                <th className="px-5 py-3 font-semibold">Kategori</th>
                <th className="px-5 py-3 font-semibold">Harga</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-4 font-semibold">{row.name}</td>
                  <td className="px-5 py-4 text-muted">{row.sku}</td>
                  <td className="px-5 py-4">{row.category}</td>
                  <td className="px-5 py-4">{money(row.price)}</td>
                  <td className="px-5 py-4">
                    <Badge tone={row.recipeId ? "ok" : "warn"}>{row.recipeId ? "Ada BOM" : "Belum"}</Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/recipes/${row.id}`} className={ghostButtonClass}>
                      {row.recipeId ? "Edit resep" : "Buat resep"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="divide-y divide-line lg:hidden">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{row.name}</p>
                  <p className="text-sm text-muted">
                    {row.sku} · {row.category}
                  </p>
                </div>
                <Badge tone={row.recipeId ? "ok" : "warn"}>{row.recipeId ? "Ada BOM" : "Belum"}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{money(row.price)}</p>
                <Link href={`/recipes/${row.id}`} className={ghostButtonClass}>
                  {row.recipeId ? "Edit resep" : "Buat resep"}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
