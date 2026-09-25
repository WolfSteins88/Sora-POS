import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ProductForm } from "../ProductForm";
import { getDb } from "@/lib/db";
import { addons } from "@/lib/schema";
import { getProductDetail, listCategories } from "@/server/queries";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductDetail(id);
  if (!product) notFound();
  const cats = await listCategories(false, product.catalogPack);
  const allAddons = await getDb().select().from(addons).where(eq(addons.status, "active"));
  return (
    <ProductForm
      categories={cats.map((item) => ({ id: item.id, name: item.name }))}
      pack={product.catalogPack}
      product={{
        id: product.id,
        name: product.name,
        sku: product.sku,
        categoryId: product.categoryId,
        kind: product.kind,
        price: String(product.price),
        cost: String(product.cost),
        description: product.description,
        status: product.status,
        stockStatus: product.stockStatus,
        currentStock: String(product.currentStock),
        minimumStock: String(product.minimumStock),
        catalogPack: product.catalogPack,
        image: product.image,
        isFeatured: product.isFeatured,
        useVariants: product.useVariants,
        useAddons: product.useAddons,
        sortOrder: product.sortOrder,
      }}
      initialVariants={product.variants.map((variant) => ({
        name: variant.name,
        isRequired: variant.isRequired,
        options: variant.options.map((option) => ({
          name: option.name,
          priceAdjustment: Number(option.priceAdjustment),
          isDefault: option.isDefault,
        })),
      }))}
      allAddons={allAddons.map((addon) => ({ id: addon.id, name: addon.name, price: String(addon.price) }))}
      linkedAddonIds={product.addons.map((addon) => addon.id)}
      recipeLines={product.recipeLines}
    />
  );
}
