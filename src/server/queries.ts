import { desc, eq, and, inArray } from "drizzle-orm";
import { getDb, getSql } from "@/lib/db";
import { num } from "@/lib/format";
import {
  addons,
  categories,
  heldOrders,
  inventoryItems,
  productAddons,
  productVariantOptions,
  productVariants,
  products,
  recipeItems,
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
      createdAt: products.createdAt,
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
  const recipeLines = recipe
    ? await db
        .select({
          name: inventoryItems.name,
          unit: inventoryItems.unit,
          quantity: recipeItems.quantity,
        })
        .from(recipeItems)
        .innerJoin(inventoryItems, eq(inventoryItems.id, recipeItems.inventoryItemId))
        .where(eq(recipeItems.recipeId, recipe.id))
    : [];
  return {
    ...product,
    variants: variants.map((v) => ({
      ...v,
      options: options.filter((o) => o.variantId === v.id),
    })),
    addons: linkedAddons,
    recipe,
    recipeLines: recipeLines.map((line) => ({
      name: line.name,
      unit: line.unit,
      quantity: num(line.quantity),
    })),
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

const PAGE_SIZE = 10;
const PAYMENT_METHODS = ["cash", "qris", "debit", "credit", "ewallet"] as const;

export async function transactionDesk(filters: {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  method?: string;
  status?: string;
  cashierId?: string;
  page?: number;
}) {
  const sql = getSql();
  const search = filters.search?.trim() ?? "";
  const like = `%${search}%`;
  const from = filters.dateFrom?.trim() || null;
  const to = filters.dateTo?.trim() || null;
  const method = PAYMENT_METHODS.includes(filters.method as (typeof PAYMENT_METHODS)[number]) ? filters.method! : "";
  const status = filters.status === "completed" || filters.status === "cancelled" ? filters.status : "";
  const cashierId = filters.cashierId?.trim() ?? "";
  const page = Math.max(1, filters.page || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [kpiRow] = await sql<{
    trx_today: number;
    trx_yesterday: number;
    revenue_today: string;
    revenue_yesterday: string;
    cancel_today: number;
    cancel_yesterday: number;
  }[]>`
    SELECT
      COUNT(*) FILTER (
        WHERE status = 'completed'
          AND (created_at AT TIME ZONE 'Asia/Jakarta')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date
      )::int AS trx_today,
      COUNT(*) FILTER (
        WHERE status = 'completed'
          AND (created_at AT TIME ZONE 'Asia/Jakarta')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date - 1
      )::int AS trx_yesterday,
      COALESCE(SUM(total) FILTER (
        WHERE status = 'completed'
          AND (created_at AT TIME ZONE 'Asia/Jakarta')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date
      ), 0)::text AS revenue_today,
      COALESCE(SUM(total) FILTER (
        WHERE status = 'completed'
          AND (created_at AT TIME ZONE 'Asia/Jakarta')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date - 1
      ), 0)::text AS revenue_yesterday,
      COUNT(*) FILTER (
        WHERE status = 'cancelled'
          AND (created_at AT TIME ZONE 'Asia/Jakarta')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date
      )::int AS cancel_today,
      COUNT(*) FILTER (
        WHERE status = 'cancelled'
          AND (created_at AT TIME ZONE 'Asia/Jakarta')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date - 1
      )::int AS cancel_yesterday
    FROM transactions
    WHERE (created_at AT TIME ZONE 'Asia/Jakarta')::date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date - 1
  `;

  const cashiers = await sql<{ id: string; name: string }[]>`
    SELECT DISTINCT u.id, u.name
    FROM users u
    JOIN transactions t ON t.user_id = u.id
    ORDER BY u.name
  `;

  const [countRow] = await sql<{ c: number }[]>`
    SELECT COUNT(*)::int AS c
    FROM transactions t
    JOIN users u ON u.id = t.user_id
    WHERE (${from}::date IS NULL OR (t.created_at AT TIME ZONE 'Asia/Jakarta')::date >= ${from}::date)
      AND (${to}::date IS NULL OR (t.created_at AT TIME ZONE 'Asia/Jakarta')::date <= ${to}::date)
      AND (${method} = '' OR EXISTS (
        SELECT 1 FROM payments p WHERE p.transaction_id = t.id AND p.method::text = ${method}
      ))
      AND (${status} = '' OR t.status::text = ${status})
      AND (${cashierId} = '' OR t.user_id::text = ${cashierId})
      AND (
        ${search} = ''
        OR t.transaction_number ILIKE ${like}
        OR u.name ILIKE ${like}
        OR EXISTS (
          SELECT 1 FROM transaction_items ti
          WHERE ti.transaction_id = t.id AND ti.product_name ILIKE ${like}
        )
      )
  `;

  const rows = await sql<{
    id: string;
    transaction_number: string;
    created_at: string | Date;
    total: string;
    status: string;
    cashier_name: string;
    payment_method: string | null;
    item_count: number;
  }[]>`
    SELECT t.id,
           t.transaction_number,
           t.created_at,
           t.total::text,
           t.status::text,
           u.name AS cashier_name,
           (SELECT method::text FROM payments WHERE transaction_id = t.id ORDER BY created_at LIMIT 1) AS payment_method,
           COALESCE((SELECT SUM(quantity)::int FROM transaction_items WHERE transaction_id = t.id), 0) AS item_count
    FROM transactions t
    JOIN users u ON u.id = t.user_id
    WHERE (${from}::date IS NULL OR (t.created_at AT TIME ZONE 'Asia/Jakarta')::date >= ${from}::date)
      AND (${to}::date IS NULL OR (t.created_at AT TIME ZONE 'Asia/Jakarta')::date <= ${to}::date)
      AND (${method} = '' OR EXISTS (
        SELECT 1 FROM payments p WHERE p.transaction_id = t.id AND p.method::text = ${method}
      ))
      AND (${status} = '' OR t.status::text = ${status})
      AND (${cashierId} = '' OR t.user_id::text = ${cashierId})
      AND (
        ${search} = ''
        OR t.transaction_number ILIKE ${like}
        OR u.name ILIKE ${like}
        OR EXISTS (
          SELECT 1 FROM transaction_items ti
          WHERE ti.transaction_id = t.id AND ti.product_name ILIKE ${like}
        )
      )
    ORDER BY t.created_at DESC
    LIMIT ${PAGE_SIZE} OFFSET ${offset}
  `;

  const trxToday = Number(kpiRow?.trx_today || 0);
  const trxYesterday = Number(kpiRow?.trx_yesterday || 0);
  const revenueToday = num(kpiRow?.revenue_today);
  const revenueYesterday = num(kpiRow?.revenue_yesterday);
  return {
    pageSize: PAGE_SIZE,
    page,
    total: Number(countRow?.c || 0),
    rows,
    cashiers,
    kpi: {
      trxToday,
      trxYesterday,
      revenueToday,
      revenueYesterday,
      avgToday: trxToday ? revenueToday / trxToday : 0,
      avgYesterday: trxYesterday ? revenueYesterday / trxYesterday : 0,
      cancelToday: Number(kpiRow?.cancel_today || 0),
      cancelYesterday: Number(kpiRow?.cancel_yesterday || 0),
    },
  };
}

export async function getTransactionFull(id: string) {
  const sql = getSql();
  const [trx] = await sql`
    SELECT t.*, u.name AS cashier_name
    FROM transactions t JOIN users u ON u.id = t.user_id
    WHERE t.id = ${id} LIMIT 1
  `;
  if (!trx) return null;
  const items = await sql`
    SELECT ti.*, p.image AS product_image
    FROM transaction_items ti
    LEFT JOIN products p ON p.id = ti.product_id
    WHERE ti.transaction_id = ${id}
  `;
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

export type FnbChartPoint = { label: string; revenue: number; trx: number };
export type FnbCategoryPoint = { name: string; today: number; week: number; month: number };

export async function fnbDashboard() {
  const sql = getSql();
  const [
    [kpi],
    [items],
    [held],
    hourlyRows,
    dailyRows,
    categoryRows,
    topRows,
    recentRows,
    [shift],
    lowGoods,
    lowInv,
  ] = await Promise.all([
    sql<{ revenue_today: string; revenue_yesterday: string; trx_today: number; trx_yesterday: number }[]>`
      SELECT
        COALESCE(SUM(total) FILTER (
          WHERE status = 'completed'
            AND (created_at AT TIME ZONE 'Asia/Jakarta')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date
        ), 0)::text AS revenue_today,
        COALESCE(SUM(total) FILTER (
          WHERE status = 'completed'
            AND (created_at AT TIME ZONE 'Asia/Jakarta')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date - 1
        ), 0)::text AS revenue_yesterday,
        COUNT(*) FILTER (
          WHERE status = 'completed'
            AND (created_at AT TIME ZONE 'Asia/Jakarta')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date
        )::int AS trx_today,
        COUNT(*) FILTER (
          WHERE status = 'completed'
            AND (created_at AT TIME ZONE 'Asia/Jakarta')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date - 1
        )::int AS trx_yesterday
      FROM transactions
      WHERE (created_at AT TIME ZONE 'Asia/Jakarta')::date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date - 1
    `,
    sql<{ items_today: number; items_yesterday: number }[]>`
      SELECT
        COALESCE(SUM(ti.quantity) FILTER (
          WHERE (t.created_at AT TIME ZONE 'Asia/Jakarta')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date
        ), 0)::int AS items_today,
        COALESCE(SUM(ti.quantity) FILTER (
          WHERE (t.created_at AT TIME ZONE 'Asia/Jakarta')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date - 1
        ), 0)::int AS items_yesterday
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transaction_id
      WHERE t.status = 'completed'
        AND (t.created_at AT TIME ZONE 'Asia/Jakarta')::date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date - 1
    `,
    sql<{ c: number }[]>`SELECT COUNT(*)::int AS c FROM held_orders`,
    sql<{ hour: number; revenue: string; trx_count: number }[]>`
      SELECT gs.hour::int AS hour,
             COALESCE(SUM(t.total) FILTER (WHERE t.status = 'completed'), 0)::text AS revenue,
             COUNT(t.id) FILTER (WHERE t.status = 'completed')::int AS trx_count
      FROM generate_series(6, 22) AS gs(hour)
      LEFT JOIN transactions t
        ON (t.created_at AT TIME ZONE 'Asia/Jakarta')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date
       AND EXTRACT(HOUR FROM (t.created_at AT TIME ZONE 'Asia/Jakarta'))::int = gs.hour::int
      GROUP BY gs.hour
      ORDER BY gs.hour
    `,
    sql<{ day: string; revenue: string; trx_count: number }[]>`
      SELECT to_char(d::date, 'YYYY-MM-DD') AS day,
             COALESCE(SUM(t.total) FILTER (WHERE t.status = 'completed'), 0)::text AS revenue,
             COUNT(t.id) FILTER (WHERE t.status = 'completed')::int AS trx_count
      FROM generate_series(
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date - 29,
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date,
        interval '1 day'
      ) AS d
      LEFT JOIN transactions t
        ON (t.created_at AT TIME ZONE 'Asia/Jakarta')::date = d::date
      GROUP BY d
      ORDER BY d
    `,
    sql<{ name: string; today: string; week: string; month: string }[]>`
      SELECT COALESCE(c.name, 'Lainnya') AS name,
             COALESCE(SUM(ti.subtotal) FILTER (
               WHERE (t.created_at AT TIME ZONE 'Asia/Jakarta')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date
             ), 0)::text AS today,
             COALESCE(SUM(ti.subtotal) FILTER (
               WHERE (t.created_at AT TIME ZONE 'Asia/Jakarta')::date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date - 6
             ), 0)::text AS week,
             COALESCE(SUM(ti.subtotal), 0)::text AS month
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transaction_id AND t.status = 'completed'
      JOIN products p ON p.id = ti.product_id AND p.catalog_pack = 'fnb'
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE (t.created_at AT TIME ZONE 'Asia/Jakarta')::date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date - 29
      GROUP BY COALESCE(c.name, 'Lainnya')
      ORDER BY SUM(ti.subtotal) DESC
    `,
    sql<{ product_name: string; image: string | null; qty: number; revenue: string }[]>`
      SELECT ti.product_name,
             MAX(p.image) AS image,
             SUM(ti.quantity)::int AS qty,
             COALESCE(SUM(ti.subtotal), 0)::text AS revenue
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transaction_id
      LEFT JOIN products p ON p.id = ti.product_id
      WHERE t.status = 'completed'
        AND (t.created_at AT TIME ZONE 'Asia/Jakarta')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date
        AND (p.catalog_pack = 'fnb' OR p.id IS NULL)
      GROUP BY ti.product_name
      ORDER BY qty DESC
      LIMIT 5
    `,
    sql<{
      id: string;
      transaction_number: string;
      time_label: string;
      total: string;
      item_count: number;
      method: string | null;
    }[]>`
      SELECT t.id,
             t.transaction_number,
             to_char(t.created_at AT TIME ZONE 'Asia/Jakarta', 'HH24.MI') AS time_label,
             t.total::text AS total,
             COALESCE((SELECT SUM(quantity)::int FROM transaction_items WHERE transaction_id = t.id), 0) AS item_count,
             (SELECT method FROM payments WHERE transaction_id = t.id ORDER BY created_at LIMIT 1) AS method
      FROM transactions t
      WHERE t.status = 'completed'
      ORDER BY t.created_at DESC
      LIMIT 5
    `,
    sql<{ cashier_name: string; opening_at: string | Date; opening_cash: string }[]>`
      SELECT u.name AS cashier_name, s.opening_at, s.opening_cash::text AS opening_cash
      FROM shifts s
      JOIN users u ON u.id = s.user_id
      WHERE s.status = 'open'
      ORDER BY s.opening_at DESC
      LIMIT 1
    `,
    sql<{ id: string; name: string; current_stock: string; minimum_stock: string }[]>`
      SELECT id, name, current_stock::text, minimum_stock::text
      FROM products
      WHERE kind = 'goods' AND catalog_pack = 'fnb' AND current_stock <= minimum_stock
      ORDER BY current_stock ASC, name
      LIMIT 6
    `,
    sql<{ id: string; name: string; current_stock: string; minimum_stock: string; unit: string }[]>`
      SELECT id, name, current_stock::text, minimum_stock::text, unit::text
      FROM inventory_items
      WHERE current_stock <= minimum_stock
      ORDER BY current_stock ASC, name
      LIMIT 6
    `,
  ]);

  const categories = collapseCategories(
    categoryRows.map((row) => ({
      name: String(row.name),
      today: num(row.today),
      week: num(row.week),
      month: num(row.month),
    })),
  );

  return {
    kpi: {
      revenueToday: num(kpi?.revenue_today),
      revenueYesterday: num(kpi?.revenue_yesterday),
      trxToday: Number(kpi?.trx_today || 0),
      trxYesterday: Number(kpi?.trx_yesterday || 0),
      itemsToday: Number(items?.items_today || 0),
      itemsYesterday: Number(items?.items_yesterday || 0),
      held: Number(held?.c || 0),
    },
    hourly: hourlyRows.map((row) => ({
      label: `${String(row.hour).padStart(2, "0")}:00`,
      revenue: num(row.revenue),
      trx: Number(row.trx_count || 0),
    })),
    daily: dailyRows.map((row) => ({
      label: String(row.day),
      revenue: num(row.revenue),
      trx: Number(row.trx_count || 0),
    })),
    categories,
    top: topRows.map((row) => ({
      name: String(row.product_name),
      image: row.image,
      qty: Number(row.qty || 0),
      revenue: num(row.revenue),
    })),
    recent: recentRows.map((row) => ({
      id: String(row.id),
      number: String(row.transaction_number),
      time: String(row.time_label),
      items: Number(row.item_count || 0),
      total: num(row.total),
      method: row.method ? String(row.method) : "",
    })),
    shift: shift
      ? {
          cashier: String(shift.cashier_name),
          openingAt: new Date(shift.opening_at).toISOString(),
          openingCash: num(shift.opening_cash),
        }
      : null,
    alerts: [
      ...lowGoods.map((row) => ({
        id: `g-${row.id}`,
        name: String(row.name),
        href: `/products/${row.id}`,
        stock: String(row.current_stock),
        minimum: String(row.minimum_stock),
        unit: "pcs",
      })),
      ...lowInv.map((row) => ({
        id: `i-${row.id}`,
        name: String(row.name),
        href: "/inventory",
        stock: String(row.current_stock),
        minimum: String(row.minimum_stock),
        unit: String(row.unit),
      })),
    ].slice(0, 5),
  };
}

function collapseCategories(rows: FnbCategoryPoint[]): FnbCategoryPoint[] {
  if (rows.length <= 5) return rows;
  const head = rows.slice(0, 4);
  const rest = rows.slice(4);
  head.push({
    name: "Lainnya",
    today: rest.reduce((sum, row) => sum + row.today, 0),
    week: rest.reduce((sum, row) => sum + row.week, 0),
    month: rest.reduce((sum, row) => sum + row.month, 0),
  });
  return head;
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

export type ShiftDeskRow = {
  id: string;
  userId: string;
  cashierName: string;
  cashierRole: string;
  openingAt: string;
  closingAt: string | null;
  openingCash: string;
  closingCash: string | null;
  cashSales: string;
  difference: string | null;
  status: "open" | "closed";
  note: string | null;
  shiftNumber: string;
  trxCount: number;
  sales: string;
  cash: string;
  nonCash: string;
};

const SHIFT_PAGE = 10;

export async function shiftDesk(filters: {
  status?: string;
  date?: string;
  cashierId?: string;
  search?: string;
  page?: number;
  id?: string;
}) {
  const sql = getSql();
  const [kpi] = await sql<{
    open_count: number;
    closed_today: number;
    duration_seconds: string;
    cash_today: string;
    cash_yesterday: string;
  }[]>`
    SELECT
      (SELECT COUNT(*)::int FROM shifts WHERE status = 'open') AS open_count,
      (SELECT COUNT(*)::int FROM shifts
        WHERE status = 'closed'
          AND (closing_at AT TIME ZONE 'Asia/Jakarta')::date = (now() AT TIME ZONE 'Asia/Jakarta')::date) AS closed_today,
      (SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(closing_at, now()) - opening_at))), 0)::text
        FROM shifts
        WHERE (opening_at AT TIME ZONE 'Asia/Jakarta')::date = (now() AT TIME ZONE 'Asia/Jakarta')::date) AS duration_seconds,
      (SELECT COALESCE(SUM(t.total), 0)::text
        FROM transactions t
        JOIN payments p ON p.transaction_id = t.id
        WHERE t.status = 'completed' AND p.method = 'cash'
          AND (t.created_at AT TIME ZONE 'Asia/Jakarta')::date = (now() AT TIME ZONE 'Asia/Jakarta')::date) AS cash_today,
      (SELECT COALESCE(SUM(t.total), 0)::text
        FROM transactions t
        JOIN payments p ON p.transaction_id = t.id
        WHERE t.status = 'completed' AND p.method = 'cash'
          AND (t.created_at AT TIME ZONE 'Asia/Jakarta')::date = ((now() AT TIME ZONE 'Asia/Jakarta')::date - 1)) AS cash_yesterday
  `;
  const raw = await sql<{
    id: string;
    user_id: string;
    cashier_name: string;
    cashier_role: string;
    opening_at: Date;
    closing_at: Date | null;
    opening_cash: string;
    closing_cash: string | null;
    cash_sales: string;
    difference: string | null;
    status: string;
    note: string | null;
    shift_number: string;
    trx_count: number;
    sales: string;
    cash: string;
    non_cash: string;
  }[]>`
    WITH numbered AS (
      SELECT
        s.id,
        s.user_id,
        u.name AS cashier_name,
        u.role::text AS cashier_role,
        s.opening_at,
        s.closing_at,
        s.opening_cash::text AS opening_cash,
        s.closing_cash::text AS closing_cash,
        s.cash_sales::text AS cash_sales,
        s.difference::text AS difference,
        s.status::text AS status,
        s.note,
        'SH-' || to_char(s.opening_at AT TIME ZONE 'Asia/Jakarta', 'YYYYMMDD') || '-' ||
          lpad(row_number() OVER (
            PARTITION BY (s.opening_at AT TIME ZONE 'Asia/Jakarta')::date
            ORDER BY s.opening_at, s.id
          )::text, 3, '0') AS shift_number
      FROM shifts s
      JOIN users u ON u.id = s.user_id
    ),
    sales AS (
      SELECT
        t.shift_id,
        COUNT(*) FILTER (WHERE t.status = 'completed')::int AS trx_count,
        COALESCE(SUM(t.total) FILTER (WHERE t.status = 'completed'), 0)::text AS sales,
        COALESCE(SUM(t.total) FILTER (WHERE t.status = 'completed' AND pay.method = 'cash'), 0)::text AS cash,
        COALESCE(SUM(t.total) FILTER (WHERE t.status = 'completed' AND pay.method IS DISTINCT FROM 'cash'), 0)::text AS non_cash
      FROM transactions t
      LEFT JOIN LATERAL (
        SELECT method FROM payments WHERE transaction_id = t.id ORDER BY created_at LIMIT 1
      ) pay ON true
      WHERE t.shift_id IS NOT NULL
      GROUP BY t.shift_id
    )
    SELECT
      n.*,
      COALESCE(sales.trx_count, 0) AS trx_count,
      COALESCE(sales.sales, '0') AS sales,
      COALESCE(sales.cash, '0') AS cash,
      COALESCE(sales.non_cash, '0') AS non_cash
    FROM numbered n
    LEFT JOIN sales ON sales.shift_id = n.id
    ORDER BY n.opening_at DESC
  `;
  const all: ShiftDeskRow[] = raw.map((row) => ({
    id: row.id,
    userId: row.user_id,
    cashierName: row.cashier_name,
    cashierRole: row.cashier_role,
    openingAt: new Date(row.opening_at).toISOString(),
    closingAt: row.closing_at ? new Date(row.closing_at).toISOString() : null,
    openingCash: row.opening_cash,
    closingCash: row.closing_cash,
    cashSales: row.cash_sales,
    difference: row.difference,
    status: row.status === "open" ? "open" : "closed",
    note: row.note,
    shiftNumber: row.shift_number,
    trxCount: Number(row.trx_count) || 0,
    sales: row.sales,
    cash: row.cash,
    nonCash: row.non_cash,
  }));
  const status = filters.status === "open" || filters.status === "closed" ? filters.status : "";
  const date = filters.date && /^\d{4}-\d{2}-\d{2}$/.test(filters.date) ? filters.date : "";
  const search = (filters.search || "").trim().toLowerCase();
  const filtered = all.filter((row) => {
    if (status && row.status !== status) return false;
    if (filters.cashierId && row.userId !== filters.cashierId) return false;
    if (date) {
      const opened = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(row.openingAt));
      if (opened !== date) return false;
    }
    if (search && !row.cashierName.toLowerCase().includes(search) && !row.shiftNumber.toLowerCase().includes(search)) return false;
    return true;
  });
  const page = Math.min(Math.max(1, filters.page || 1), Math.max(1, Math.ceil(filtered.length / SHIFT_PAGE)));
  const cashiers = [...new Map(all.map((row) => [row.userId, row.cashierName])).entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
  return {
    pageSize: SHIFT_PAGE,
    page,
    total: filtered.length,
    rows: filtered.slice((page - 1) * SHIFT_PAGE, page * SHIFT_PAGE),
    selected: filters.id ? (all.find((row) => row.id === filters.id) ?? null) : null,
    cashiers,
    kpi: {
      openCount: Number(kpi?.open_count) || 0,
      closedToday: Number(kpi?.closed_today) || 0,
      durationSeconds: Number(kpi?.duration_seconds) || 0,
      cashToday: num(kpi?.cash_today),
      cashYesterday: num(kpi?.cash_yesterday),
    },
  };
}

const REPORT_METHODS = ["cash", "qris", "debit", "credit", "ewallet"] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function reportToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

function reportDay(value: string | undefined, fallback: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

function shiftIso(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function asNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function dayText(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").slice(0, 10);
}

export async function reportDesk(filters: { from?: string; to?: string; cashierId?: string; method?: string }) {
  const sql = getSql();
  const today = reportToday();
  let from = reportDay(filters.from, today);
  let to = reportDay(filters.to, today);
  if (from > to) [from, to] = [to, from];
  const span = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
  const prevTo = shiftIso(from, -1);
  const prevFrom = shiftIso(from, -span);
  const cashier = filters.cashierId && UUID_RE.test(filters.cashierId) ? filters.cashierId : null;
  const method = REPORT_METHODS.includes(filters.method as (typeof REPORT_METHODS)[number]) ? filters.method! : null;

  const [kpiRows, hourRows, categoryRows, productRows, paymentRows, salesRows, cashierRows, taxRows, shiftRows, stockGoods, stockItems, cashierOptions] =
    await Promise.all([
      sql<{ trx: number; sales: number; discount: number; prev_trx: number; prev_sales: number; prev_discount: number }[]>`
        SELECT
          COUNT(*) FILTER (WHERE day BETWEEN ${from}::date AND ${to}::date)::int AS trx,
          COALESCE(SUM(total) FILTER (WHERE day BETWEEN ${from}::date AND ${to}::date), 0)::float8 AS sales,
          COALESCE(SUM(discount) FILTER (WHERE day BETWEEN ${from}::date AND ${to}::date), 0)::float8 AS discount,
          COUNT(*) FILTER (WHERE day BETWEEN ${prevFrom}::date AND ${prevTo}::date)::int AS prev_trx,
          COALESCE(SUM(total) FILTER (WHERE day BETWEEN ${prevFrom}::date AND ${prevTo}::date), 0)::float8 AS prev_sales,
          COALESCE(SUM(discount) FILTER (WHERE day BETWEEN ${prevFrom}::date AND ${prevTo}::date), 0)::float8 AS prev_discount
        FROM (
          SELECT
            (t.created_at AT TIME ZONE 'Asia/Jakarta')::date AS day,
            t.total,
            t.discount
          FROM transactions t
          LEFT JOIN LATERAL (
            SELECT method FROM payments WHERE transaction_id = t.id ORDER BY created_at LIMIT 1
          ) pay ON true
          WHERE t.status = 'completed'
            AND (t.created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${prevFrom}::date AND ${to}::date
            AND (${cashier}::uuid IS NULL OR t.user_id = ${cashier}::uuid)
            AND (${method}::text IS NULL OR pay.method::text = ${method})
        ) scoped
      `,
      sql<{ hour: number; trx: number; sales: number }[]>`
        SELECT
          EXTRACT(HOUR FROM (t.created_at AT TIME ZONE 'Asia/Jakarta'))::int AS hour,
          COUNT(*)::int AS trx,
          COALESCE(SUM(t.total), 0)::float8 AS sales
        FROM transactions t
        LEFT JOIN LATERAL (
          SELECT method FROM payments WHERE transaction_id = t.id ORDER BY created_at LIMIT 1
        ) pay ON true
        WHERE t.status = 'completed'
          AND (t.created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
          AND (${cashier}::uuid IS NULL OR t.user_id = ${cashier}::uuid)
          AND (${method}::text IS NULL OR pay.method::text = ${method})
        GROUP BY 1
        ORDER BY 1
      `,
      sql<{ name: string; revenue: number }[]>`
        SELECT
          COALESCE(c.name, 'Lainnya') AS name,
          COALESCE(SUM(ti.subtotal), 0)::float8 AS revenue
        FROM transaction_items ti
        JOIN transactions t ON t.id = ti.transaction_id
        LEFT JOIN products p ON p.id = ti.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN LATERAL (
          SELECT method FROM payments WHERE transaction_id = t.id ORDER BY created_at LIMIT 1
        ) pay ON true
        WHERE t.status = 'completed'
          AND (t.created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
          AND (${cashier}::uuid IS NULL OR t.user_id = ${cashier}::uuid)
          AND (${method}::text IS NULL OR pay.method::text = ${method})
        GROUP BY c.id, c.name
        ORDER BY revenue DESC
      `,
      sql<{ id: string; name: string; image: string | null; category: string; qty: number; revenue: number }[]>`
        SELECT
          ti.product_id::text AS id,
          ti.product_name AS name,
          p.image,
          COALESCE(c.name, 'Lainnya') AS category,
          SUM(ti.quantity)::int AS qty,
          COALESCE(SUM(ti.subtotal), 0)::float8 AS revenue
        FROM transaction_items ti
        JOIN transactions t ON t.id = ti.transaction_id
        LEFT JOIN products p ON p.id = ti.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN LATERAL (
          SELECT method FROM payments WHERE transaction_id = t.id ORDER BY created_at LIMIT 1
        ) pay ON true
        WHERE t.status = 'completed'
          AND (t.created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
          AND (${cashier}::uuid IS NULL OR t.user_id = ${cashier}::uuid)
          AND (${method}::text IS NULL OR pay.method::text = ${method})
        GROUP BY ti.product_id, ti.product_name, p.image, c.name
        ORDER BY revenue DESC, qty DESC
      `,
      sql<{ method: string; trx: number; total: number }[]>`
        SELECT pay.method::text AS method, COUNT(*)::int AS trx, COALESCE(SUM(t.total), 0)::float8 AS total
        FROM transactions t
        LEFT JOIN LATERAL (
          SELECT method FROM payments WHERE transaction_id = t.id ORDER BY created_at LIMIT 1
        ) pay ON true
        WHERE t.status = 'completed'
          AND pay.method IS NOT NULL
          AND (t.created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
          AND (${cashier}::uuid IS NULL OR t.user_id = ${cashier}::uuid)
          AND (${method}::text IS NULL OR pay.method::text = ${method})
        GROUP BY pay.method
      `,
      sql<{ day: string; trx: number; total: number }[]>`
        SELECT
          (t.created_at AT TIME ZONE 'Asia/Jakarta')::date::text AS day,
          COUNT(*)::int AS trx,
          COALESCE(SUM(t.total), 0)::float8 AS total
        FROM transactions t
        LEFT JOIN LATERAL (
          SELECT method FROM payments WHERE transaction_id = t.id ORDER BY created_at LIMIT 1
        ) pay ON true
        WHERE t.status = 'completed'
          AND (t.created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
          AND (${cashier}::uuid IS NULL OR t.user_id = ${cashier}::uuid)
          AND (${method}::text IS NULL OR pay.method::text = ${method})
        GROUP BY 1
        ORDER BY 1 DESC
      `,
      sql<{ name: string; trx: number; total: number }[]>`
        SELECT u.name, COUNT(*)::int AS trx, COALESCE(SUM(t.total), 0)::float8 AS total
        FROM transactions t
        JOIN users u ON u.id = t.user_id
        LEFT JOIN LATERAL (
          SELECT method FROM payments WHERE transaction_id = t.id ORDER BY created_at LIMIT 1
        ) pay ON true
        WHERE t.status = 'completed'
          AND (t.created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
          AND (${cashier}::uuid IS NULL OR t.user_id = ${cashier}::uuid)
          AND (${method}::text IS NULL OR pay.method::text = ${method})
        GROUP BY u.id, u.name
        ORDER BY total DESC
      `,
      sql<{ day: string; tax: number; service: number }[]>`
        SELECT
          (t.created_at AT TIME ZONE 'Asia/Jakarta')::date::text AS day,
          COALESCE(SUM(t.tax), 0)::float8 AS tax,
          COALESCE(SUM(t.service_charge), 0)::float8 AS service
        FROM transactions t
        LEFT JOIN LATERAL (
          SELECT method FROM payments WHERE transaction_id = t.id ORDER BY created_at LIMIT 1
        ) pay ON true
        WHERE t.status = 'completed'
          AND (t.created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
          AND (${cashier}::uuid IS NULL OR t.user_id = ${cashier}::uuid)
          AND (${method}::text IS NULL OR pay.method::text = ${method})
        GROUP BY 1
        ORDER BY 1 DESC
      `,
      sql<{
        cashier_name: string;
        opening_at: Date;
        closing_at: Date | null;
        opening_cash: number;
        cash_sales: number;
        closing_cash: number | null;
        difference: number | null;
      }[]>`
        SELECT
          u.name AS cashier_name,
          s.opening_at,
          s.closing_at,
          s.opening_cash::float8 AS opening_cash,
          s.cash_sales::float8 AS cash_sales,
          s.closing_cash::float8 AS closing_cash,
          s.difference::float8 AS difference
        FROM shifts s
        JOIN users u ON u.id = s.user_id
        WHERE (s.opening_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
          AND (${cashier}::uuid IS NULL OR s.user_id = ${cashier}::uuid)
          AND (
            ${method}::text IS NULL
            OR EXISTS (
              SELECT 1
              FROM transactions t
              LEFT JOIN LATERAL (
                SELECT method FROM payments WHERE transaction_id = t.id ORDER BY created_at LIMIT 1
              ) pay ON true
              WHERE t.shift_id = s.id
                AND t.status = 'completed'
                AND pay.method::text = ${method}
            )
          )
        ORDER BY s.opening_at DESC
      `,
      sql<{ name: string; sku: string; stock: number; minimum: number; value: number }[]>`
        SELECT name, sku, current_stock::float8 AS stock, minimum_stock::float8 AS minimum, (current_stock * cost)::float8 AS value
        FROM products WHERE kind = 'goods' ORDER BY name
      `,
      sql<{ name: string; sku: string; stock: number; minimum: number; value: number }[]>`
        SELECT name, sku, current_stock::float8 AS stock, minimum_stock::float8 AS minimum, (current_stock * cost)::float8 AS value
        FROM inventory_items ORDER BY name
      `,
      sql<{ id: string; name: string }[]>`
        SELECT id::text AS id, name FROM users WHERE is_active ORDER BY name
      `,
    ]);

  const kpi = kpiRows[0];
  const sales = asNumber(kpi?.sales);
  const trx = Number(kpi?.trx) || 0;
  const discount = asNumber(kpi?.discount);
  const prevSales = asNumber(kpi?.prev_sales);
  const prevTrx = Number(kpi?.prev_trx) || 0;
  const prevDiscount = asNumber(kpi?.prev_discount);
  const byHour = new Map(hourRows.map((row) => [Number(row.hour), { sales: asNumber(row.sales), trx: Number(row.trx) || 0 }]));
  let hourStart = 7;
  let hourEnd = 21;
  for (const [hour, row] of byHour) {
    if (row.sales > 0 || row.trx > 0) {
      hourStart = Math.min(hourStart, hour);
      hourEnd = Math.max(hourEnd, hour);
    }
  }
  const hours = Array.from({ length: hourEnd - hourStart + 1 }, (_, index) => {
    const hour = hourStart + index;
    const row = byHour.get(hour);
    return { hour, sales: row?.sales ?? 0, trx: row?.trx ?? 0 };
  });
  const paymentByMethod = new Map(paymentRows.map((row) => [row.method, { trx: Number(row.trx) || 0, total: asNumber(row.total) }]));

  return {
    from,
    to,
    cashierId: cashier ?? "",
    method: method ?? "",
    cashiers: cashierOptions.map((row) => ({ id: row.id, name: row.name })),
    kpi: {
      sales,
      trx,
      average: trx > 0 ? sales / trx : 0,
      discount,
      prevSales,
      prevTrx,
      prevAverage: prevTrx > 0 ? prevSales / prevTrx : 0,
      prevDiscount,
    },
    hours,
    categories: categoryRows.map((row) => ({ name: row.name, revenue: asNumber(row.revenue) })).filter((row) => row.revenue > 0),
    products: productRows.map((row) => ({
      id: row.id,
      name: row.name,
      image: row.image,
      category: row.category,
      qty: Number(row.qty) || 0,
      revenue: asNumber(row.revenue),
    })),
    payments: REPORT_METHODS.map((item) => ({
      method: item,
      trx: paymentByMethod.get(item)?.trx ?? 0,
      total: paymentByMethod.get(item)?.total ?? 0,
    })),
    sales: salesRows.map((row) => ({ date: dayText(row.day), trx: Number(row.trx) || 0, total: asNumber(row.total) })),
    cashierRows: cashierRows.map((row) => ({ name: row.name, trx: Number(row.trx) || 0, total: asNumber(row.total) })),
    tax: taxRows.map((row) => ({ date: dayText(row.day), tax: asNumber(row.tax), service: asNumber(row.service) })),
    shifts: shiftRows.map((row) => ({
      cashier: row.cashier_name,
      openingAt: new Date(row.opening_at).toISOString(),
      closingAt: row.closing_at ? new Date(row.closing_at).toISOString() : null,
      openingCash: asNumber(row.opening_cash),
      cashSales: asNumber(row.cash_sales),
      closingCash: row.closing_cash == null ? null : asNumber(row.closing_cash),
      difference: row.difference == null ? null : asNumber(row.difference),
    })),
    stock: [
      ...stockGoods.map((row) => ({
        kind: "Barang",
        name: row.name,
        sku: row.sku,
        stock: asNumber(row.stock),
        minimum: asNumber(row.minimum),
        value: asNumber(row.value),
      })),
      ...stockItems.map((row) => ({
        kind: "Bahan",
        name: row.name,
        sku: row.sku,
        stock: asNumber(row.stock),
        minimum: asNumber(row.minimum),
        value: asNumber(row.value),
      })),
    ],
  };
}
