import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getDb } from "@/lib/db";
import { inventoryItems } from "@/lib/schema";

function level(stock: number, minimum: number) {
  if (stock <= 0) return "Habis";
  if (stock <= minimum) return "Menipis";
  return "Aman";
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "inventory")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const filter = req.nextUrl.searchParams.get("level") ?? "";
  const rows = await getDb().select().from(inventoryItems).orderBy(inventoryItems.name);
  const header = ["Nama", "Kode", "Satuan", "Stok", "Minimum", "Status", "Harga Beli", "Nilai Stok"];
  const body = rows
    .map((row) => {
      const stock = Number(row.currentStock) || 0;
      const minimum = Number(row.minimumStock) || 0;
      const cost = Number(row.cost) || 0;
      const stockLevel = stock <= 0 ? "out" : stock <= minimum ? "low" : "safe";
      return { row, stock, minimum, cost, stockLevel };
    })
    .filter((item) => {
      if (q && !item.row.name.toLowerCase().includes(q) && !item.row.sku.toLowerCase().includes(q)) return false;
      if (filter && item.stockLevel !== filter) return false;
      return true;
    })
    .map((item) =>
      [item.row.name, item.row.sku, item.row.unit, item.stock, item.minimum, level(item.stock, item.minimum), Math.round(item.cost), Math.round(item.stock * item.cost)]
        .map(csvCell)
        .join(","),
    );
  const csv = [header.map(csvCell).join(","), ...body].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="inventori-bahan.csv"',
    },
  });
}
