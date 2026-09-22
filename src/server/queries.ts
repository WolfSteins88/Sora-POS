import { desc, eq, and, inArray } from "drizzle-orm";
import { getDb, getSql } from "@/lib/db";
import {
  addons,
  categories,
  heldOrders,
  productAddons,
  productVariantOptions,
  productVariants,
  products,
  recipes,
  shifts,
} from "@/lib/schema";

export async function getOpenShift(userId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(shifts)
    .where(and(eq(shifts.userId, userId), eq(shifts.status, "open")))
    .limit(1);
  return row ?? null;
}

export async function listCategories(activeOnly = false, pack?: "fnb" | "retail") {
  const db = getDb();
  const rows = pack
    ? await db
        .select()
        .from(categories)
        .where(eq(categories.catalogPack, pack))
        .orderBy(categories.sortOrder, categories.name)
    : await db.select().from(categories).orderBy(categories.sortOrder, categories.name);
  return activeOnly ? rows.filter((c) => c.status === "active") : rows;
}

export async function listProducts(pack: "fnb" | "retail") {
  const db = getDb();
  return db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      kind: products.kind,
      price: products.price,
      cost: products.cost,
      status: products.status,
      stockStatus: products.stockStatus,
      currentStock: products.currentStock,
      minimumStock: products.minimumStock,
      categoryId: products.categoryId,
      categoryName: categories.name,
      catalogPack: products.catalogPack,
      description: products.description,
      image: products.image,
      isFeatured: products.isFeatured,
      sortOrder: products.sortOrder,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(eq(products.catalogPack, pack))
    .orderBy(desc(products.isFeatured), categories.sortOrder, products.sortOrder, products.name);
}

export async function getProductDetail(id: string) {
  const db = getDb();
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!product) return null;
  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, id))
    .orderBy(productVariants.sortOrder);
  const variantIds = variants.map((v) => v.id);
  const options =
    variantIds.length === 0
      ? []
      : await db.select().from(productVariantOptions).where(inArray(productVariantOptions.variantId, variantIds));
  const linkedAddons = await db
    .select({
      id: addons.id,
      name: addons.name,
      price: addons.price,
      status: addons.status,
    })
    .from(productAddons)
    .innerJoin(addons, eq(addons.id, productAddons.addonId))
    .where(eq(productAddons.productId, id));
  const [recipe] = await db.select().from(recipes).where(eq(recipes.productId, id)).limit(1);
  return {
    ...product,
    variants: variants.map((v) => ({
      ...v,
      options: options.filter((o) => o.variantId === v.id),
    })),
    addons: linkedAddons,
    recipe,
  };
}

export async function posCatalog(shopMode = "fnb") {
  const db = getDb();
  const cats = await listCategories(true);
  const items = await db
    .select()
    .from(products)
    .where(eq(products.status, "active"))
    .orderBy(desc(products.isFeatured), products.sortOrder, products.name);
  const pack = shopMode === "retail" ? "retail" : "fnb";
  return {
    categories: cats.filter((c) => c.catalogPack === pack),
    products: items.filter((p) => p.catalogPack === pack),
  };
}

export async function listHeldOrders(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(heldOrders)
    .where(eq(heldOrders.userId, userId))
    .orderBy(desc(heldOrders.createdAt));
}

export async function listTransactions(filters: {
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}) {
  const sql = getSql();
  const from = filters.dateFrom || "1970-01-01";
  const to = filters.dateTo || "2999-12-31";
  const search = filters.search ? `%${filters.search}%` : "%";
  return sql`
    SELECT t.*, u.name AS cashier_name,
           (SELECT method FROM payments WHERE transaction_id = t.id LIMIT 1) AS payment_method
    FROM transactions t
    JOIN users u ON u.id = t.user_id
    WHERE t.created_at::date BETWEEN ${from}::date AND ${to}::date
      AND t.transaction_number ILIKE ${search}
    ORDER BY t.created_at DESC
    LIMIT 200
  `;
}

