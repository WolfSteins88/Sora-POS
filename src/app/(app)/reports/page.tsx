import { getSql } from "@/lib/db";
import { Card, PageHeader, inputClass } from "@/components/ui";

const TYPES = [
  ["sales", "Penjualan"],
  ["products", "Produk"],
  ["categories", "Kategori"],
  ["payments", "Pembayaran"],
  ["cashiers", "Kasir"],
  ["shifts", "Shift"],
  ["inventory", "Stok"],
] as const;

function range(preset: string, from?: string, to?: string) {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (preset === "yesterday") {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return [iso(d), iso(d)];
  }
  if (preset === "this_week") {
    const d = new Date(today);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return [iso(d), iso(today)];
  }
  if (preset === "this_month") {
    return [`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`, iso(today)];
  }
  if (preset === "custom") return [from || iso(today), to || iso(today)];
  return [iso(today), iso(today)];
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; range?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const type = TYPES.some((t) => t[0] === params.type) ? params.type! : "sales";
  const preset = params.range || "today";
  const [from, to] = range(preset, params.from, params.to);
  const sql = getSql();
  let columns: string[] = [];
  let rows: Record<string, unknown>[] = [];

  if (type === "sales") {
    columns = ["Tanggal", "Jumlah Transaksi", "Total Penjualan"];
    rows = await sql`
      SELECT created_at::date AS d, COUNT(*)::int AS trx_count, COALESCE(SUM(total),0)::text AS total
      FROM transactions WHERE status='completed' AND created_at::date BETWEEN ${from}::date AND ${to}::date
      GROUP BY created_at::date ORDER BY d DESC
    `;
  } else if (type === "products") {
    columns = ["Produk", "Qty Terjual", "Revenue"];
    rows = await sql`
      SELECT ti.product_name, SUM(ti.quantity)::int AS qty, COALESCE(SUM(ti.subtotal),0)::text AS revenue
      FROM transaction_items ti JOIN transactions t ON t.id = ti.transaction_id
      WHERE t.status='completed' AND t.created_at::date BETWEEN ${from}::date AND ${to}::date
      GROUP BY ti.product_id, ti.product_name ORDER BY SUM(ti.subtotal) DESC
    `;
  } else if (type === "categories") {
    columns = ["Kategori", "Qty Terjual", "Revenue"];
    rows = await sql`
      SELECT c.name AS category_name, SUM(ti.quantity)::int AS qty, COALESCE(SUM(ti.subtotal),0)::text AS revenue
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transaction_id
      JOIN products p ON p.id = ti.product_id
      JOIN categories c ON c.id = p.category_id
      WHERE t.status='completed' AND t.created_at::date BETWEEN ${from}::date AND ${to}::date
      GROUP BY c.id, c.name ORDER BY SUM(ti.subtotal) DESC
    `;
  } else if (type === "payments") {
    columns = ["Metode", "Jumlah Transaksi", "Total"];
    rows = await sql`
      SELECT p.method, COUNT(*)::int AS trx_count, COALESCE(SUM(p.amount - p.change_amount),0)::text AS total
      FROM payments p JOIN transactions t ON t.id = p.transaction_id
      WHERE t.status='completed' AND t.created_at::date BETWEEN ${from}::date AND ${to}::date
      GROUP BY p.method ORDER BY SUM(p.amount - p.change_amount) DESC
    `;
  } else if (type === "cashiers") {
    columns = ["Kasir", "Jumlah Transaksi", "Total Penjualan"];
    rows = await sql`
      SELECT u.name AS cashier_name, COUNT(*)::int AS trx_count, COALESCE(SUM(t.total),0)::text AS total
      FROM transactions t JOIN users u ON u.id = t.user_id
      WHERE t.status='completed' AND t.created_at::date BETWEEN ${from}::date AND ${to}::date
      GROUP BY u.id, u.name ORDER BY SUM(t.total) DESC
    `;
  } else if (type === "shifts") {
    columns = ["Kasir", "Dibuka", "Ditutup", "Modal Awal", "Cash Sales", "Actual", "Selisih"];
    rows = await sql`
      SELECT u.name AS cashier_name, s.opening_at, s.closing_at, s.opening_cash::text, s.cash_sales::text,
             s.closing_cash::text, s.difference::text
      FROM shifts s JOIN users u ON u.id = s.user_id
      WHERE s.opening_at::date BETWEEN ${from}::date AND ${to}::date
      ORDER BY s.opening_at DESC
    `;
  } else {
    columns = ["Jenis", "Nama", "SKU", "Stok", "Minimum", "Nilai"];
    const goods = await sql`
      SELECT 'Barang' AS jenis, name, sku, current_stock::text, minimum_stock::text, (current_stock * cost)::text AS nilai
      FROM products WHERE kind='goods' ORDER BY name
    `;
    const bahan = await sql`
      SELECT 'Bahan' AS jenis, name, sku, current_stock::text, minimum_stock::text, (current_stock * cost)::text AS nilai
      FROM inventory_items ORDER BY name
    `;
    rows = [...goods, ...bahan];
  }

  return (
    <div>
      <PageHeader title="Laporan" description="Tujuh laporan yang sama dengan kasir PHP, plus stok barang." />
      <form className="mb-4 flex flex-wrap gap-2">
        <select name="type" defaultValue={type} className={inputClass}>
          {TYPES.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <select name="range" defaultValue={preset} className={inputClass}>
          <option value="today">Hari ini</option>
          <option value="yesterday">Kemarin</option>
          <option value="this_week">Minggu ini</option>
          <option value="this_month">Bulan ini</option>
          <option value="custom">Kustom</option>
        </select>
        <input name="from" type="date" defaultValue={from} className={inputClass} />
        <input name="to" type="date" defaultValue={to} className={inputClass} />
        <button className="btn rounded-lg border px-4 text-sm">Tampilkan</button>
        <a
          className="btn inline-flex items-center rounded-lg border px-4 text-sm"
          href={`/api/reports/export?type=${type}&from=${from}&to=${to}`}
        >
          CSV
        </a>
      </form>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                {columns.map((c) => (
                  <th key={c} className="py-2">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-line">
                    {Object.values(row).map((v, j) => (
                    <td key={j} className="py-2">
                      {v instanceof Date ? v.toLocaleString("id-ID") : String(v ?? "-")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
