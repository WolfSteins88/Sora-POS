import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import bcrypt from "bcryptjs";

const root = path.resolve(import.meta.dirname, "..");
const envFile = path.join(root, ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL di .env.local");
  process.exit(1);
}

const parsed = new URL(url);
const dbName = parsed.pathname.replace(/^\//, "") || "umkm_pos";
const adminUrl = new URL(url);
adminUrl.pathname = "/postgres";

const admin = postgres(adminUrl.toString(), { max: 1 });
try {
  const exists = await admin`SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
  if (exists.length === 0) {
    await admin.unsafe(`CREATE DATABASE "${dbName}"`);
    console.log(`Created database ${dbName}`);
  }
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("password authentication failed")) {
    console.error("Gagal login PostgreSQL. Periksa DATABASE_URL di .env.local");
  }
  throw err;
} finally {
  await admin.end();
}

const sql = postgres(url, { max: 1 });
const migrationsDir = path.join(root, "supabase/migrations");
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();
for (const file of migrationFiles) {
  await sql.unsafe(fs.readFileSync(path.join(migrationsDir, file), "utf8"));
  console.log(`Applied ${file}`);
}

const passwordHash = bcrypt.hashSync("password123", 12);

async function ensureUser(role, name, username, email) {
  const [row] = await sql`SELECT id FROM users WHERE username = ${username}`;
  if (row) return row.id;
  const [created] = await sql`
    INSERT INTO users (role, name, username, email, password_hash, is_active)
    VALUES (${role}, ${name}, ${username}, ${email}, ${passwordHash}, true)
    RETURNING id
  `;
  return created.id;
}

await ensureUser("ADMIN", "Administrator", "admin", "admin@umkmpos.local");
await ensureUser("MANAGER", "Manajer Toko", "manager", "manager@umkmpos.local");
await ensureUser("CASHIER", "Kasir Satu", "cashier", "cashier@umkmpos.local");

async function upsertSetting(key, value, onlyIfMissing = false) {
  const [row] = await sql`SELECT setting_value FROM settings WHERE setting_key = ${key}`;
  if (!row) {
    await sql`INSERT INTO settings (setting_key, setting_value) VALUES (${key}, ${value})`;
    return;
  }
  if (onlyIfMissing) return;
  if (key === "shop_name" && row.setting_value === "Toko Maju Jaya") {
    await sql`UPDATE settings SET setting_value = ${value} WHERE setting_key = ${key}`;
  }
}

const settings = [
  ["shop_name", "COCO Coffee Shop", false],
  ["shop_address", "Jl. Merdeka No. 10, Jakarta", true],
  ["shop_phone", "0812-3456-7890", true],
  ["shop_email", "hello@cococoffee.local", true],
  ["shop_logo", "", true],
  ["receipt_footer", "Thank You, See You Again!", true],
  ["tax_percent", "0", true],
  ["service_charge_percent", "0", true],
  ["currency", "Rp", true],
  ["receipt_paper_size", "80mm", true],
  ["allow_negative_stock", "0", true],
  ["theme_default", "light", true],
  ["shop_mode", "mixed", true],
];
for (const [k, v, missing] of settings) await upsertSetting(k, v, missing);

const printers = await sql`SELECT count(*)::int AS c FROM printers`;
if (printers[0].c === 0) {
  await sql`
    INSERT INTO printers (name, type, paper_size, connection_mode, ble_service_uuid, ble_characteristic_uuid, bridge_url, is_default, status)
    VALUES ('Kasir Utama', 'thermal', '80mm', 'web_bluetooth', '000018f0-0000-1000-8000-00805f9b34fb', '00002af1-0000-1000-8000-00805f9b34fb', 'http://127.0.0.1:9100', true, 'active')
  `;
}

await sql`UPDATE products SET status = 'inactive' WHERE sku IN ('MN-001', 'MK-001')`;

async function category(name, description, pack, sort) {
  const [row] = await sql`SELECT id FROM categories WHERE name = ${name} AND catalog_pack = ${pack}`;
  if (row) return row.id;
  const [created] = await sql`
    INSERT INTO categories (name, description, status, sort_order, catalog_pack)
    VALUES (${name}, ${description}, 'active', ${sort}, ${pack})
    RETURNING id
  `;
  return created.id;
}

async function product(opts) {
  const [row] = await sql`SELECT id FROM products WHERE sku = ${opts.sku}`;
  if (row) {
    await sql`UPDATE products SET catalog_pack = ${opts.pack}, status = 'active' WHERE id = ${row.id}`;
    return row.id;
  }
  const [created] = await sql`
    INSERT INTO products (
      category_id, kind, name, sku, description, price, cost, status, stock_status,
      current_stock, minimum_stock, is_featured, sort_order, catalog_pack
    ) VALUES (
      ${opts.categoryId}, ${opts.kind}, ${opts.name}, ${opts.sku}, ${opts.description},
      ${opts.price}, ${opts.cost}, 'active', ${opts.stockStatus || "available"},
      ${opts.stock ?? 0}, ${opts.min ?? 0}, ${!!opts.featured}, ${opts.sort || 0}, ${opts.pack}
    )
    RETURNING id
  `;
  return created.id;
}

const coffee = await category("Coffee", "Espresso based coffee drinks", "fnb", 1);
const nonCoffee = await category("Non Coffee", "Non coffee beverages", "fnb", 2);
const tea = await category("Tea", "Tea based drinks", "fnb", 3);
const food = await category("Food", "Main food menu", "fnb", 4);
const snack = await category("Snack", "Light snacks and pastry", "fnb", 5);
const sembako = await category("Sembako", "Barang kemasan dan kebutuhan harian", "retail", 1);
const rumah = await category("Rumah Tangga", "Kebutuhan rumah tangga", "retail", 2);

const icedLatte = await product({
  categoryId: coffee, kind: "recipe", name: "Iced Latte", sku: "CF-001",
  description: "Espresso with fresh milk over ice", price: 28000, cost: 12000, featured: true, sort: 1, pack: "fnb",
});
const cappuccino = await product({
  categoryId: coffee, kind: "recipe", name: "Cappuccino", sku: "CF-002",
  description: "Espresso with steamed milk foam", price: 27000, cost: 11500, sort: 2, pack: "fnb",
});
const americano = await product({
  categoryId: coffee, kind: "recipe", name: "Americano", sku: "CF-003",
  description: "Espresso with hot water", price: 25000, cost: 9000, sort: 3, pack: "fnb",
});
await product({
  categoryId: coffee, kind: "goods", name: "Espresso", sku: "CF-004",
  description: "Double shot espresso", price: 20000, cost: 7000, stock: 40, min: 8, sort: 4, pack: "fnb",
});
await product({
  categoryId: nonCoffee, kind: "goods", name: "Chocolate Milk", sku: "NC-001",
  description: "Rich chocolate milk drink", price: 26000, cost: 10000, stock: 30, min: 6, sort: 1, pack: "fnb",
});
const matcha = await product({
  categoryId: nonCoffee, kind: "recipe", name: "Matcha Latte", sku: "NC-002",
  description: "Japanese matcha with milk", price: 29000, cost: 12000, sort: 2, pack: "fnb",
});
const lemonTea = await product({
  categoryId: tea, kind: "recipe", name: "Lemon Tea", sku: "TH-001",
  description: "Refreshing lemon tea", price: 22000, cost: 7000, sort: 1, pack: "fnb",
});
await product({
  categoryId: tea, kind: "goods", name: "Thai Tea", sku: "TH-002",
  description: "Sweet Thai style milk tea", price: 24000, cost: 8500, stock: 28, min: 6, sort: 2, pack: "fnb",
});
await product({
  categoryId: food, kind: "goods", name: "Chicken Sandwich", sku: "FD-001",
  description: "Grilled chicken sandwich", price: 32000, cost: 15000, stock: 18, min: 4, sort: 1, pack: "fnb",
});
await product({
  categoryId: food, kind: "goods", name: "Beef Burger", sku: "FD-002",
  description: "Homemade beef burger", price: 38000, cost: 18000, stock: 16, min: 4, sort: 2, pack: "fnb",
});
await product({
  categoryId: snack, kind: "goods", name: "Croissant", sku: "SN-001",
  description: "Butter croissant", price: 18000, cost: 7000, stock: 20, min: 5, sort: 1, pack: "fnb",
});
await product({
  categoryId: snack, kind: "goods", name: "Banana Cake", sku: "SN-002",
  description: "Moist banana cake slice", price: 16000, cost: 6000, stock: 0, min: 4, stockStatus: "sold_out", sort: 2, pack: "fnb",
});

await product({
  categoryId: sembako, kind: "goods", name: "Minyak Goreng 1L", sku: "RT-001",
  description: "Minyak goreng kemasan 1 liter", price: 18000, cost: 14000, stock: 36, min: 8, sort: 1, pack: "retail",
});
await product({
  categoryId: sembako, kind: "goods", name: "Gula 1kg", sku: "RT-002",
  description: "Gula pasir kemasan 1 kg", price: 16000, cost: 12000, stock: 40, min: 10, sort: 2, pack: "retail",
});
await product({
  categoryId: sembako, kind: "goods", name: "Mie Instan", sku: "RT-003",
  description: "Mie instan goreng", price: 3500, cost: 2500, stock: 120, min: 24, sort: 3, pack: "retail",
});
await product({
  categoryId: sembako, kind: "goods", name: "Kopi Sachet", sku: "RT-004",
  description: "Kopi instant sachet", price: 2000, cost: 1200, stock: 80, min: 20, sort: 4, pack: "retail",
});
await product({
  categoryId: rumah, kind: "goods", name: "Sabun Cuci", sku: "RT-005",
  description: "Sabun cuci piring 800ml", price: 12000, cost: 8000, stock: 24, min: 6, sort: 1, pack: "retail",
});
await product({
  categoryId: rumah, kind: "goods", name: "Tissue", sku: "RT-006",
  description: "Tissue dapur 2 ply", price: 9000, cost: 6000, stock: 30, min: 8, sort: 2, pack: "retail",
});

const keepSkus = [
  "CF-001", "CF-002", "CF-003", "CF-004",
  "NC-001", "NC-002", "TH-001", "TH-002",
  "FD-001", "FD-002", "SN-001", "SN-002",
  "RT-001", "RT-002", "RT-003", "RT-004", "RT-005", "RT-006",
];
await sql`UPDATE products SET status = 'inactive' WHERE NOT (sku = ANY(${keepSkus}))`;
await sql`
  UPDATE categories SET status = 'inactive'
  WHERE NOT (
    (name = 'Coffee' AND catalog_pack = 'fnb')
    OR (name = 'Non Coffee' AND catalog_pack = 'fnb')
    OR (name = 'Tea' AND catalog_pack = 'fnb')
    OR (name = 'Food' AND catalog_pack = 'fnb')
    OR (name = 'Snack' AND catalog_pack = 'fnb')
    OR (name = 'Sembako' AND catalog_pack = 'retail')
    OR (name = 'Rumah Tangga' AND catalog_pack = 'retail')
  )
`;

async function addon(name, price, sort) {
  const [row] = await sql`SELECT id FROM addons WHERE name = ${name}`;
  if (row) return row.id;
  const [created] = await sql`
    INSERT INTO addons (name, price, status, sort_order) VALUES (${name}, ${price}, 'active', ${sort}) RETURNING id
  `;
  return created.id;
}
const extraShot = await addon("Extra Shot", 8000, 1);
const caramel = await addon("Caramel", 5000, 2);
const vanilla = await addon("Vanilla", 5000, 3);
const extraMilk = await addon("Extra Milk", 4000, 4);

async function linkAddon(productId, addonId) {
  const [row] = await sql`SELECT id FROM product_addons WHERE product_id = ${productId} AND addon_id = ${addonId}`;
  if (!row) await sql`INSERT INTO product_addons (product_id, addon_id) VALUES (${productId}, ${addonId})`;
}
for (const a of [extraShot, caramel, vanilla, extraMilk]) {
  await linkAddon(icedLatte, a);
  await linkAddon(cappuccino, a);
}
await linkAddon(americano, extraShot);
await linkAddon(americano, caramel);
await linkAddon(americano, vanilla);
await linkAddon(matcha, caramel);
await linkAddon(matcha, vanilla);
await linkAddon(matcha, extraMilk);

async function ensureVariant(productId, name, required, sort, options) {
  let [v] = await sql`SELECT id FROM product_variants WHERE product_id = ${productId} AND name = ${name}`;
  if (!v) {
    [v] = await sql`
      INSERT INTO product_variants (product_id, name, is_required, sort_order)
      VALUES (${productId}, ${name}, ${required}, ${sort}) RETURNING id
    `;
  }
  for (let i = 0; i < options.length; i++) {
    const o = options[i];
    const [ex] = await sql`SELECT id FROM product_variant_options WHERE variant_id = ${v.id} AND name = ${o.name}`;
    if (!ex) {
      await sql`
        INSERT INTO product_variant_options (variant_id, name, price_adjustment, is_default, sort_order)
        VALUES (${v.id}, ${o.name}, ${o.price}, ${!!o.def}, ${i + 1})
      `;
    }
  }
}
await ensureVariant(icedLatte, "Size", true, 1, [{ name: "Regular", price: 0, def: true }, { name: "Large", price: 5000 }]);
await ensureVariant(icedLatte, "Temperature", true, 2, [{ name: "Hot", price: 0 }, { name: "Ice", price: 0, def: true }]);
await ensureVariant(icedLatte, "Sugar", false, 3, [{ name: "Normal", price: 0, def: true }, { name: "Less Sugar", price: 0 }, { name: "No Sugar", price: 0 }]);
await ensureVariant(cappuccino, "Size", true, 1, [{ name: "Regular", price: 0, def: true }, { name: "Large", price: 5000 }]);
await ensureVariant(americano, "Size", true, 1, [{ name: "Regular", price: 0, def: true }, { name: "Large", price: 4000 }]);

async function inv(name, sku, unit, stock, min, cost) {
  const [row] = await sql`SELECT id FROM inventory_items WHERE sku = ${sku}`;
  if (row) return row.id;
  const [created] = await sql`
    INSERT INTO inventory_items (name, sku, unit, current_stock, minimum_stock, cost, status)
    VALUES (${name}, ${sku}, ${unit}, ${stock}, ${min}, ${cost}, 'active') RETURNING id
  `;
  return created.id;
}
const bean = await inv("Coffee Bean", "COF-ING-001", "g", 5000, 500, 250);
const milk = await inv("Fresh Milk", "COF-ING-002", "ml", 10000, 1000, 15);
const ice = await inv("Ice Cube", "COF-ING-003", "g", 20000, 2000, 2);
const cup = await inv("Cup 12oz", "COF-ING-004", "pcs", 300, 50, 800);
const matchaP = await inv("Matcha Powder", "COF-ING-005", "g", 1000, 100, 400);
await inv("Chocolate Syrup", "COF-ING-006", "ml", 3000, 300, 90);
const teaLeaf = await inv("Tea Leaves", "COF-ING-007", "g", 2000, 200, 150);
const syrup = await inv("Sugar Syrup", "COF-ING-008", "ml", 4000, 400, 30);

async function recipe(productId, items) {
  let [r] = await sql`SELECT id FROM recipes WHERE product_id = ${productId}`;
  if (!r) {
    [r] = await sql`INSERT INTO recipes (product_id) VALUES (${productId}) RETURNING id`;
  }
  for (const item of items) {
    const [ex] = await sql`SELECT id FROM recipe_items WHERE recipe_id = ${r.id} AND inventory_item_id = ${item.id}`;
    if (!ex) {
      await sql`INSERT INTO recipe_items (recipe_id, inventory_item_id, quantity) VALUES (${r.id}, ${item.id}, ${item.qty})`;
    }
  }
}
await recipe(icedLatte, [{ id: bean, qty: 18 }, { id: milk, qty: 150 }, { id: ice, qty: 100 }, { id: cup, qty: 1 }]);
await recipe(cappuccino, [{ id: bean, qty: 18 }, { id: milk, qty: 120 }, { id: cup, qty: 1 }]);
await recipe(americano, [{ id: bean, qty: 18 }, { id: cup, qty: 1 }]);
await recipe(matcha, [{ id: matchaP, qty: 15 }, { id: milk, qty: 150 }, { id: cup, qty: 1 }]);
await recipe(lemonTea, [{ id: teaLeaf, qty: 5 }, { id: syrup, qty: 20 }, { id: cup, qty: 1 }]);

await sql.end();
console.log("Seed ready: F&B coffee shop + retail goods. Users admin/manager/cashier password123");
