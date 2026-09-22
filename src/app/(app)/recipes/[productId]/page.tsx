import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { getDb } from "@/lib/db";
import { money, num } from "@/lib/format";
import { inventoryItems, products, recipeItems, recipes } from "@/lib/schema";
import { RecipeEditor } from "../RecipeEditor";

export default async function RecipeEditPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const db = getDb();
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product || product.kind !== "recipe") notFound();
  const [recipe] = await db.select().from(recipes).where(eq(recipes.productId, productId)).limit(1);
  const items = recipe
    ? await db.select().from(recipeItems).where(eq(recipeItems.recipeId, recipe.id))
    : [];
  const inventory = await db.select().from(inventoryItems);
  return (
    <div>
      <PageHeader title={`Resep ${product.name}`} description={`SKU ${product.sku}`} />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card>
          <RecipeEditor
            productId={product.id}
            note={recipe?.note ?? ""}
            items={items.map((i) => ({ inventoryItemId: i.inventoryItemId, quantity: num(i.quantity) }))}
            inventory={inventory}
          />
        </Card>
        <Card className="lg:sticky lg:top-24">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">Produk</p>
          <h2 className="mt-1 text-lg font-semibold">{product.name}</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">SKU</dt>
              <dd className="font-medium">{product.sku}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Harga</dt>
              <dd className="font-medium">{money(product.price)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Bahan</dt>
              <dd className="font-medium">{items.length}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
