"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getDb } from "@/lib/db";
import { getSql } from "@/lib/db";
import { parseIdNumber } from "@/lib/format";
import { saveUpload } from "@/lib/images/save-local";
import { getSetting } from "@/lib/settings";
import { restoreBackupDump, type BackupDump } from "@/lib/backup";
import { nextSku, skuPrefixForProduct } from "@/lib/sku";
import { normalizeShopMode } from "@/lib/theme";
import {
  addons,
  categories,
  heldOrders,
  inventoryItems,
  inventoryMovements,
  printers,
  productAddons,
  productVariantOptions,
  productVariants,
  products,
  recipeItems,
  recipes,
  settings,
  shifts,
  transactions,
  users,
} from "@/lib/schema";
import { cancelTransaction, checkoutTransaction, type CartItemInput } from "@/server/checkout";
import { getOpenShift, writeUnlockedRecipeCosts } from "@/server/queries";

function guard(role: string, module: Parameters<typeof can>[1]) {
  if (!can(role as "ADMIN" | "MANAGER" | "CASHIER", module)) {
    throw new Error("Forbidden");
  }
}

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function num(form: FormData, key: string) {
  return parseIdNumber(form.get(key) as string);
}

export async function saveCategory(formData: FormData) {
  const session = await requireSession();
  guard(session.role, "categories");
  const db = getDb();
  const id = str(formData, "id");
  const values = {
    name: str(formData, "name"),
    description: str(formData, "description") || null,
    status: (str(formData, "status") === "inactive" ? "inactive" : "active") as "active" | "inactive",
    sortOrder: Math.floor(num(formData, "sortOrder")),
    catalogPack: (str(formData, "catalogPack") === "retail" ? "retail" : "fnb") as "fnb" | "retail",
    updatedAt: new Date(),
  };
  if (!values.name) throw new Error("Nama kategori wajib.");
  const file = formData.get("image");
  const imageFile = file instanceof File ? file : null;
  if (id) {
    const [existing] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    const image = await saveUpload(imageFile, "categories", existing?.image);
    await db.update(categories).set({ ...values, catalogPack: existing?.catalogPack ?? values.catalogPack, image }).where(eq(categories.id, id));
  } else {
    const image = await saveUpload(imageFile, "categories");
    await db.insert(categories).values({ ...values, image });
  }
  revalidatePath("/categories");
  revalidatePath("/pos");
}

export async function deleteCategory(formData: FormData) {
  const session = await requireSession();
  guard(session.role, "categories");
  const id = str(formData, "id");
  await getDb().delete(categories).where(eq(categories.id, id));
  revalidatePath("/categories");
}

