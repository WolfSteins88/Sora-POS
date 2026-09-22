import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getSql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "reports")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type") || "sales";
  const from = searchParams.get("from") || new Date().toISOString().slice(0, 10);
  const to = searchParams.get("to") || from;
  const sql = getSql();
  let header: string[] = [];
  let rows: unknown[][] = [];

  if (type === "sales") {
    header = ["Tanggal", "Jumlah Transaksi", "Total"];
    const data = await sql`SELECT created_at::date, COUNT(*), COALESCE(SUM(total),0) FROM transactions WHERE status='completed' AND created_at::date BETWEEN ${from}::date AND ${to}::date GROUP BY 1 ORDER BY 1`;
    rows = data.map((r) => Object.values(r));
  } else if (type === "products") {
    header = ["Produk", "Qty", "Revenue"];
    const data = await sql`SELECT ti.product_name, SUM(ti.quantity), COALESCE(SUM(ti.subtotal),0) FROM transaction_items ti JOIN transactions t ON t.id=ti.transaction_id WHERE t.status='completed' AND t.created_at::date BETWEEN ${from}::date AND ${to}::date GROUP BY ti.product_id, ti.product_name`;
    rows = data.map((r) => Object.values(r));
  } else if (type === "categories") {
    header = ["Kategori", "Qty", "Revenue"];
    const data = await sql`SELECT c.name, SUM(ti.quantity), COALESCE(SUM(ti.subtotal),0) FROM transaction_items ti JOIN transactions t ON t.id=ti.transaction_id JOIN products p ON p.id=ti.product_id JOIN categories c ON c.id=p.category_id WHERE t.status='completed' AND t.created_at::date BETWEEN ${from}::date AND ${to}::date GROUP BY c.id, c.name`;
    rows = data.map((r) => Object.values(r));
  } else if (type === "payments") {
    header = ["Metode", "Jumlah", "Total"];
    const data = await sql`SELECT p.method, COUNT(*), COALESCE(SUM(p.amount - p.change_amount),0) FROM payments p JOIN transactions t ON t.id=p.transaction_id WHERE t.status='completed' AND t.created_at::date BETWEEN ${from}::date AND ${to}::date GROUP BY p.method`;
    rows = data.map((r) => Object.values(r));
  } else if (type === "cashiers") {
    header = ["Kasir", "Jumlah", "Total"];
    const data = await sql`SELECT u.name, COUNT(*), COALESCE(SUM(t.total),0) FROM transactions t JOIN users u ON u.id=t.user_id WHERE t.status='completed' AND t.created_at::date BETWEEN ${from}::date AND ${to}::date GROUP BY u.id, u.name`;
    rows = data.map((r) => Object.values(r));
  } else if (type === "shifts") {
    header = ["Kasir", "Dibuka", "Ditutup", "Modal", "Cash Sales", "Actual", "Selisih"];
    const data = await sql`SELECT u.name, s.opening_at, s.closing_at, s.opening_cash, s.cash_sales, s.closing_cash, s.difference FROM shifts s JOIN users u ON u.id=s.user_id WHERE s.opening_at::date BETWEEN ${from}::date AND ${to}::date ORDER BY s.opening_at DESC`;
    rows = data.map((r) => Object.values(r));
  } else {
    header = ["Jenis", "Nama", "SKU", "Stok", "Minimum", "Nilai"];
    const goods = await sql`SELECT 'Barang', name, sku, current_stock, minimum_stock, current_stock * cost FROM products WHERE kind='goods'`;
    const bahan = await sql`SELECT 'Bahan', name, sku, current_stock, minimum_stock, current_stock * cost FROM inventory_items`;
    rows = [...goods, ...bahan].map((r) => Object.values(r));
  }

  const csv = [header.join(","), ...rows.map((r) => r.map((c) => `"${String(c ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="report-${type}-${from}_${to}.csv"`,
    },
  });
}
