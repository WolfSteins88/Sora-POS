import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { money, num, formatIdDecimal } from "@/lib/format";
import type { retailDashboard } from "@/server/queries";

type Data = Awaited<ReturnType<typeof retailDashboard>>;

const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"] as const;
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
const PAYMENT_LABEL: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
  debit: "Debit",
  credit: "Kredit",
  ewallet: "E-wallet",
};
const SLICE = ["#0369a1", "#0ea5e9", "#38bdf8", "#7dd3fc", "#bae6fd"];
const CARD = "rounded-2xl border border-line bg-surface p-5 shadow-card";

function dayLabel(value: string | Date) {
  const shifted = new Date(new Date(value).getTime() + JAKARTA_OFFSET_MS);
  return WEEKDAYS[shifted.getUTCDay()];
}

export function RetailDashboard({ data }: { data: Data }) {
  const trx = Number(data.today.trx_count || 0);
  const revenue = num(data.today.revenue);
  const avg = trx ? revenue / trx : 0;
  const maxRevenue = Math.max(...data.daily.map((row) => num(row.revenue)), 1);
  const peak = Math.max(...data.daily.map((row) => num(row.revenue)));
  const slices = data.payments
    .map((row) => ({ method: String(row.method), label: PAYMENT_LABEL[String(row.method)] ?? String(row.method), amount: num(row.amount) }))
    .filter((row) => row.amount > 0);
  const payTotal = slices.reduce((sum, row) => sum + row.amount, 0);
  let cursor = 0;
  const donut = slices
    .map((row, index) => {
      const pct = payTotal ? (row.amount / payTotal) * 100 : 0;
      const color = SLICE[index % SLICE.length];
      const stop = `${color} ${cursor}% ${cursor + pct}%`;
      cursor += pct;
      return stop;
    })
    .join(", ");
  const spark = data.daily.map((row, index) => {
    const x = data.daily.length <= 1 ? 0 : (index / (data.daily.length - 1)) * 120;
    const y = 32 - (num(row.revenue) / maxRevenue) * 26;
    return `${x},${y}`;
  });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ringkasan</h1>
          <p className="mt-1 text-sm text-muted">Penjualan barang, stok, dan pembayaran hari ini.</p>
        </div>
        <Link
          href="/pos"
          className="btn inline-flex items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white transition-all duration-200 hover:shadow-md active:scale-95"
        >
          <ShoppingCart size={16} aria-hidden />
          Kasir
        </Link>
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-3">
        <section className={`${CARD} flex h-full min-h-[320px] flex-col lg:col-span-2`}>
          <h2 className="font-semibold">Omset</h2>
          <p className="text-sm text-muted">Sembilan hari terakhir</p>
          <div className="mt-4 flex min-h-0 flex-1 items-end gap-2">
            {data.daily.map((row) => {
              const value = num(row.revenue);
              const pct = value <= 0 ? 4 : Math.max(12, Math.round((value / maxRevenue) * 100));
              const hot = value > 0 && value === peak;
              return (
                <div key={String(row.day)} className="flex h-full min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="flex min-h-0 w-full flex-1 items-end justify-center">
                    <div
                      className="w-full max-w-8 rounded-t-xl"
                      style={{
                        height: `${pct}%`,
                        background: hot
                          ? "#0369a1"
                          : "repeating-linear-gradient(-45deg, #7dd3fc 0 3px, #e0f2fe 3px 7px)",
                      }}
                      title={money(value)}
                    />
                  </div>
                  <span className="text-[11px] text-muted">{dayLabel(row.day)}</span>
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid h-full grid-rows-3 gap-4">
          <article className="flex h-full flex-col justify-between rounded-2xl bg-sidebar p-5 text-white shadow-card">
            <div>
              <p className="text-sm text-white/70">Nota hari ini</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{trx}</p>
              <p className="mt-1 text-xs text-white/70">Transaksi selesai</p>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white" style={{ width: trx ? "100%" : "0%" }} />
            </div>
          </article>
          <article
            className="flex h-full flex-col justify-center rounded-2xl p-5 text-white shadow-card"
            style={{ background: "linear-gradient(145deg, #0ea5e9, #0369a1)" }}
          >
            <p className="text-sm text-white/80">Omset hari ini</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{money(revenue)}</p>
            <p className="mt-1 text-xs text-white/80">Penjualan selesai</p>
          </article>
          <article className="flex h-full flex-col justify-between rounded-2xl border border-line bg-[#f8fafc] p-5 shadow-card">
            <div>
              <p className="text-sm text-muted">Rata-rata nota</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{money(avg)}</p>
              <p className="mt-1 text-xs text-muted">Omset / transaksi</p>
            </div>
            <svg viewBox="0 0 120 36" className="mt-3 h-10 w-full" aria-hidden>
              <polyline fill="none" stroke="#0369a1" strokeWidth="2" points={spark.join(" ")} />
            </svg>
          </article>
        </div>
      </div>

      <div className="mt-4 grid items-stretch gap-4 md:grid-cols-3">
        <section className={`${CARD} flex h-full min-h-[220px] flex-col`}>
          <h2 className="font-semibold">Metode bayar</h2>
          <p className="text-sm text-muted">Hari ini</p>
          {slices.length === 0 ? (
            <p className="mt-6 text-sm text-muted">Belum ada pembayaran hari ini.</p>
          ) : (
            <div className="mt-4 flex flex-1 items-center gap-4">
              <div
                className="relative size-28 shrink-0 rounded-full"
                style={{ background: `conic-gradient(${donut})` }}
                aria-hidden
              >
                <span className="absolute inset-4 rounded-full bg-surface" />
              </div>
              <ul className="min-w-0 space-y-2 text-sm">
                {slices.map((row, index) => (
                  <li key={row.method} className="flex items-center justify-between gap-3">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: SLICE[index % SLICE.length] }} />
                      <span className="truncate">{row.label}</span>
                    </span>
                    <span className="shrink-0 text-muted">{payTotal ? Math.round((row.amount / payTotal) * 100) : 0}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className={`${CARD} flex h-full min-h-[220px] flex-col`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Transaksi terakhir</h2>
            <Link href="/transactions" className="text-sm text-accent transition-all duration-200 hover:underline active:scale-95">
              Semua
            </Link>
          </div>
          {data.recent.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Belum ada transaksi.</p>
          ) : (
            <ul className="mt-3 flex-1 divide-y divide-line text-sm">
              {data.recent.map((row) => (
                <li key={row.transaction_number} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.transaction_number}</p>
                    <p className="text-xs text-muted">{row.status === "completed" ? "Selesai" : "Batal"}</p>
                  </div>
                  <span className="shrink-0">{money(row.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${CARD} flex h-full min-h-[220px] flex-col overflow-hidden`}>
          <h2 className="font-semibold">Penjualan produk</h2>
          <p className="text-sm text-muted">Terlaris hari ini</p>
          {data.products.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Belum ada barang retail terjual hari ini.</p>
          ) : (
            <div className="mt-3 -mx-5 flex-1 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="px-5 py-2 font-medium">Nama</th>
                    <th className="px-3 py-2 font-medium">Stok</th>
                    <th className="px-3 py-2 font-medium">Harga</th>
                    <th className="px-5 py-2 text-right font-medium">Terjual</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((row) => (
                    <tr key={row.product_name} className="border-t border-line">
                      <td className="px-5 py-2.5 font-medium">{row.product_name}</td>
                      <td className="px-3 py-2.5 text-muted">{formatIdDecimal(row.current_stock)}</td>
                      <td className="px-3 py-2.5">{money(row.unit_price)}</td>
                      <td className="px-5 py-2.5 text-right">{row.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
