import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { reportDesk } from "@/server/queries";

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
  debit: "Debit",
  credit: "Kredit",
  ewallet: "E-wallet",
};

const TYPE_TAB: Record<string, string> = {
  ringkasan: "ringkasan",
  penjualan: "penjualan",
  sales: "penjualan",
  produk: "produk",
  products: "produk",
  kasir: "kasir",
  cashiers: "kasir",
  pembayaran: "pembayaran",
  payments: "pembayaran",
  pajak: "pajak",
  shift: "shift",
  shifts: "shift",
  stok: "stok",
  inventory: "stok",
  categories: "categories",
};

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function csv(header: string[], rows: unknown[][]) {
  return [header.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\n");
}

function amount(value: number) {
  return Math.round(value);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "reports")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const { searchParams } = req.nextUrl;
  const requested = searchParams.get("tab") || searchParams.get("type") || "ringkasan";
  const tab = TYPE_TAB[requested] ?? "ringkasan";
  const desk = await reportDesk({
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
    cashierId: searchParams.get("cashier") || undefined,
    method: searchParams.get("method") || undefined,
  });
  const paymentTotal = desk.payments.reduce((sum, row) => sum + row.total, 0);

  let header: string[] = [];
  let rows: unknown[][] = [];
  if (tab === "penjualan") {
    header = ["Tanggal", "Jumlah Transaksi", "Total Penjualan"];
    rows = desk.sales.map((row) => [row.date, row.trx, amount(row.total)]);
  } else if (tab === "produk") {
    header = ["Produk", "Kategori", "Terjual", "Total Penjualan"];
    rows = desk.products.map((row) => [row.name, row.category, row.qty, amount(row.revenue)]);
  } else if (tab === "categories") {
    header = ["Kategori", "Total Penjualan"];
    rows = desk.categories.map((row) => [row.name, amount(row.revenue)]);
  } else if (tab === "kasir") {
    header = ["Kasir", "Jumlah Transaksi", "Total Penjualan"];
    rows = desk.cashierRows.map((row) => [row.name, row.trx, amount(row.total)]);
  } else if (tab === "pembayaran") {
    header = ["Metode", "Jumlah Transaksi", "Total", "Persentase"];
    rows = desk.payments.map((row) => [
      PAYMENT_LABEL[row.method] ?? row.method,
      row.trx,
      amount(row.total),
      paymentTotal > 0 ? Math.round((row.total / paymentTotal) * 100) : 0,
    ]);
  } else if (tab === "pajak") {
    header = ["Tanggal", "Pajak", "Biaya Layanan", "Total"];
    rows = desk.tax.map((row) => [row.date, amount(row.tax), amount(row.service), amount(row.tax + row.service)]);
  } else if (tab === "shift") {
    header = ["Kasir", "Dibuka", "Ditutup", "Modal Awal", "Cash Sales", "Aktual", "Selisih"];
    rows = desk.shifts.map((row) => [
      row.cashier,
      row.openingAt,
      row.closingAt ?? "",
      amount(row.openingCash),
      amount(row.cashSales),
      row.closingCash == null ? "" : amount(row.closingCash),
      row.difference == null ? "" : amount(row.difference),
    ]);
  } else if (tab === "stok") {
    header = ["Jenis", "Nama", "SKU", "Stok", "Minimum", "Nilai"];
    rows = desk.stock.map((row) => [row.kind, row.name, row.sku, row.stock, row.minimum, amount(row.value)]);
  } else {
    header = ["Jam", "Penjualan", "Jumlah Transaksi"];
    rows = desk.hours.map((row) => [`${String(row.hour).padStart(2, "0")}:00`, amount(row.sales), row.trx]);
  }

  return new NextResponse(csv(header, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-${tab}-${desk.from}_${desk.to}.csv"`,
    },
  });
}
