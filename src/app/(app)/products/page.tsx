import Link from "next/link";
import { eq } from "drizzle-orm";
import { Cake, Coffee, CupSoda, GlassWater, Plus, ShoppingBag, Tag, UtensilsCrossed } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ProductCatalog, type CatalogRow } from "./ProductCatalog";
import { ProductDetail } from "./ProductDetail";
import { ProductForm } from "./ProductForm";
import { productHref, type ProductQuery } from "./productQuery";
import { getDb } from "@/lib/db";
import { addons } from "@/lib/schema";
import { getSettingsMap } from "@/lib/settings";
import { catalogPackFromQuery } from "@/lib/theme";
import { getProductDetail, listCategories, listProducts } from "@/server/queries";

const PAGE_SIZE = 8;

function categoryIcon(name: string): LucideIcon {
  const label = name.toLowerCase();
  if (/(kopi|coffee|latte|espresso)/.test(label)) return Coffee;
  if (/(non-?coffee|teh|tea)/.test(label)) return CupSoda;
  if (/(makanan|food|sandwich)/.test(label)) return UtensilsCrossed;
  if (/(pastry|dessert|kue|roti)/.test(label)) return Cake;
  if (/(botol|minum|drink)/.test(label)) return GlassWater;
  if (/(merch|oleh)/.test(label)) return ShoppingBag;
  return Tag;
}

function toVariants(product: NonNullable<Awaited<ReturnType<typeof getProductDetail>>>) {
  return product.variants.map((variant) => ({
    name: variant.name,
    isRequired: variant.isRequired,
    options: variant.options.map((option) => ({
      name: option.name,
      priceAdjustment: Number(option.priceAdjustment),
      isDefault: option.isDefault,
    })),
  }));
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<ProductQuery>;
}) {
  const params = await searchParams;
  const settings = await getSettingsMap();
  const pack = catalogPackFromQuery(params.pack, settings.shop_mode);
  const editingId = params.edit && params.edit !== "new" ? params.edit : "";
  const [catalog, categories, detail, editing] = await Promise.all([
    listProducts(pack),
    listCategories(false, pack),
    params.id ? getProductDetail(params.id) : Promise.resolve(null),
    editingId ? getProductDetail(editingId) : Promise.resolve(null),
  ]);
  const showEditor = params.edit === "new" || Boolean(editing);
  const addonRows =
    showEditor && pack === "fnb" ? await getDb().select().from(addons).where(eq(addons.status, "active")) : [];

  const q = (params.q || "").trim().toLowerCase();
  const filtered = catalog.filter((row) => {
    if (q && !row.name.toLowerCase().includes(q)) return false;
    if (params.category && row.categoryId !== params.category) return false;
    if (params.status === "active" || params.status === "inactive") return row.status === params.status;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => {
    if (params.sort === "name") return a.name.localeCompare(b.name, "id");
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(params.page) || 1), pages);
  const rows: CatalogRow[] = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    image: row.image,
    categoryName: row.categoryName ?? "",
    price: String(row.price),
    kind: row.kind,
    status: row.status,
    stockStatus: row.stockStatus,
    currentStock: String(row.currentStock),
    minimumStock: String(row.minimumStock),
  }));

  const query: ProductQuery = {
    pack,
    q: params.q,
    category: params.category,
    status: params.status,
    sort: params.sort === "name" ? "name" : "",
    page: page > 1 ? String(page) : "",
    id: params.id,
    edit: params.edit,
  };
  const categoryName = (id: string) => categories.find((item) => item.id === id)?.name ?? "";
  const editorProduct = params.edit === "new" ? null : editing;
  const pillClass = (active: boolean) =>
    `inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-medium ${
      active ? "bg-accent text-white" : "border border-line bg-surface text-ink"
    }`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produk</h1>
          <p className="mt-1 text-sm text-muted">
            {pack === "retail" ? "Kelola katalog, harga, dan stok barang." : "Kelola menu, harga, varian, topping, dan resep bahan baku."}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
          <Link href={productHref(query, { category: "", page: "", id: "" })} className={pillClass(!params.category)}>
            Semua Produk
          </Link>
          {categories.map((item) => {
            const Icon = categoryIcon(item.name);
            return (
              <Link
                key={item.id}
                href={productHref(query, { category: item.id, page: "", id: "" })}
                className={pillClass(params.category === item.id)}
              >
                <Icon size={14} aria-hidden />
                {item.name}
              </Link>
            );
          })}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href={productHref(query, { edit: "new", id: "" })}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white"
          >
            <Plus size={14} aria-hidden />
            Tambah Produk
          </Link>
        </div>
      </div>

      <div className={`grid min-w-0 items-start gap-4 ${detail ? "xl:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
        <ProductCatalog
          query={query}
          rows={rows}
          categories={categories.map((item) => ({ id: item.id, name: item.name }))}
          page={page}
          pages={pages}
          total={sorted.length}
          currency={settings.currency || "Rp"}
          emptyLabel={catalog.length === 0 ? "Belum ada produk di katalog ini." : "Tidak ada produk yang cocok."}
        />
        {detail ? (
          <ProductDetail
            product={{
              id: detail.id,
              name: detail.name,
              sku: detail.sku,
              description: detail.description,
              image: detail.image,
              categoryName: categoryName(detail.categoryId),
              price: String(detail.price),
              status: detail.status,
              kind: detail.kind,
              currentStock: String(detail.currentStock),
              minimumStock: String(detail.minimumStock),
              stockStatus: detail.stockStatus,
            }}
            variants={detail.variants.map((variant) => ({
              name: variant.name,
              options: variant.options.map((option) => ({
                name: option.name,
                priceAdjustment: String(option.priceAdjustment),
              })),
            }))}
            addons={detail.addons.map((addon) => ({ id: addon.id, name: addon.name, price: String(addon.price) }))}
            recipeLines={detail.recipeLines}
            closeHref={productHref(query, { id: "" })}
            editHref={productHref(query, { edit: detail.id })}
            currency={settings.currency || "Rp"}
          />
        ) : null}
      </div>

      {showEditor ? (
        <div className="fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto bg-ink/40 p-4 sm:p-8">
          <div className="w-full max-w-5xl">
            <ProductForm
              categories={categories.map((item) => ({ id: item.id, name: item.name }))}
              pack={pack}
              desk
              closeHref={productHref(query, { edit: "" })}
              product={
                editorProduct
                  ? {
                      id: editorProduct.id,
                      name: editorProduct.name,
                      sku: editorProduct.sku,
                      categoryId: editorProduct.categoryId,
                      kind: editorProduct.kind,
                      price: String(editorProduct.price),
                      cost: String(editorProduct.cost),
                      description: editorProduct.description,
                      status: editorProduct.status,
                      stockStatus: editorProduct.stockStatus,
                      currentStock: String(editorProduct.currentStock),
                      minimumStock: String(editorProduct.minimumStock),
                      catalogPack: editorProduct.catalogPack,
                      image: editorProduct.image,
                      isFeatured: editorProduct.isFeatured,
                      sortOrder: editorProduct.sortOrder,
                    }
                  : undefined
              }
              initialVariants={editorProduct ? toVariants(editorProduct) : []}
              allAddons={addonRows.map((addon) => ({ id: addon.id, name: addon.name, price: String(addon.price) }))}
              linkedAddonIds={editorProduct ? editorProduct.addons.map((addon) => addon.id) : []}
              recipeLines={editorProduct?.recipeLines ?? []}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