export async function saveProduct(formData: FormData) {
  const session = await requireSession();
  guard(session.role, "products");
  const db = getDb();
  const id = str(formData, "id");
  let catalogPack = (str(formData, "catalogPack") === "retail" ? "retail" : "fnb") as "fnb" | "retail";
  let kind = str(formData, "kind") === "recipe" ? "recipe" : "goods";
  if (catalogPack === "retail") kind = "goods";
  const currentStock = kind === "goods" ? num(formData, "currentStock") : 0;
  const values = {
    categoryId: str(formData, "categoryId"),
    kind: kind as "goods" | "recipe",
    name: str(formData, "name"),
    sku: str(formData, "sku"),
    description: str(formData, "description") || null,
    price: String(num(formData, "price")),
    cost: String(num(formData, "cost")),
    status: (str(formData, "status") === "inactive" ? "inactive" : "active") as "active" | "inactive",
    stockStatus: (kind === "goods"
      ? currentStock <= 0 || str(formData, "stockStatus") === "sold_out"
        ? "sold_out"
        : "available"
      : str(formData, "stockStatus") === "sold_out"
        ? "sold_out"
        : "available") as "available" | "sold_out",
    currentStock: String(currentStock),
    minimumStock: String(kind === "goods" ? num(formData, "minimumStock") : 0),
    catalogPack,
    isFeatured: str(formData, "isFeatured") === "1",
    sortOrder: Math.floor(num(formData, "sortOrder")),
    updatedAt: new Date(),
  };
  if (!values.name || !values.categoryId) {
    throw new Error("Nama dan kategori wajib.");
  }
  const [category] = await db.select().from(categories).where(eq(categories.id, values.categoryId)).limit(1);
  const file = formData.get("image");
  const imageFile = file instanceof File ? file : null;
  if (id) {
    const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!existing) throw new Error("Produk tidak ditemukan.");
    catalogPack = existing.catalogPack;
    values.catalogPack = existing.catalogPack;
    values.sku = existing.sku;
    if (catalogPack === "retail") {
      values.kind = "goods";
      values.currentStock = String(num(formData, "currentStock"));
      values.minimumStock = String(num(formData, "minimumStock"));
    }
    if (!category || category.catalogPack !== catalogPack) {
      throw new Error("Kategori tidak cocok dengan katalog.");
    }
    const image = await saveUpload(imageFile, "products", existing.image);
    await db.update(products).set({ ...values, image }).where(eq(products.id, id));
    revalidatePath("/products");
    revalidatePath("/pos");
    revalidatePath(`/products/${id}`);
    return;
  }
  if (!category || category.catalogPack !== catalogPack) {
    throw new Error("Kategori tidak cocok dengan katalog.");
  }
  if (!values.sku) {
    const rows = await db.select({ sku: products.sku }).from(products);
    values.sku = nextSku(rows.map((row) => row.sku), skuPrefixForProduct(catalogPack));
  }
  const image = await saveUpload(imageFile, "products");
  const [created] = await db.insert(products).values({ ...values, image }).returning({ id: products.id });
  revalidatePath("/products");
  revalidatePath("/pos");
  if (str(formData, "next") === "desk") {
    const packQuery = catalogPack === "retail" ? "&pack=retail" : "";
    redirect(`/products?edit=${created.id}&id=${created.id}${packQuery}`);
  }
  redirect(`/products/${created.id}`);
}

export async function deleteProduct(formData: FormData) {
  const session = await requireSession();
  guard(session.role, "products");
  await getDb().delete(products).where(eq(products.id, str(formData, "id")));
  revalidatePath("/products");
  revalidatePath("/pos");
  if (str(formData, "next") === "desk") redirect("/products");
}

export async function toggleProductStatus(formData: FormData) {
  const session = await requireSession();
  guard(session.role, "products");
  const id = str(formData, "id");
  const status = str(formData, "status") === "inactive" ? "inactive" : "active";
  await getDb().update(products).set({ status, updatedAt: new Date() }).where(eq(products.id, id));
  revalidatePath("/products");
  revalidatePath("/pos");
}

export async function saveVariants(productId: string, raw: string) {
  const session = await requireSession();
  guard(session.role, "products");
  const parsed = JSON.parse(raw) as Array<{
    name: string;
    isRequired: boolean;
    options: { name: string; priceAdjustment: number; isDefault: boolean }[];
  }>;
  const db = getDb();
  const sql = getSql();
  const existing = await db.select().from(productVariants).where(eq(productVariants.productId, productId));
  for (const v of existing) {
    await db.delete(productVariantOptions).where(eq(productVariantOptions.variantId, v.id));
  }
  await db.delete(productVariants).where(eq(productVariants.productId, productId));
  let i = 0;
  for (const variant of parsed) {
    if (!variant.name) continue;
    const [row] = await sql`
      INSERT INTO product_variants (product_id, name, is_required, sort_order)
      VALUES (${productId}, ${variant.name}, ${!!variant.isRequired}, ${i++})
      RETURNING id
    `;
    let j = 0;
    for (const opt of variant.options ?? []) {
      if (!opt.name) continue;
      await sql`
        INSERT INTO product_variant_options (variant_id, name, price_adjustment, is_default, sort_order)
        VALUES (${row.id}, ${opt.name}, ${Number(opt.priceAdjustment) || 0}, ${!!opt.isDefault}, ${j++})
      `;
    }
  }
  revalidatePath(`/products/${productId}`);
  revalidatePath("/products");
}

