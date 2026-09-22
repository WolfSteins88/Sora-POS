import { getSql } from "@/lib/db";

export const BACKUP_TABLES = [
  "categories",
  "products",
  "product_variants",
  "product_variant_options",
  "addons",
  "product_addons",
  "inventory_items",
  "inventory_movements",
  "recipes",
  "recipe_items",
  "printers",
  "settings",
  "held_orders",
  "shifts",
  "transactions",
  "transaction_items",
  "transaction_item_variants",
  "transaction_item_addons",
  "payments",
  "transaction_counters",
] as const;

const DELETE_ORDER = [
  "held_orders",
  "payments",
  "transaction_item_addons",
  "transaction_item_variants",
  "transaction_items",
  "transactions",
  "inventory_movements",
  "recipe_items",
  "recipes",
  "product_addons",
  "product_variant_options",
  "product_variants",
  "addons",
  "products",
  "categories",
  "inventory_items",
  "shifts",
  "transaction_counters",
  "printers",
  "settings",
] as const;

const INSERT_ORDER = [
  "categories",
  "products",
  "product_variants",
  "product_variant_options",
  "addons",
  "product_addons",
  "inventory_items",
  "recipes",
  "recipe_items",
  "printers",
  "shifts",
  "transactions",
  "transaction_items",
  "transaction_item_variants",
  "transaction_item_addons",
  "payments",
  "inventory_movements",
  "held_orders",
  "transaction_counters",
  "settings",
] as const;

export type BackupDump = {
  generatedAt?: string;
  kind?: string;
  users?: Record<string, unknown>[];
} & Partial<Record<(typeof BACKUP_TABLES)[number], Record<string, unknown>[]>>;

function ident(name: string) {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error("Nama tabel tidak valid.");
  return name;
}

export async function exportBackupDump() {
  const sql = getSql();
  const dump: BackupDump = {
    generatedAt: new Date().toISOString(),
    kind: "sora-pos-backup",
    users: await sql`SELECT id, role, name, username, email, is_active, created_at FROM users`,
  };
  dump.categories = await sql`SELECT * FROM categories`;
  dump.products = await sql`SELECT * FROM products`;
  dump.product_variants = await sql`SELECT * FROM product_variants`;
  dump.product_variant_options = await sql`SELECT * FROM product_variant_options`;
  dump.addons = await sql`SELECT * FROM addons`;
  dump.product_addons = await sql`SELECT * FROM product_addons`;
  dump.inventory_items = await sql`SELECT * FROM inventory_items`;
  dump.inventory_movements = await sql`SELECT * FROM inventory_movements`;
  dump.recipes = await sql`SELECT * FROM recipes`;
  dump.recipe_items = await sql`SELECT * FROM recipe_items`;
  dump.printers = await sql`SELECT * FROM printers`;
  dump.settings = await sql`SELECT * FROM settings`;
  dump.held_orders = await sql`SELECT * FROM held_orders`;
  dump.shifts = await sql`SELECT * FROM shifts`;
  dump.transactions = await sql`SELECT * FROM transactions`;
  dump.transaction_items = await sql`SELECT * FROM transaction_items`;
  dump.transaction_item_variants = await sql`SELECT * FROM transaction_item_variants`;
  dump.transaction_item_addons = await sql`SELECT * FROM transaction_item_addons`;
  dump.payments = await sql`SELECT * FROM payments`;
  dump.transaction_counters = await sql`SELECT * FROM transaction_counters`;
  return dump;
}

function remapUserId(
  dumpId: unknown,
  dumpUsers: Record<string, unknown>[],
  localByUsername: Map<string, string>,
  fallbackId: string,
) {
  if (!dumpId) return fallbackId;
  const dumpUser = dumpUsers.find((u) => String(u.id) === String(dumpId));
  const username = dumpUser ? String(dumpUser.username ?? "") : "";
  return localByUsername.get(username) || fallbackId;
}

function cleanRow(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "password_hash" || key === "passwordHash") continue;
    out[key] = value;
  }
  return out;
}

export async function restoreBackupDump(dump: BackupDump, sessionUserId: string) {
  if (!dump || typeof dump !== "object") throw new Error("Berkas cadangan tidak valid.");
  const sql = getSql();
  const localUsers = await sql<{ id: string; username: string }[]>`SELECT id, username FROM users`;
  const localByUsername = new Map(localUsers.map((u) => [u.username, u.id]));
  const dumpUsers = Array.isArray(dump.users) ? dump.users : [];

  await sql.begin(async (tx) => {
    for (const table of DELETE_ORDER) {
      await tx.unsafe(`DELETE FROM ${ident(table)}`);
    }

    for (const table of INSERT_ORDER) {
      const rows = dump[table];
      if (!Array.isArray(rows) || rows.length === 0) continue;
      for (const raw of rows) {
        if (!raw || typeof raw !== "object") continue;
        const row = cleanRow(raw as Record<string, unknown>);
        if ("user_id" in row) {
          row.user_id = remapUserId(row.user_id, dumpUsers, localByUsername, sessionUserId);
        }
        const cols = Object.keys(row);
        if (!cols.length) continue;
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
        const quoted = cols.map((c) => ident(c)).join(", ");
        await tx.unsafe(
          `INSERT INTO ${ident(table)} (${quoted}) VALUES (${placeholders})`,
          cols.map((c) => row[c]),
        );
      }
    }
  });
}
