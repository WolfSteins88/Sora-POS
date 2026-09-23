import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function id(name) {
  const h = createHash("sha256").update(`sora-pos-retail-demo:${name}`).digest();
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
  ["pack", "Minuman kemasan", "Air minum dan minuman dalam kemasan", 1],
  ["instant", "Makanan instan", "Mie, beras, dan minyak", 2],
  ["snack", "Snack", "Camilan kemasan", 3],
  ["clean", "Kebersihan", "Sabun dan deterjen", 4],
  ["atk", "ATK", "Alat tulis", 5],
].map(([key, name, description, sort]) => ({
  id: id(`cat-${key}`),
  name,
  description,
  image: null,
  status: "active",
  sort_order: sort,
  catalog_pack: "retail",
  created_at: iso("2026-08-01", 9, 0),
  updated_at: iso("2026-08-01", 9, 0),
}));

const cat = Object.fromEntries(cats.map((c) => [c.name, c.id]));

const productsMeta = [
  { key: "water", name: "Air Mineral 600ml", sku: "RT-001", cat: "Minuman kemasan", price: 4000, cost: 2000, stock: 420, min: 40, sort: 1, featured: true },
  { key: "teh", name: "Teh Botol", sku: "RT-002", cat: "Minuman kemasan", price: 5000, cost: 2800, stock: 260, min: 24, sort: 2, featured: false },
  { key: "can", name: "Kopi Kaleng", sku: "RT-003", cat: "Minuman kemasan", price: 8000, cost: 4500, stock: 180, min: 16, sort: 3, featured: false },
  { key: "mie", name: "Indomie Goreng", sku: "RT-004", cat: "Makanan instan", price: 3500, cost: 2500, stock: 540, min: 48, sort: 1, featured: true },
  { key: "rice", name: "Beras 5kg", sku: "RT-005", cat: "Makanan instan", price: 68000, cost: 58000, stock: 70, min: 6, sort: 2, featured: false },
  { key: "oil", name: "Minyak Goreng 1L", sku: "RT-006", cat: "Makanan instan", price: 22000, cost: 18000, stock: 110, min: 10, sort: 3, featured: false },
  { key: "chip", name: "Keripik Kentang", sku: "RT-007", cat: "Snack", price: 12000, cost: 7000, stock: 140, min: 12, sort: 1, featured: false },
  { key: "bread", name: "Roti Tawar", sku: "RT-008", cat: "Snack", price: 14000, cost: 9000, stock: 36, min: 18, sort: 2, featured: false },
  { key: "soap", name: "Sabun Mandi", sku: "RT-009", cat: "Kebersihan", price: 8500, cost: 4500, stock: 96, min: 10, sort: 1, featured: false },
  { key: "det", name: "Deterjen 800g", sku: "RT-010", cat: "Kebersihan", price: 18000, cost: 12000, stock: 80, min: 8, sort: 2, featured: false },
  { key: "pen", name: "Pulpen", sku: "RT-011", cat: "ATK", price: 3500, cost: 1500, stock: 28, min: 20, sort: 1, featured: false },
  { key: "book", name: "Buku Tulis", sku: "RT-012", cat: "ATK", price: 6000, cost: 3000, stock: 48, min: 30, sort: 2, featured: false },
];

const products = productsMeta.map((p) => ({
  id: id(`prod-${p.key}`),
  category_id: cat[p.cat],
  kind: "goods",
  name: p.name,
  sku: p.sku,
  description: p.name,
  price: String(p.price),
  cost: String(p.cost),
  image: null,
  status: "active",
  stock_status: "available",
  current_stock: String(p.stock),
  minimum_stock: String(p.min),
  is_featured: p.featured,
  sort_order: p.sort,
  catalog_pack: "retail",
  created_at: iso("2026-08-01", 9, 0),
  updated_at: iso("2026-09-23", 20, 0),
}));
const prod = Object.fromEntries(productsMeta.map((p) => [p.key, id(`prod-${p.key}`)]));
const prodByKey = Object.fromEntries(productsMeta.map((p) => [p.key, p]));

