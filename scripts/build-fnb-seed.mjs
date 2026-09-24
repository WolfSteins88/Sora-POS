import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function id(name) {
  const h = createHash("sha256").update(`sora-pos-fnb-demo:${name}`).digest();
  const b = Buffer.from(h.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = b.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function mulberry32(a) {
  return function rand() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rand, items) {
  return items[Math.floor(rand() * items.length)];
}

function iso(day, hour, minute) {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${day}T${hh}:${mm}:00+07:00`;
}

const now = new Date().toISOString();
const ADMIN = id("user-admin");
const CASHIER = id("user-cashier");
const PRINTER = id("printer-main");

const cats = [
  ["coffee", "Coffee", "Espresso based coffee drinks", 1],
  ["noncoffee", "Non Coffee", "Non coffee beverages", 2],
  ["tea", "Tea", "Tea based drinks", 3],
  ["food", "Food", "Main food menu", 4],
  ["snack", "Snack", "Light snacks and pastry", 5],
].map(([key, name, description, sort]) => ({
  id: id(`cat-${key}`),
  name,
  description,
  image: null,
  status: "active",
  sort_order: sort,
  catalog_pack: "fnb",
  created_at: iso("2026-08-01", 8, 0),
  updated_at: iso("2026-08-01", 8, 0),
}));

const cat = Object.fromEntries(cats.map((c) => [c.name, c.id]));

const productsMeta = [
  { key: "iced", name: "Iced Latte", sku: "CF-001", cat: "Coffee", kind: "recipe", price: 32000, cost: 12000, featured: true, sort: 1, stock: 0 },
  { key: "cap", name: "Cappuccino", sku: "CF-002", cat: "Coffee", kind: "recipe", price: 30000, cost: 11000, featured: false, sort: 2, stock: 0 },
  { key: "ame", name: "Americano", sku: "CF-003", cat: "Coffee", kind: "recipe", price: 26000, cost: 9000, featured: false, sort: 3, stock: 0 },
  { key: "esp", name: "Espresso", sku: "CF-004", cat: "Coffee", kind: "goods", price: 18000, cost: 7000, featured: false, sort: 4, stock: 60 },
  { key: "choc", name: "Chocolate Milk", sku: "NC-001", cat: "Non Coffee", kind: "goods", price: 28000, cost: 10000, featured: false, sort: 1, stock: 40 },
  { key: "matcha", name: "Matcha Latte", sku: "NC-002", cat: "Non Coffee", kind: "recipe", price: 35000, cost: 14000, featured: false, sort: 2, stock: 0 },
  { key: "lemon", name: "Lemon Tea", sku: "TH-001", cat: "Tea", kind: "recipe", price: 24000, cost: 9000, featured: false, sort: 1, stock: 0 },
  { key: "thai", name: "Thai Tea", sku: "TH-002", cat: "Tea", kind: "goods", price: 26000, cost: 10000, featured: false, sort: 2, stock: 36 },
  { key: "sand", name: "Chicken Sandwich", sku: "FD-001", cat: "Food", kind: "goods", price: 45000, cost: 18000, featured: false, sort: 1, stock: 18 },
  { key: "burg", name: "Beef Burger", sku: "FD-002", cat: "Food", kind: "goods", price: 58000, cost: 24000, featured: false, sort: 2, stock: 14 },
  { key: "crois", name: "Croissant", sku: "SN-001", cat: "Snack", kind: "goods", price: 24000, cost: 9000, featured: false, sort: 1, stock: 22 },
  { key: "banana", name: "Banana Cake", sku: "SN-002", cat: "Snack", kind: "goods", price: 22000, cost: 8000, featured: false, sort: 2, stock: 16 },
];

const products = productsMeta.map((p) => ({
  id: id(`prod-${p.key}`),
  category_id: cat[p.cat],
  kind: p.kind,
  name: p.name,
  sku: p.sku,
  description: p.name,
  price: String(p.price),
  cost: String(p.cost),
  image: null,
  status: "active",
  stock_status: "available",
  current_stock: String(p.stock),
  minimum_stock: p.kind === "goods" ? "8" : "0",
  is_featured: p.featured,
  sort_order: p.sort,
  catalog_pack: "fnb",
  created_at: iso("2026-08-01", 8, 0),
  updated_at: iso("2026-09-22", 21, 0),
}));
const prod = Object.fromEntries(productsMeta.map((p) => [p.key, id(`prod-${p.key}`)]));
const prodByKey = Object.fromEntries(productsMeta.map((p) => [p.key, p]));

const addons = [
  ["shot", "Extra Shot", 8000, 1],
  ["caramel", "Caramel", 5000, 2],
  ["vanilla", "Vanilla", 5000, 3],
  ["milk", "Extra Milk", 4000, 4],
].map(([key, name, price, sort]) => ({
  id: id(`addon-${key}`),
  name,
  price: String(price),
  status: "active",
  sort_order: sort,
  created_at: iso("2026-08-01", 8, 0),
  updated_at: iso("2026-08-01", 8, 0),
}));
const addon = Object.fromEntries(
  ["shot", "caramel", "vanilla", "milk"].map((k) => [k, id(`addon-${k}`)]),
);

const productAddons = [];
for (const pk of ["iced", "cap"]) {
  for (const ak of ["shot", "caramel", "vanilla", "milk"]) {
    productAddons.push({
      id: id(`pa-${pk}-${ak}`),
      product_id: prod[pk],
      addon_id: addon[ak],
    });
  }
}
for (const ak of ["shot", "caramel", "vanilla"]) {
  productAddons.push({ id: id(`pa-ame-${ak}`), product_id: prod.ame, addon_id: addon[ak] });
}
for (const ak of ["caramel", "vanilla", "milk"]) {
  productAddons.push({ id: id(`pa-matcha-${ak}`), product_id: prod.matcha, addon_id: addon[ak] });
}

function variant(productKey, name, required, sort, options) {
  const vid = id(`var-${productKey}-${name.toLowerCase()}`);
  return {
    variant: {
      id: vid,
      product_id: prod[productKey],
      name,
      is_required: required,
      sort_order: sort,
    },
    options: options.map((o, i) => ({
      id: id(`opt-${productKey}-${name}-${o.name}`),
      variant_id: vid,
      name: o.name,
      price_adjustment: String(o.price),
      is_default: !!o.def,
      sort_order: i + 1,
    })),
  };
}

const variantBundles = [
  variant("iced", "Size", true, 1, [
    { name: "Regular", price: 0, def: true },
    { name: "Large", price: 5000 },
  ]),
  variant("iced", "Temperature", true, 2, [
    { name: "Hot", price: 0 },
    { name: "Ice", price: 0, def: true },
  ]),
  variant("cap", "Size", true, 1, [
    { name: "Regular", price: 0, def: true },
    { name: "Large", price: 5000 },
  ]),
  variant("ame", "Size", true, 1, [
    { name: "Regular", price: 0, def: true },
    { name: "Large", price: 4000 },
  ]),
];
const product_variants = variantBundles.map((v) => v.variant);
const product_variant_options = variantBundles.flatMap((v) => v.options);

const invMeta = [
  { key: "bean", name: "Coffee Bean", sku: "COF-ING-001", unit: "g", stock: 4500, min: 1000, cost: 180 },
  { key: "milk", name: "Fresh Milk", sku: "COF-ING-002", unit: "ml", stock: 12000, min: 2000, cost: 20 },
  { key: "ice", name: "Ice Cube", sku: "COF-ING-003", unit: "g", stock: 8000, min: 2000, cost: 3 },
  { key: "cup", name: "Cup 12oz", sku: "COF-ING-004", unit: "pcs", stock: 350, min: 80, cost: 550 },
  { key: "matchaP", name: "Matcha Powder", sku: "COF-ING-005", unit: "g", stock: 400, min: 80, cost: 220 },
  { key: "chocS", name: "Chocolate Syrup", sku: "COF-ING-006", unit: "ml", stock: 1800, min: 400, cost: 28 },
  { key: "tea", name: "Tea Leaves", sku: "COF-ING-007", unit: "g", stock: 600, min: 150, cost: 90 },
  { key: "syrup", name: "Sugar Syrup", sku: "COF-ING-008", unit: "ml", stock: 2500, min: 500, cost: 10 },
];
const inventory_items = invMeta.map((i) => ({
  id: id(`inv-${i.key}`),
  name: i.name,
  sku: i.sku,
  unit: i.unit,
  current_stock: String(i.stock),
  minimum_stock: String(i.min),
  cost: String(i.cost),
  status: "active",
  created_at: iso("2026-08-01", 8, 0),
  updated_at: iso("2026-09-22", 21, 0),
}));
const inv = Object.fromEntries(invMeta.map((i) => [i.key, id(`inv-${i.key}`)]));

const recipesSpec = [
  ["iced", "Iced latte BOM", [
    ["bean", 18],
    ["milk", 150],
    ["ice", 100],
    ["cup", 1],
  ]],
  ["cap", "Cappuccino BOM", [
    ["bean", 18],
    ["milk", 120],
    ["cup", 1],
  ]],
  ["ame", "Americano BOM", [
    ["bean", 18],
    ["cup", 1],
  ]],
  ["matcha", "Matcha latte BOM", [
    ["matchaP", 15],
    ["milk", 150],
    ["cup", 1],
  ]],
  ["lemon", "Lemon tea BOM", [
    ["tea", 5],
    ["syrup", 20],
    ["cup", 1],
  ]],
];
const recipes = recipesSpec.map(([key, note]) => ({
  id: id(`recipe-${key}`),
  product_id: prod[key],
  note,
  cost_locked: false,
  created_at: iso("2026-08-01", 8, 0),
  updated_at: iso("2026-08-01", 8, 0),
}));
const recipe_items = recipesSpec.flatMap(([key, , items]) =>
  items.map(([ik, qty]) => ({
    id: id(`ri-${key}-${ik}`),
    recipe_id: id(`recipe-${key}`),
    inventory_item_id: inv[ik],
    quantity: String(qty),
  })),
);
const bomByProduct = Object.fromEntries(recipesSpec.map(([key, , items]) => [prod[key], items]));

const printers = [
  {
    id: PRINTER,
    name: "Kasir Utama",
    type: "thermal",
    paper_size: "80mm",
    connection_mode: "web_bluetooth",
    device_name: null,
    ble_service_uuid: "000018f0-0000-1000-8000-00805f9b34fb",
    ble_characteristic_uuid: "00002af1-0000-1000-8000-00805f9b34fb",
    bridge_url: "http://127.0.0.1:9100",
    is_default: true,
    status: "active",
    created_at: iso("2026-08-01", 8, 0),
    updated_at: iso("2026-08-01", 8, 0),
  },
];

const settings = [
  ["shop_name", "Sora Coffee"],
  ["shop_address", "Jl. Merdeka No. 10, Jakarta"],
  ["shop_phone", "0812-3456-7890"],
  ["shop_email", "hello@soracoffee.local"],
  ["shop_logo", ""],
  ["receipt_footer", "Terima kasih, sampai jumpa lagi!"],
  ["tax_percent", "0"],
  ["service_charge_percent", "0"],
  ["currency", "Rp"],
  ["receipt_paper_size", "80mm"],
  ["allow_negative_stock", "0"],
  ["theme_default", "light"],
  ["shop_mode", "fnb"],
  ["ui_accent_color", ""],
].map(([setting_key, setting_value]) => ({
  id: id(`set-${setting_key}`),
  setting_key,
  setting_value,
}));

const goodsStock = Object.fromEntries(productsMeta.filter((p) => p.kind === "goods").map((p) => [p.key, p.stock]));
const invStock = Object.fromEntries(invMeta.map((i) => [i.key, i.stock]));

const weighted = [
  ...Array(8).fill("iced"),
  ...Array(5).fill("cap"),
  ...Array(4).fill("ame"),
  ...Array(3).fill("matcha"),
  ...Array(3).fill("lemon"),
  ...Array(2).fill("esp"),
  ...Array(2).fill("choc"),
  ...Array(2).fill("thai"),
  ...Array(3).fill("sand"),
  ...Array(2).fill("burg"),
  ...Array(3).fill("crois"),
  ...Array(2).fill("banana"),
];

const rand = mulberry32(20260922);
const shifts = [];
const transactions = [];
const transaction_items = [];
const transaction_item_variants = [];
const transaction_item_addons = [];
const payments = [];
const transaction_counters = [];
const inventory_movements = [];
let moveN = 0;

function deductRecipe(productKey, qty) {
  const bom = recipesSpec.find((r) => r[0] === productKey)?.[2] || [];
  for (const [ik, unitQty] of bom) {
    invStock[ik] -= unitQty * qty;
  }
}

for (let d = 1; d <= 22; d++) {
  const day = `2026-09-${String(d).padStart(2, "0")}`;
  const date = new Date(`${day}T12:00:00+07:00`);
  const dow = date.getDay();
  const weekend = dow === 0 || dow === 6;
  const count = weekend ? 20 + Math.floor(rand() * 9) : 12 + Math.floor(rand() * 7);
  const shiftId = id(`shift-${day}`);
  let cashSales = 0;
  const opening = 500000;

  for (let n = 1; n <= count; n++) {
    const minuteOff = 30 + Math.floor((n / (count + 1)) * 12 * 60) + Math.floor(rand() * 8);
    const hour = 8 + Math.floor(minuteOff / 60);
    const minute = minuteOff % 60;
    const created = iso(day, hour, minute);
    const trxId = id(`trx-${day}-${n}`);
    const number = `CS-${day.replaceAll("-", "")}-${String(n).padStart(5, "0")}`;
    const lineCount = rand() < 0.35 ? 2 : 1;
    const dineIn = rand() < 0.4;
    let subtotal = 0;
    const method = pick(rand, ["cash", "cash", "qris", "qris", "ewallet", "debit"]);

    for (let li = 0; li < lineCount; li++) {
      const key = pick(rand, weighted);
      const meta = prodByKey[key];
      const qty = rand() < 0.15 ? 2 : 1;
      if (meta.kind === "goods") {
        if (goodsStock[key] < qty) continue;
        goodsStock[key] -= qty;
      } else {
        deductRecipe(key, qty);
      }
      let variantPrice = 0;
      const itemId = id(`ti-${day}-${n}-${li}`);
      const vrows = [];
      if (key === "iced") {
        const large = rand() < 0.35;
        variantPrice += large ? 5000 : 0;
        vrows.push({
          id: id(`tiv-${day}-${n}-${li}-size`),
          transaction_item_id: itemId,
          variant_name: "Size",
          option_name: large ? "Large" : "Regular",
          price_adjustment: String(large ? 5000 : 0),
        });
        vrows.push({
          id: id(`tiv-${day}-${n}-${li}-temp`),
          transaction_item_id: itemId,
          variant_name: "Temperature",
          option_name: "Ice",
          price_adjustment: "0",
        });
      } else if (key === "cap" || key === "ame") {
        const large = rand() < 0.3;
        const extra = key === "ame" ? 4000 : 5000;
        variantPrice += large ? extra : 0;
        vrows.push({
          id: id(`tiv-${day}-${n}-${li}-size`),
          transaction_item_id: itemId,
          variant_name: "Size",
          option_name: large ? "Large" : "Regular",
          price_adjustment: String(large ? extra : 0),
        });
      }
      let addonPrice = 0;
      const arows = [];
      if ((key === "iced" || key === "cap" || key === "ame") && rand() < 0.22) {
        addonPrice += 8000;
        arows.push({
          id: id(`tia-${day}-${n}-${li}`),
          transaction_item_id: itemId,
          addon_name: "Extra Shot",
          price: "8000",
        });
      }
      const line = (meta.price + variantPrice + addonPrice) * qty;
      subtotal += line;
      transaction_items.push({
        id: itemId,
        transaction_id: trxId,
        product_id: prod[key],
        product_name: meta.name,
        unit_price: String(meta.price),
        variant_price: String(variantPrice),
        addon_price: String(addonPrice),
        quantity: qty,
        discount: "0",
        note: null,
        subtotal: String(line),
      });
      transaction_item_variants.push(...vrows);
      transaction_item_addons.push(...arows);
    }

    if (subtotal === 0) continue;
    const total = subtotal;
    if (method === "cash") cashSales += total;
    const tendered = method === "cash" ? Math.ceil(total / 50000) * 50000 : total;
    transactions.push({
      id: trxId,
      transaction_number: number,
      shift_id: shiftId,
      user_id: CASHIER,
      order_type: dineIn ? "dine_in" : "take_away",
      table_number: dineIn ? String(1 + Math.floor(rand() * 8)) : null,
      customer_name: dineIn && rand() < 0.5 ? pick(rand, ["Budi", "Sari", "Andi", "Maya", "Raka"]) : null,
      subtotal: String(subtotal),
      discount: "0",
      tax: "0",
      service_charge: "0",
      total: String(total),
      status: "completed",
      note: null,
      created_at: created,
    });
    payments.push({
      id: id(`pay-${day}-${n}`),
      transaction_id: trxId,
      method,
      amount: String(tendered),
      change_amount: String(tendered - total),
      created_at: created,
    });
  }

  const dayTrx = transactions.filter((t) => t.shift_id === shiftId).length;
  transaction_counters.push({ day, last_seq: dayTrx });
  shifts.push({
    id: shiftId,
    user_id: CASHIER,
    opening_cash: String(opening),
    opening_at: iso(day, 8, 0),
    closing_cash: String(opening + cashSales),
    closing_at: iso(day, 21, 0),
    cash_sales: String(cashSales),
    expected_cash: String(opening + cashSales),
    difference: "0",
    status: "closed",
    note: weekend ? "Akhir pekan" : null,
  });
}

for (const p of products) {
  const meta = productsMeta.find((m) => prod[m.key] === p.id);
  if (meta?.kind === "goods") {
    p.current_stock = String(meta.stock);
    p.stock_status = meta.stock <= 0 ? "sold_out" : "available";
  }
}
for (const item of inventory_items) {
  const meta = invMeta.find((m) => inv[m.key] === item.id);
  if (!meta) continue;
  item.current_stock = String(meta.stock);
}

const dump = {
  generatedAt: now,
  kind: "sora-pos-backup",
  users: [
    {
      id: ADMIN,
      role: "ADMIN",
      name: "Administrator",
      username: "admin",
      email: "admin@umkmpos.local",
      is_active: true,
      created_at: iso("2026-08-01", 8, 0),
    },
    {
      id: CASHIER,
      role: "CASHIER",
      name: "Kasir Satu",
      username: "cashier",
      email: "cashier@umkmpos.local",
      is_active: true,
      created_at: iso("2026-08-01", 8, 0),
    },
  ],
  categories: cats,
  products,
  product_variants,
  product_variant_options,
  addons,
  product_addons: productAddons,
  inventory_items,
  inventory_movements,
  recipes,
  recipe_items,
  printers,
  settings,
  held_orders: [],
  shifts,
  transactions,
  transaction_items,
  transaction_item_variants,
  transaction_item_addons,
  payments,
  transaction_counters,
};

const outDir = path.resolve(import.meta.dirname, "../seeds");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "fnb-demo.json");
fs.writeFileSync(outFile, JSON.stringify(dump, null, 2));
console.log(
  `Wrote ${outFile} trx=${dump.transactions.length} items=${dump.transaction_items.length} shifts=${dump.shifts.length}`,
);