export async function saveProductAddons(productId: string, addonIds: string[]) {
  const session = await requireSession();
  guard(session.role, "products");
  const db = getDb();
  await db.delete(productAddons).where(eq(productAddons.productId, productId));
  for (const addonId of addonIds) {
    await db.insert(productAddons).values({ productId, addonId });
  }
  revalidatePath(`/products/${productId}`);
  revalidatePath("/products");
}

export async function saveAddon(formData: FormData) {
  const session = await requireSession();
  guard(session.role, "products");
  const db = getDb();
  const id = str(formData, "id");
  const values = {
    name: str(formData, "name"),
    price: String(num(formData, "price")),
    status: (str(formData, "status") === "inactive" ? "inactive" : "active") as "active" | "inactive",
    sortOrder: Math.floor(num(formData, "sortOrder")),
    updatedAt: new Date(),
  };
  if (!values.name) throw new Error("Nama add-on wajib.");
  if (id) await db.update(addons).set(values).where(eq(addons.id, id));
  else await db.insert(addons).values(values);
  revalidatePath("/products/addons");
}

export async function deleteAddon(formData: FormData) {
  const session = await requireSession();
  guard(session.role, "products");
  await getDb().delete(addons).where(eq(addons.id, str(formData, "id")));
  revalidatePath("/products/addons");
}

export async function saveInventoryItem(formData: FormData) {
  const session = await requireSession();
  guard(session.role, "inventory");
  const db = getDb();
  const id = str(formData, "id");
  const unit = str(formData, "unit") || "pcs";
  const values = {
    name: str(formData, "name"),
    sku: str(formData, "sku"),
    unit: unit as "g" | "kg" | "ml" | "liter" | "pcs",
    currentStock: String(num(formData, "currentStock")),
    minimumStock: String(num(formData, "minimumStock")),
    cost: String(num(formData, "cost")),
    status: (str(formData, "status") === "inactive" ? "inactive" : "active") as "active" | "inactive",
    updatedAt: new Date(),
  };
  if (!values.name) throw new Error("Nama wajib.");
  if (id) {
    const [existing] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1);
    if (!existing) throw new Error("Bahan tidak ditemukan.");
    const { currentStock: _stock, ...rest } = values;
    await db.update(inventoryItems).set({ ...rest, sku: existing.sku }).where(eq(inventoryItems.id, id));
    await writeUnlockedRecipeCosts({ inventoryItemId: id });
  } else {
    if (!values.sku) {
      const rows = await db.select({ sku: inventoryItems.sku }).from(inventoryItems);
      values.sku = nextSku(rows.map((row) => row.sku), "ING");
    }
    await db.insert(inventoryItems).values(values);
  }
  revalidatePath("/inventory");
  revalidatePath("/printer");
}

export async function deleteInventoryItem(formData: FormData) {
  const session = await requireSession();
  guard(session.role, "inventory");
  await getDb().delete(inventoryItems).where(eq(inventoryItems.id, str(formData, "id")));
  revalidatePath("/inventory");
}

export async function moveInventory(formData: FormData) {
  const session = await requireSession();
  guard(session.role, "inventory");
  const id = str(formData, "id");
  const type = str(formData, "type") as "in" | "out" | "adjustment";
  const quantity = num(formData, "quantity");
  const note = str(formData, "note") || null;
  if (!["in", "out", "adjustment"].includes(type) || quantity <= 0) {
    throw new Error("Pergerakan stok tidak valid.");
  }
  const sql = getSql();
  await sql.begin(async (tx) => {
    const [item] = await tx<{ id: string; name: string; current_stock: string }[]>`
      SELECT id, name, current_stock::text FROM inventory_items WHERE id = ${id} FOR UPDATE
    `;
    if (!item) throw new Error("Bahan tidak ditemukan.");
    const before = Number(item.current_stock);
    let after = before;
    if (type === "in") after = before + quantity;
    else if (type === "out") after = before - quantity;
    else after = quantity;
    if (after < 0) throw new Error(`Stok '${item.name}' tidak boleh negatif.`);
    await tx`UPDATE inventory_items SET current_stock = ${after}, updated_at = NOW() WHERE id = ${id}`;
    await tx`
      INSERT INTO inventory_movements
        (inventory_item_id, type, quantity, stock_before, stock_after, reference, note, user_id)
      VALUES (${id}, ${type}, ${type === "adjustment" ? after - before : quantity}, ${before}, ${after}, 'manual', ${note}, ${session.id})
    `;
  });
  revalidatePath("/inventory");
}

