import Link from "next/link";
import {
  Receipt,
  Wallet,
  Calculator,
  Clock3,
  ShoppingCart,
  BarChart3,
  TriangleAlert,
} from "lucide-react";
import { EmptyState, GlassCard } from "@/components/ui";
import { dashboardStats, getOpenShift, retailDashboard } from "@/server/queries";
import { getSession } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { money, num, formatIdDecimal } from "@/lib/format";
import { normalizeShopMode } from "@/lib/theme";
import { RetailDashboard } from "./RetailDashboard";

const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"] as const;
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

function jakartaDate(value: string | Date | number = Date.now()) {
  return new Date(new Date(value).getTime() + JAKARTA_OFFSET_MS);
}

function greeting(name: string) {
  const hour = jakartaDate().getUTCHours();
  const hello = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 19 ? "Selamat sore" : "Selamat malam";
  return `${hello}, ${name.split(" ")[0]}`;
}

function dayLabel(value: string | Date) {
  return WEEKDAYS[jakartaDate(value).getUTCDay()];
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;
  const shopMode = normalizeShopMode(await getSetting("shop_mode", "fnb"));
  if (shopMode === "retail") {
    return <RetailDashboard data={await retailDashboard()} />;
  }
  const data = await dashboardStats(shopMode);
  const shift = await getOpenShift(session.id);
  const trx = Number(data.today.trx_count || 0);
  const revenue = num(data.today.revenue);
  const avg = trx ? revenue / trx : 0;
  const expected = shift ? num(shift.openingCash) + num(shift.cashSales) : 0;
  const maxRevenue = Math.max(...data.daily.map((row) => num(row.revenue)), 1);
  const cashRatio = shift && expected > 0 ? Math.min(100, Math.round((num(shift.cashSales) / expected) * 100)) : 0;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Ringkasan toko hari ini</p>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting(session.name)}</h1>
        </div>
        <Link href="/pos" className="btn inline-flex items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white">
          <ShoppingCart size={16} aria-hidden />
          Kasir
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Wallet} label="Omset hari ini" value={money(revenue)} hint="Penjualan selesai" />
        <Kpi icon={Receipt} label="Transaksi" value={String(trx)} hint="Nota hari ini" />
        <Kpi icon={Calculator} label="Rata-rata nota" value={money(avg)} hint="Omset / transaksi" />
        <Kpi icon={Clock3} label="Shift terbuka" value={String(data.openShifts)} hint="Kasir aktif" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <GlassCard>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">Omset</h2>
              <p className="text-sm text-muted">Sembilan hari terakhir</p>
            </div>
            <Link href="/reports?range=today" className="btn inline-flex items-center gap-2 rounded-full border border-line px-3 text-sm">
              <BarChart3 size={16} aria-hidden />
              Laporan
            </Link>
          </div>
          <div className="flex h-48 items-end gap-2">
            {data.daily.map((row) => {
              const value = num(row.revenue);
              const pct = value <= 0 ? 0 : Math.max(10, Math.round((value / maxRevenue) * 100));
              return (
                <div key={String(row.day)} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="flex h-40 w-full items-end justify-center">
                    <div
                      className="w-full rounded-t-2xl bg-accent/80"
                      style={{ height: `${pct}%` }}
                      title={money(value)}
                    />
                  </div>
                  <span className="text-[11px] capitalize text-muted">{dayLabel(row.day)}</span>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard>
            <h2 className="font-semibold">Status shift</h2>
            {shift ? (
              <>
                <p className="mt-1 text-sm text-muted">
                  Modal {money(num(shift.openingCash))} · tunai {money(num(shift.cashSales))}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-chip">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${cashRatio}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted">Kas diharapkan {money(expected)}</p>
                <Link href="/shifts" className="btn mt-3 inline-flex items-center rounded-full border border-line px-4 text-sm">
                  Tutup shift
                </Link>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted">Kasir menolak pembayaran sampai shift terbuka.</p>
                <Link href="/shifts" className="btn mt-3 inline-flex items-center rounded-full bg-accent px-4 text-sm font-semibold text-white">
                  Buka shift
                </Link>
              </>
            )}
          </GlassCard>

          <GlassCard>
            <h2 className="font-semibold">Stok menipis</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {data.lowGoods.length === 0 && data.lowInv.length === 0 ? (
                <li className="text-muted">Semua stok aman.</li>
              ) : null}
              {data.lowGoods.slice(0, 4).map((row) => (
                <li key={`g-${row.id}`}>
                  <Link href={`/products/${row.id}`} className="flex items-center justify-between gap-2 rounded-lg py-1 hover:bg-chip">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <TriangleAlert size={16} className="shrink-0 text-warn" aria-hidden />
                      <span className="truncate">{row.name}</span>
                    </span>
                    <span className="shrink-0 text-muted">
                      {formatIdDecimal(row.current_stock)}/{formatIdDecimal(row.minimum_stock)}
                    </span>
                  </Link>
                </li>
              ))}
              {data.lowInv.slice(0, 3).map((row) => (
                <li key={`i-${row.id}`}>
                  <Link href="/inventory" className="flex items-center justify-between gap-2 rounded-lg py-1 hover:bg-chip">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <TriangleAlert size={16} className="shrink-0 text-warn" aria-hidden />
                      <span className="truncate">{row.name}</span>
                    </span>
                    <span className="shrink-0 text-muted">
                      {formatIdDecimal(row.current_stock)}/{formatIdDecimal(row.minimum_stock)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </GlassCard>

          <GlassCard>
            <h2 className="font-semibold">Terlaris hari ini</h2>
            {data.top.length === 0 ? (
              <EmptyState title="Belum ada penjualan" description="Buka kasir untuk transaksi pertama." />
            ) : (
              <ol className="mt-3 space-y-2 text-sm">
                {data.top.map((row, i) => (
                  <li key={row.product_name} className="flex justify-between gap-2">
                    <span className="truncate">
                      {i + 1}. {row.product_name}
                    </span>
                    <span className="text-muted">{row.qty} pcs</span>
                  </li>
                ))}
              </ol>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Receipt;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <GlassCard>
      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Icon size={20} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-1 truncate text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted">{hint}</p>
        </div>
      </div>
    </GlassCard>
  );
}