export async function getTransactionFull(id: string) {
  const sql = getSql();
  const [trx] = await sql`
    SELECT t.*, u.name AS cashier_name
    FROM transactions t JOIN users u ON u.id = t.user_id
    WHERE t.id = ${id} LIMIT 1
  `;
  if (!trx) return null;
  const items = await sql`SELECT * FROM transaction_items WHERE transaction_id = ${id}`;
  for (const item of items) {
    item.variants = await sql`SELECT * FROM transaction_item_variants WHERE transaction_item_id = ${item.id}`;
    item.addons = await sql`SELECT * FROM transaction_item_addons WHERE transaction_item_id = ${item.id}`;
  }
  trx.items = items;
  trx.payments = await sql`SELECT * FROM payments WHERE transaction_id = ${id}`;
  return trx;
}

export async function dashboardStats(shopMode = "fnb") {
  const sql = getSql();
  const pack = shopMode === "retail" ? "retail" : "fnb";
  const [today] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'completed')::int AS trx_count,
      COALESCE(SUM(total) FILTER (WHERE status = 'completed'), 0)::text AS revenue
    FROM transactions
    WHERE created_at::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date
  `;
  const [openShifts] = await sql`SELECT COUNT(*)::int AS c FROM shifts WHERE status = 'open'`;
  const lowGoods = await sql`
    SELECT id, name, current_stock::text, minimum_stock::text, catalog_pack
    FROM products
    WHERE kind = 'goods' AND current_stock <= minimum_stock AND catalog_pack = ${pack}
    ORDER BY name LIMIT 8
  `;
  const lowInv =
    pack === "retail"
      ? []
      : await sql`
          SELECT id, name, current_stock::text, minimum_stock::text, unit
          FROM inventory_items
          WHERE current_stock <= minimum_stock
          ORDER BY name LIMIT 8
        `;
  const top = await sql`
    SELECT ti.product_name, SUM(ti.quantity)::int AS qty
    FROM transaction_items ti
    JOIN transactions t ON t.id = ti.transaction_id
    WHERE t.status = 'completed'
      AND t.created_at::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date
    GROUP BY ti.product_name
    ORDER BY qty DESC
    LIMIT 5
  `;
  const daily = await sql`
    SELECT d::date AS day,
           COALESCE(SUM(t.total) FILTER (WHERE t.status = 'completed'), 0)::text AS revenue,
           COUNT(*) FILTER (WHERE t.status = 'completed')::int AS trx_count
    FROM generate_series(
      (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date - 8,
      (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date,
      interval '1 day'
    ) AS d
    LEFT JOIN transactions t ON t.created_at::date = d::date
    GROUP BY d
    ORDER BY d
  `;
  return { today, openShifts: openShifts.c, lowGoods, lowInv, top, daily };
}

export async function retailDashboard() {
  const sql = getSql();
  const base = await dashboardStats("retail");
  const payments = await sql`
    SELECT p.method, COALESCE(SUM(p.amount), 0)::text AS amount
    FROM payments p
    JOIN transactions t ON t.id = p.transaction_id
    WHERE t.status = 'completed'
      AND t.created_at::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date
    GROUP BY p.method
    ORDER BY SUM(p.amount) DESC
  `;
  const recent = await sql`
    SELECT transaction_number, total::text, status
    FROM transactions
    ORDER BY created_at DESC
    LIMIT 4
  `;
  const products = await sql`
    SELECT ti.product_name,
           SUM(ti.quantity)::int AS qty,
           MAX(ti.unit_price)::text AS unit_price,
           COALESCE(MAX(p.current_stock), 0)::text AS current_stock
    FROM transaction_items ti
    JOIN transactions t ON t.id = ti.transaction_id
    LEFT JOIN products p ON p.id = ti.product_id
    WHERE t.status = 'completed'
      AND t.created_at::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date
      AND (p.catalog_pack = 'retail' OR p.catalog_pack IS NULL)
    GROUP BY ti.product_name
    ORDER BY qty DESC
    LIMIT 5
  `;
  return { ...base, payments, recent, products };
}

export type RecipeHppLine = {
  inventoryItemId: string;
  name: string;
  unit: string;
  quantity: string;
  cost: string;
  subtotal: string;
};

export type RecipeHppRow = {
  id: string;
  name: string;
  sku: string;
  price: string;
  storedCost: string;
  recipeId: string | null;
  costLocked: boolean;
  hpp: string;
  ingredientCount: number;
  zeroCostCount: number;
  lines: RecipeHppLine[];
};

export async function recipeHpp(): Promise<RecipeHppRow[]> {
  const sql = getSql();
  const rows = await sql<{
    id: string;
    name: string;
    sku: string;
    price: string;
    stored_cost: string;
    recipe_id: string | null;
    cost_locked: boolean;
    hpp: string;
    ingredient_count: number;
    zero_cost_count: number;
  }[]>`
    SELECT p.id,
           p.name,
           p.sku,
           p.price::text AS price,
           p.cost::text AS stored_cost,
           r.id AS recipe_id,
           COALESCE(r.cost_locked, false) AS cost_locked,
           COALESCE(SUM(ri.quantity * i.cost), 0)::text AS hpp,
           COUNT(ri.id)::int AS ingredient_count,
           COUNT(*) FILTER (WHERE ri.id IS NOT NULL AND COALESCE(i.cost, 0) = 0)::int AS zero_cost_count
    FROM products p
    LEFT JOIN recipes r ON r.product_id = p.id
    LEFT JOIN recipe_items ri ON ri.recipe_id = r.id
    LEFT JOIN inventory_items i ON i.id = ri.inventory_item_id
    WHERE p.kind = 'recipe' AND p.catalog_pack = 'fnb'
    GROUP BY p.id, r.id
    ORDER BY p.name
  `;
  const lines = await sql<{
    recipe_id: string;
    inventory_item_id: string;
    name: string;
    unit: string;
    quantity: string;
    cost: string;
    subtotal: string;
  }[]>`
    SELECT ri.recipe_id,
           i.id AS inventory_item_id,
           i.name,
           i.unit::text AS unit,
           ri.quantity::text AS quantity,
           i.cost::text AS cost,
           (ri.quantity * i.cost)::text AS subtotal
    FROM recipe_items ri
    JOIN recipes r ON r.id = ri.recipe_id
    JOIN products p ON p.id = r.product_id
    JOIN inventory_items i ON i.id = ri.inventory_item_id
    WHERE p.kind = 'recipe' AND p.catalog_pack = 'fnb'
    ORDER BY i.name
  `;
  const byRecipe = new Map<string, RecipeHppLine[]>();
  for (const line of lines) {
    const list = byRecipe.get(line.recipe_id) ?? [];
    list.push({
      inventoryItemId: line.inventory_item_id,
      name: line.name,
      unit: line.unit,
      quantity: line.quantity,
      cost: line.cost,
      subtotal: line.subtotal,
    });
    byRecipe.set(line.recipe_id, list);
  }
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    price: row.price,
    storedCost: row.stored_cost,
    recipeId: row.recipe_id,
    costLocked: Boolean(row.cost_locked),
    hpp: row.hpp,
    ingredientCount: Number(row.ingredient_count),
    zeroCostCount: Number(row.zero_cost_count),
    lines: row.recipe_id ? (byRecipe.get(row.recipe_id) ?? []) : [],
  }));
}

export async function writeUnlockedRecipeCosts(filter?: { productId?: string; inventoryItemId?: string }) {
  const sql = getSql();
  await sql`
    UPDATE products p
    SET cost = sub.hpp, updated_at = NOW()
    FROM (
      SELECT p2.id, COALESCE(SUM(ri.quantity * i.cost), 0) AS hpp
      FROM products p2
      JOIN recipes r ON r.product_id = p2.id
      LEFT JOIN recipe_items ri ON ri.recipe_id = r.id
      LEFT JOIN inventory_items i ON i.id = ri.inventory_item_id
      WHERE p2.kind = 'recipe'
        AND p2.catalog_pack = 'fnb'
        AND r.cost_locked = false
        AND (${filter?.productId ?? null}::uuid IS NULL OR p2.id = ${filter?.productId ?? null})
        AND (
          ${filter?.inventoryItemId ?? null}::uuid IS NULL
          OR r.id IN (
            SELECT recipe_id FROM recipe_items WHERE inventory_item_id = ${filter?.inventoryItemId ?? null}
          )
        )
      GROUP BY p2.id
    ) sub
    WHERE p.id = sub.id
  `;
}