export async function saveRecipe(productId: string, items: { inventoryItemId: string; quantity: number }[], note: string) {
  const session = await requireSession();
  guard(session.role, "recipes");
  const sql = getSql();
  await sql.begin(async (tx) => {
    let [recipe] = await tx<{ id: string }[]>`SELECT id FROM recipes WHERE product_id = ${productId}`;
    if (!recipe) {
      [recipe] = await tx`INSERT INTO recipes (product_id, note) VALUES (${productId}, ${note || null}) RETURNING id`;
    } else {
      await tx`UPDATE recipes SET note = ${note || null}, updated_at = NOW() WHERE id = ${recipe.id}`;
      await tx`DELETE FROM recipe_items WHERE recipe_id = ${recipe.id}`;
    }
    for (const item of items) {
      if (!item.inventoryItemId || !(item.quantity > 0)) continue;
      await tx`
        INSERT INTO recipe_items (recipe_id, inventory_item_id, quantity)
        VALUES (${recipe.id}, ${item.inventoryItemId}, ${item.quantity})
      `;
    }
  });
  await writeUnlockedRecipeCosts({ productId });
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${productId}`);
  revalidatePath("/printer");
  revalidatePath("/products");
}

export async function openShift(formData: FormData) {
  const session = await requireSession();
  guard(session.role, "shifts");
  const openingCash = num(formData, "openingCash");
  if (openingCash < 0) throw new Error("Modal awal tidak valid.");
  const existing = await getOpenShift(session.id);
  if (existing) throw new Error("Shift sudah terbuka.");
  await getDb().insert(shifts).values({
    userId: session.id,
    openingCash: String(openingCash),
    openingAt: new Date(),
    status: "open",
  });
  revalidatePath("/shifts");
  revalidatePath("/pos");
}

export async function closeShift(formData: FormData) {
  const session = await requireSession();
  guard(session.role, "shifts");
  const current = await getOpenShift(session.id);
  if (!current) throw new Error("Tidak ada shift yang terbuka.");
  const actual = num(formData, "actualCash");
  const expected = Number(current.openingCash) + Number(current.cashSales);
  await getDb()
    .update(shifts)
    .set({
      closingCash: String(actual),
      closingAt: new Date(),
      expectedCash: String(expected),
      difference: String(actual - expected),
      status: "closed",
      note: str(formData, "note") || null,
    })
    .where(eq(shifts.id, current.id));
  revalidatePath("/shifts");
}

function requireAdmin(role: string) {
  if (role !== "ADMIN") throw new Error("Forbidden");
}

export async function updateShiftAdmin(formData: FormData) {
  const session = await requireSession();
  requireAdmin(session.role);
  const id = str(formData, "id");
  if (!id) throw new Error("Shift tidak ditemukan.");
  const db = getDb();
  const [row] = await db.select().from(shifts).where(eq(shifts.id, id)).limit(1);
  if (!row) throw new Error("Shift tidak ditemukan.");
  const openingCash = num(formData, "openingCash");
  if (openingCash < 0) throw new Error("Modal awal tidak valid.");
  const cashSales = Number(row.cashSales);
  const note = str(formData, "note") || null;
  if (row.status === "closed") {
    const closingCash = num(formData, "closingCash");
    if (closingCash < 0) throw new Error("Kas tutup tidak valid.");
    const expected = openingCash + cashSales;
    await db
      .update(shifts)
      .set({
        openingCash: String(openingCash),
        closingCash: String(closingCash),
        expectedCash: String(expected),
        difference: String(closingCash - expected),
        note,
      })
      .where(eq(shifts.id, id));
  } else {
    await db
      .update(shifts)
      .set({
        openingCash: String(openingCash),
        note,
      })
      .where(eq(shifts.id, id));
  }
  revalidatePath("/shifts");
  revalidatePath("/pos");
  redirect("/shifts");
}

export async function deleteShiftAdmin(formData: FormData) {
  const session = await requireSession();
  requireAdmin(session.role);
  const id = str(formData, "id");
  if (!id) throw new Error("Shift tidak ditemukan.");
  const db = getDb();
  const [linked] = await db
    .select({ c: count() })
    .from(transactions)
    .where(eq(transactions.shiftId, id));
  if ((linked?.c ?? 0) > 0) {
    throw new Error("Tidak bisa menghapus shift yang masih punya transaksi. Pindahkan atau batalkan transaksi dulu.");
  }
  await db.delete(shifts).where(eq(shifts.id, id));
  revalidatePath("/shifts");
  revalidatePath("/pos");
  redirect("/shifts");
}

export async function checkoutAction(payload: {
  items: CartItemInput[];
  orderType: "dine_in" | "take_away";
  tableNumber?: string;
  customerName?: string;
  discount?: number;
  note?: string;
  payment: { method: string; amount?: number };
}) {
  const session = await requireSession();
  guard(session.role, "pos");
  const result = await checkoutTransaction(session.id, payload);
  revalidatePath("/pos");
  revalidatePath("/transactions");
  revalidatePath("/inventory");
  revalidatePath("/products");
  return result;
}

export async function holdOrderAction(label: string, cart: unknown) {
  const session = await requireSession();
  guard(session.role, "pos");
  await getDb().insert(heldOrders).values({
    userId: session.id,
    label: label.trim() || `Hold ${new Date().toLocaleTimeString("id-ID")}`,
    cartJson: cart as object,
  });
  revalidatePath("/pos");
}

export async function deleteHeldAction(id: string) {
  const session = await requireSession();
  guard(session.role, "pos");
  await getDb().delete(heldOrders).where(eq(heldOrders.id, id));
  revalidatePath("/pos");
}

export async function cancelTransactionAction(formData: FormData) {
  const session = await requireSession();
  guard(session.role, "transactions");
  await cancelTransaction(str(formData, "id"), session.id);
  revalidatePath("/transactions");
  revalidatePath("/inventory");
  revalidatePath("/products");
}

export async function saveUser(formData: FormData) {
  const session = await requireSession();
  guard(session.role, "users");
  const db = getDb();
  const id = str(formData, "id");
  const role = str(formData, "role") as "ADMIN" | "MANAGER" | "CASHIER";
  const values: Record<string, unknown> = {
    name: str(formData, "name"),
    username: str(formData, "username"),
    email: str(formData, "email") || null,
    role,
    isActive: str(formData, "isActive") !== "0",
    updatedAt: new Date(),
  };
  const password = str(formData, "password");
  if (!id && !password) throw new Error("Password wajib untuk pengguna baru.");
  if (password) values.passwordHash = await bcrypt.hash(password, 12);
  if (id) {
    await db.update(users).set(values).where(eq(users.id, id));
  } else {
    await db.insert(users).values(values as typeof users.$inferInsert);
  }
  revalidatePath("/users");
}

export async function resetUserPassword(formData: FormData) {
  const session = await requireSession();
  guard(session.role, "users");
  const hash = await bcrypt.hash(str(formData, "password") || "password123", 12);
  await getDb()
    .update(users)
    .set({ passwordHash: hash, updatedAt: new Date() })
    .where(eq(users.id, str(formData, "id")));
  revalidatePath("/users");
}

export async function deleteUser(formData: FormData) {
  const session = await requireSession();
  guard(session.role, "users");
  const id = str(formData, "id");
  if (id === session.id) throw new Error("Tidak bisa menghapus akun sendiri.");
  await getDb().delete(users).where(eq(users.id, id));
  revalidatePath("/users");
}

export async function saveSettings(formData: FormData) {
  const session = await requireSession();
  guard(session.role, "settings");
  const keys = [
    "shop_name",
    "shop_address",
    "shop_phone",
    "shop_email",
    "receipt_footer",
    "tax_percent",
    "service_charge_percent",
    "currency",
    "receipt_paper_size",
    "allow_negative_stock",
    "shop_mode",
    "ui_accent_color",
  ];
  const db = getDb();
  for (const key of keys) {
    if (!formData.has(key)) continue;
    let value = String(formData.get(key) ?? "");
    if (key === "tax_percent" || key === "service_charge_percent") {
      value = String(parseIdNumber(value));
    }
    if (key === "shop_mode") {
      value = value === "retail" ? "retail" : "fnb";
    }
    if (key === "ui_accent_color") {
      const hex = value.trim().toLowerCase();
      value = /^#[0-9a-f]{6}$/.test(hex) ? hex : "";
    }
    const [existing] = await db.select().from(settings).where(eq(settings.settingKey, key)).limit(1);
    if (existing) {
      await db.update(settings).set({ settingValue: value }).where(eq(settings.settingKey, key));
    } else {
      await db.insert(settings).values({ settingKey: key, settingValue: value });
    }
  }
  const logoFile = formData.get("logo");
  if (logoFile instanceof File && logoFile.size > 0) {
    const [logoRow] = await db.select().from(settings).where(eq(settings.settingKey, "shop_logo")).limit(1);
    const filename = await saveUpload(logoFile, "logo", logoRow?.settingValue);
    if (logoRow) {
      await db.update(settings).set({ settingValue: filename ?? "" }).where(eq(settings.settingKey, "shop_logo"));
    } else {
      await db.insert(settings).values({ settingKey: "shop_logo", settingValue: filename ?? "" });
    }
  }
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/pos");
  revalidatePath("/dashboard");
  revalidatePath("/products");
  redirect("/settings?saved=1");
}

export async function importBackup(formData: FormData) {
  const session = await requireSession();
  guard(session.role, "settings");
  if (str(formData, "confirm") !== "1") {
    throw new Error("Centang konfirmasi sebelum mengimpor.");
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Pilih berkas JSON cadangan.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Berkas terlalu besar (maksimal 8MB).");
  }
  let dump: BackupDump;
  try {
    dump = JSON.parse(await file.text()) as BackupDump;
  } catch {
    throw new Error("Berkas JSON tidak valid.");
  }
  await restoreBackupDump(dump, session.id);
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/pos");
  revalidatePath("/products");
  revalidatePath("/shifts");
  revalidatePath("/transactions");
  revalidatePath("/reports");
  redirect("/settings?imported=1");
}

export async function savePrinter(formData: FormData) {
  const session = await requireSession();
  guard(session.role, "printer");
  const db = getDb();
  const id = str(formData, "id");
  const values = {
    name: str(formData, "name") || "Kasir Utama",
    paperSize: (str(formData, "paperSize") === "58mm" ? "58mm" : "80mm") as "58mm" | "80mm",
    connectionMode: (str(formData, "connectionMode") === "local_bridge"
      ? "local_bridge"
      : "web_bluetooth") as "web_bluetooth" | "local_bridge",
    deviceName: str(formData, "deviceName") || null,
    bleServiceUuid: str(formData, "bleServiceUuid") || null,
    bleCharacteristicUuid: str(formData, "bleCharacteristicUuid") || null,
    bridgeUrl: str(formData, "bridgeUrl") || "http://127.0.0.1:9100",
    isDefault: true,
    status: "active" as const,
    updatedAt: new Date(),
  };
  if (id) await db.update(printers).set(values).where(eq(printers.id, id));
  else await db.insert(printers).values(values);
  revalidatePath("/printer");
}

export async function saveHppCalculator(payload: {
  productId: string;
  price: number;
  lines: {
    inventoryItemId?: string;
    quantity: number;
    cost: number;
    name?: string;
    sku?: string;
    unit?: string;
  }[];
}) {
  const session = await requireSession();
  if (session.role === "CASHIER") throw new Error("Forbidden");
  if (normalizeShopMode(await getSetting("shop_mode", "fnb")) !== "fnb") {
    throw new Error("Kalkulator HPP hanya untuk mode F&B.");
  }
  const productId = payload.productId;
  if (!productId) throw new Error("Produk wajib.");
  if (payload.price < 0) throw new Error("Harga jual tidak valid.");
  const db = getDb();
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product || product.kind !== "recipe" || product.catalogPack !== "fnb") {
    throw new Error("Hanya racikan F&B yang dihitung di sini.");
  }

  const sql = getSql();
  let hpp = 0;
  await sql.begin(async (tx) => {
    const recipeLines: { inventoryItemId: string; quantity: number; cost: number }[] = [];
    for (const line of payload.lines) {
      if (!(line.quantity > 0) || line.cost < 0) continue;
      let inventoryId = line.inventoryItemId ?? "";
      if (!inventoryId) {
        const name = (line.name ?? "").trim();
        const units = ["g", "kg", "ml", "liter", "pcs"] as const;
        const unit = units.includes(line.unit as (typeof units)[number]) ? (line.unit as (typeof units)[number]) : "pcs";
        if (!name) throw new Error("Nama bahan baru wajib.");
        const skuRows = await tx<{ sku: string }[]>`SELECT sku FROM inventory_items`;
        const sku = (line.sku ?? "").trim() || nextSku(skuRows.map((row) => row.sku), "ING");
        const [created] = await tx<{ id: string }[]>`
          INSERT INTO inventory_items (name, sku, unit, current_stock, minimum_stock, cost, status)
          VALUES (${name}, ${sku}, ${unit}, 0, 0, ${String(line.cost)}, 'active')
          RETURNING id
        `;
        inventoryId = created.id;
      } else {
        await tx`
          UPDATE inventory_items SET cost = ${String(line.cost)}, updated_at = NOW() WHERE id = ${inventoryId}
        `;
      }
      recipeLines.push({ inventoryItemId: inventoryId, quantity: line.quantity, cost: line.cost });
      hpp += line.quantity * line.cost;
    }
    if (recipeLines.length === 0) throw new Error("Isi bahan dulu.");

    let [recipe] = await tx<{ id: string }[]>`SELECT id FROM recipes WHERE product_id = ${productId}`;
    if (!recipe) {
      [recipe] = await tx`INSERT INTO recipes (product_id, note) VALUES (${productId}, null) RETURNING id`;
    } else {
      await tx`UPDATE recipes SET updated_at = NOW() WHERE id = ${recipe.id}`;
      await tx`DELETE FROM recipe_items WHERE recipe_id = ${recipe.id}`;
    }
    for (const item of recipeLines) {
      await tx`
        INSERT INTO recipe_items (recipe_id, inventory_item_id, quantity)
        VALUES (${recipe.id}, ${item.inventoryItemId}, ${String(item.quantity)})
      `;
    }
    await tx`
      UPDATE products
      SET cost = ${String(hpp)}, price = ${String(payload.price)}, updated_at = NOW()
      WHERE id = ${productId}
    `;
  });

  revalidatePath("/printer");
  revalidatePath("/products");
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${productId}`);
  revalidatePath("/inventory");
  revalidatePath("/pos");
}

export async function toggleRecipeCostLock(formData: FormData) {
  const session = await requireSession();
  if (session.role === "CASHIER") throw new Error("Forbidden");
  const productId = str(formData, "productId");
  if (!productId) throw new Error("Produk wajib.");
  await getSql()`
    UPDATE recipes
    SET cost_locked = NOT cost_locked, updated_at = NOW()
    WHERE product_id = ${productId}
  `;
  revalidatePath("/printer");
}