const printers = [
  {
    id: PRINTER,
    name: "Kasir Sora Mart",
    type: "thermal",
    paper_size: "80mm",
    connection_mode: "web_bluetooth",
    device_name: null,
    ble_service_uuid: "000018f0-0000-1000-8000-00805f9b34fb",
    ble_characteristic_uuid: "00002af1-0000-1000-8000-00805f9b34fb",
    bridge_url: "http://127.0.0.1:9100",
    is_default: true,
    status: "active",
    created_at: iso("2026-08-01", 9, 0),
    updated_at: iso("2026-08-01", 9, 0),
  },
];

const settings = [
  ["shop_name", "Sora Mart"],
  ["shop_address", "Jl. Sudirman No. 88, Bandung"],
  ["shop_phone", "0821-9876-5432"],
  ["shop_email", "halo@soramart.local"],
  ["shop_logo", ""],
  ["receipt_footer", "Belanja hemat di Sora Mart"],
  ["tax_percent", "0"],
  ["service_charge_percent", "0"],
  ["currency", "Rp"],
  ["receipt_paper_size", "80mm"],
  ["allow_negative_stock", "0"],
  ["theme_default", "light"],
  ["shop_mode", "retail"],
  ["ui_accent_color", ""],
].map(([setting_key, setting_value]) => ({
  id: id(`set-${setting_key}`),
  setting_key,
  setting_value,
}));

const goodsStock = Object.fromEntries(productsMeta.map((p) => [p.key, p.stock]));

const weighted = [
  ...Array(6).fill("water"),
  ...Array(4).fill("teh"),
  ...Array(3).fill("can"),
  ...Array(7).fill("mie"),
  ...Array(2).fill("rice"),
  ...Array(3).fill("oil"),
  ...Array(4).fill("chip"),
  ...Array(3).fill("bread"),
  ...Array(3).fill("soap"),
  ...Array(2).fill("det"),
  ...Array(4).fill("pen"),
  ...Array(3).fill("book"),
];

const payMethods = ["qris", "qris", "qris", "debit", "debit", "ewallet", "cash"];
const rand = mulberry32(20260923);
const shifts = [];
const transactions = [];
const transaction_items = [];
const payments = [];
const transaction_counters = [];

