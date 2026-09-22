import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getSql } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || !can(session.role, "settings")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const sql = getSql();
  const dump = {
    generatedAt: new Date().toISOString(),
    users: await sql`SELECT id, role, name, username, email, is_active, created_at FROM users`,
    categories: await sql`SELECT * FROM categories`,
    products: await sql`SELECT * FROM products`,
    product_variants: await sql`SELECT * FROM product_variants`,
    product_variant_options: await sql`SELECT * FROM product_variant_options`,
    addons: await sql`SELECT * FROM addons`,
    product_addons: await sql`SELECT * FROM product_addons`,
    inventory_items: await sql`SELECT * FROM inventory_items`,
    inventory_movements: await sql`SELECT * FROM inventory_movements`,
    recipes: await sql`SELECT * FROM recipes`,
    recipe_items: await sql`SELECT * FROM recipe_items`,
    shifts: await sql`SELECT * FROM shifts`,
    transactions: await sql`SELECT * FROM transactions`,
    transaction_items: await sql`SELECT * FROM transaction_items`,
    payments: await sql`SELECT * FROM payments`,
    printers: await sql`SELECT * FROM printers`,
    settings: await sql`SELECT * FROM settings`,
    held_orders: await sql`SELECT * FROM held_orders`,
  };
  return new NextResponse(JSON.stringify(dump, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="umkm-pos-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
