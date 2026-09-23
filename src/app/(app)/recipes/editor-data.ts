import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { categories, inventoryItems, products, recipeItems, recipes } from "@/lib/schema";

function amount(value: string | number | null | undefined) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function getRecipeEditorData(productId: string | null) {
  const db = getDb();
  const categoryRows = await db.select().from(categories).where(eq(categories.catalogPack, "fnb")).orderBy(categories.name);
  const inventory = await db.select().from(inventoryItems).orderBy(inventoryItems.name);
  if (!productId) {
    return {
      product: null,
      portion: "1 Cup (16 oz)",
      note: "",
      lines: [] as { inventoryItemId: string; quantity: number }[],
      categories: categoryRows.map((row) => ({ id: row.id, name: row.name })),
      inventory: inventory.map((row) => ({ id: row.id, name: row.name, unit: row.unit, cost: amount(row.cost) })),
    };
  }
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product || product.kind !== "recipe") notFound();
  const [recipe] = await db.select().from(recipes).where(eq(recipes.productId, productId)).limit(1);
  const items = recipe ? await db.select().from(recipeItems).where(eq(recipeItems.recipeId, recipe.id)) : [];
  return {
    product: {
      id: product.id,
      name: product.name,
      categoryId: product.categoryId,
      price: amount(product.price),
      status: product.status,
      image: product.image,
      description: product.description,
    },
    portion: recipe?.portion || "1 Cup (16 oz)",
    note: recipe?.note ?? "",
    lines: items.map((item) => ({ inventoryItemId: item.inventoryItemId, quantity: amount(item.quantity) })),
    categories: categoryRows.map((row) => ({ id: row.id, name: row.name })),
    inventory: inventory.map((row) => ({ id: row.id, name: row.name, unit: row.unit, cost: amount(row.cost) })),
  };
}