for (let d = 1; d <= 23; d++) {
  const day = `2026-09-${String(d).padStart(2, "0")}`;
  const date = new Date(`${day}T12:00:00+07:00`);
  const dow = date.getDay();
  const weekend = dow === 0 || dow === 6;
  const count = weekend ? 7 + Math.floor(rand() * 5) : 16 + Math.floor(rand() * 8);
  const shiftId = id(`shift-${day}`);
  let cashSales = 0;
  const opening = 1000000;
  let seq = 0;

  for (let n = 1; n <= count; n++) {
    const minuteOff = 20 + Math.floor((n / (count + 1)) * 11 * 60) + Math.floor(rand() * 6);
    const hour = 9 + Math.floor(minuteOff / 60);
    const minute = minuteOff % 60;
    const created = iso(day, Math.min(hour, 20), minute);
    seq += 1;
    const trxId = id(`trx-${day}-${seq}`);
    const number = `RT-${day.replaceAll("-", "")}-${String(seq).padStart(5, "0")}`;
    const lineCount = 2 + Math.floor(rand() * 3);
    const cancelled = rand() < 0.06;
    const method = pick(rand, payMethods);
    let subtotal = 0;
    const lines = [];

    for (let li = 0; li < lineCount; li++) {
      const key = pick(rand, weighted);
      const meta = prodByKey[key];
      const qty = meta.price < 10000 && rand() < 0.45 ? 1 + Math.floor(rand() * 3) : 1;
      if (!cancelled && goodsStock[key] < qty) continue;
      if (!cancelled) goodsStock[key] -= qty;
      const line = meta.price * qty;
      subtotal += line;
      lines.push({
        id: id(`ti-${day}-${seq}-${li}`),
        transaction_id: trxId,
        product_id: prod[key],
        product_name: meta.name,
        unit_price: String(meta.price),
        variant_price: "0",
        addon_price: "0",
        quantity: qty,
        discount: "0",
        note: null,
        subtotal: String(line),
      });
    }

    if (subtotal === 0) continue;
    const total = subtotal;
    if (!cancelled && method === "cash") cashSales += total;
    const tendered = method === "cash" ? Math.ceil(total / 50000) * 50000 : total;
    transactions.push({
      id: trxId,
      transaction_number: number,
      shift_id: shiftId,
      user_id: CASHIER,
      order_type: "take_away",
      table_number: null,
      customer_name: null,
      subtotal: String(subtotal),
      discount: "0",
      tax: "0",
      service_charge: "0",
      total: String(total),
      status: cancelled ? "cancelled" : "completed",
      note: null,
      created_at: created,
    });
    transaction_items.push(...lines);
    payments.push({
      id: id(`pay-${day}-${seq}`),
      transaction_id: trxId,
      method,
      amount: String(cancelled ? 0 : tendered),
      change_amount: String(cancelled || method !== "cash" ? 0 : tendered - total),
      created_at: created,
    });
  }

  transaction_counters.push({ day, last_seq: seq });
  shifts.push({
    id: shiftId,
    user_id: CASHIER,
    opening_cash: String(opening),
    opening_at: iso(day, 9, 0),
    closing_cash: String(opening + cashSales),
    closing_at: iso(day, 20, 30),
    cash_sales: String(cashSales),
    expected_cash: String(opening + cashSales),
    difference: "0",
    status: "closed",
    note: weekend ? "Akhir pekan sepi" : "Hari kerja",
  });
}

for (const p of products) {
  const meta = productsMeta.find((m) => prod[m.key] === p.id);
  if (!meta) continue;
  const left = goodsStock[meta.key];
  p.current_stock = String(Math.max(0, left));
  p.stock_status = left <= 0 ? "sold_out" : "available";
}

const low = products.filter((p) => Number(p.current_stock) <= Number(p.minimum_stock));
if (low.length < 2) {
  const ranked = [...products].sort((a, b) => Number(a.current_stock) - Number(b.current_stock));
  for (const p of ranked.slice(0, 2)) {
    p.minimum_stock = String(Number(p.current_stock) + 8);
  }
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
      created_at: iso("2026-08-01", 9, 0),
    },
    {
      id: CASHIER,
      role: "CASHIER",
      name: "Kasir Satu",
      username: "cashier",
      email: "cashier@umkmpos.local",
      is_active: true,
      created_at: iso("2026-08-01", 9, 0),
    },
  ],
  categories: cats,
  products,
  product_variants: [],
  product_variant_options: [],
  addons: [],
  product_addons: [],
  inventory_items: [],
  inventory_movements: [],
  recipes: [],
  recipe_items: [],
  printers,
  settings,
  held_orders: [],
  shifts,
  transactions,
  transaction_items,
  transaction_item_variants: [],
  transaction_item_addons: [],
  payments,
  transaction_counters,
};

const outDir = path.resolve(import.meta.dirname, "../seeds");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "retail-demo.json");
fs.writeFileSync(outFile, JSON.stringify(dump, null, 2));

const days = dump.transactions.map((t) => t.created_at.slice(0, 10));
const cancelled = dump.transactions.filter((t) => t.status === "cancelled").length;
const lowStock = dump.products.filter((p) => Number(p.current_stock) <= Number(p.minimum_stock)).length;
console.log(
  `Wrote ${outFile} trx=${dump.transactions.length} cancelled=${cancelled} items=${dump.transaction_items.length} shifts=${dump.shifts.length} days=${days[0]}..${days.at(-1)} lowStock=${lowStock}`,
);
