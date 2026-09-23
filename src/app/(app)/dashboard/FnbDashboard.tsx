import type { ReactNode } from "react";
import Link from "next/link";
import { Calendar, Clock3, Receipt, ShoppingBag, ShoppingCart, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { formatIdDecimal, money, num } from "@/lib/format";
import type { fnbDashboard } from "@/server/queries";
import { CategoryDonut } from "./CategoryDonut";
import { SalesAreaChart } from "./SalesAreaChart";
import { WitaClock } from "./WitaClock";

type Data = Awaited<ReturnType<typeof fnbDashboard>>;

const CARD = "rounded-2xl border border-line bg-surface p-5 shadow-card";
const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"] as const;
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
const PAYMENT_LABEL: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
  debit: "Debit",
  credit: "Kredit",
  ewallet: "E-wallet",
};
const PAYMENT_CLASS: Record<string, string> = {
  cash: "bg-ok-soft text-ok",
  qris: "bg-accent-soft text-accent",
  debit: "bg-chip text-ink",
  credit: "bg-warn-soft text-warn",
  ewallet: "bg-accent-soft text-accent",
};

function jakartaDate(value: string | Date | number = Date.now()) {
  return new Date(new Date(value).getTime() + JAKARTA_OFFSET_MS);
}

function greeting(name: string) {
  const hour = jakartaDate().getUTCHours();
  const hello = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 19 ? "Selamat sore" : "Selamat malam";
  return `${hello}, ${name.split(" ")[0]}`;
}

function formatJakarta(value: string | Date | number, withTime = false) {
  const date = jakartaDate(value);
  const day = `${WEEKDAYS[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  if (!withTime) return day;
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day} ${hh}.${mm}`;
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous <= 0 && current <= 0) {
    return <p className="mt-1 text-xs text-muted">0% vs kemarin</p>;
  }
  if (previous <= 0) {
    return <p className="mt-1 text-xs font-medium text-ok">Baru vs kemarin</p>;
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  const up = pct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <p className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${up ? "text-ok" : "text-danger"}`}>
      <Icon size={14} aria-hidden />
      {Math.abs(pct)}% vs kemarin
    </p>
  );
}

export function FnbDashboard({ data, userName }: { data: Data; userName: string }) {
  const week = data.daily.slice(-7);
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting(userName)}</h1>
          <p className="mt-1 text-sm text-muted">Ringkasan toko hari ini.</p>
        </div>
        <div className="flex max-w-xl flex-wrap items-center justify-end gap-2">
          <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm shadow-card">
            <Calendar size={16} aria-hidden />
            {formatJakarta(Date.now())}
          </span>
          <WitaClock />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Wallet} tone="ok" label="Omset hari ini" value={money(data.kpi.revenueToday)}>
          <Delta current={data.kpi.revenueToday} previous={data.kpi.revenueYesterday} />
        </Kpi>
        <Kpi icon={Receipt} tone="accent" label="Transaksi" value={String(data.kpi.trxToday)}>
          <Delta current={data.kpi.trxToday} previous={data.kpi.trxYesterday} />
        </Kpi>
        <Kpi icon={ShoppingCart} tone="warn" label="Item terjual" value={String(data.kpi.itemsToday)}>
          <Delta current={data.kpi.itemsToday} previous={data.kpi.itemsYesterday} />
        </Kpi>
        <Kpi icon={ShoppingBag} tone="accent" label="Pesanan ditahan" value={String(data.kpi.held)}>
          <p className="mt-1 text-xs text-muted">Menunggu di kasir</p>
        </Kpi>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.9fr)_280px]">
        <section className={CARD}>
          <SalesAreaChart today={data.hourly} week={week} month={data.daily} />
        </section>
        <section className={CARD}>
          <CategoryDonut slices={data.categories} />
        </section>
        <section className={CARD}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Shift berjalan</h2>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${data.shift ? "bg-ok-soft text-ok" : "bg-chip text-muted"}`}
            >
              <span className={`size-2 rounded-full ${data.shift ? "bg-ok" : "bg-muted"}`} aria-hidden />
              {data.shift ? "Terbuka" : "Tutup"}
            </span>
          </div>
          {data.shift ? (
            <>
              <div className="mt-4 flex items-center gap-3">
                <span className="inline-flex size-11 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                  {initials(data.shift.cashier)}
                </span>
                <div>
                  <p className="text-xs text-muted">Kasir</p>
                  <p className="font-medium">{data.shift.cashier}</p>
                </div>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Mulai</dt>
                  <dd className="text-right">{formatJakarta(data.shift.openingAt, true)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Modal awal</dt>
                  <dd>{money(data.shift.openingCash)}</dd>
                </div>
              </dl>
              <Link href="/shifts" className="btn mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white">
                <Clock3 size={16} aria-hidden />
                Lihat shift
              </Link>
            </>
          ) : (
            <>
              <p className="mt-4 text-sm text-muted">Kasir menolak pembayaran sampai shift terbuka.</p>
              <Link href="/shifts" className="btn mt-5 inline-flex w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white">
                Buka shift
              </Link>
            </>
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <section className={CARD}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Produk terlaris</h2>
            <Link href="/products" className="text-sm text-accent">
              Lihat semua
            </Link>
          </div>
          {data.top.length === 0 ? (
            <p className="text-sm text-muted">Belum ada penjualan hari ini.</p>
          ) : (
            <ol className="space-y-3">
              {data.top.map((row, index) => (
                <li key={row.name} className="flex items-center gap-3">
                  <span className="w-4 text-sm text-muted">{index + 1}</span>
                  <ProductImage
                    kind="products"
                    filename={row.image}
                    name={row.name}
                    className="size-10 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.name}</p>
                    <p className="text-xs text-muted">{row.qty} terjual</p>
                  </div>
                  <span className="shrink-0 text-sm font-medium">{money(row.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className={CARD}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Transaksi terbaru</h2>
            <Link href="/transactions" className="text-sm text-accent">
              Lihat semua
            </Link>
          </div>
          {data.recent.length === 0 ? (
            <p className="text-sm text-muted">Belum ada transaksi.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="pb-2 font-medium">No.</th>
                    <th className="pb-2 font-medium">Jam</th>
                    <th className="pb-2 font-medium">Item</th>
                    <th className="pb-2 font-medium">Total</th>
                    <th className="pb-2 font-medium">Bayar</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((row) => (
                    <tr key={row.id} className="border-t border-line">
                      <td className="py-2">
                        <Link href={`/transactions/${row.id}`} className="font-medium hover:underline">
                          {row.number}
                        </Link>
                      </td>
                      <td className="py-2 text-muted">{row.time}</td>
                      <td className="py-2">{row.items}</td>
                      <td className="py-2">{money(row.total)}</td>
                      <td className="py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_CLASS[row.method] ?? "bg-chip text-ink"}`}>
                          {PAYMENT_LABEL[row.method] ?? (row.method || "-")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={CARD}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Peringatan stok</h2>
            <Link href="/inventory" className="text-sm text-accent">
              Lihat semua
            </Link>
          </div>
          {data.alerts.length === 0 ? (
            <p className="text-sm text-muted">Semua stok aman.</p>
          ) : (
            <ul className="space-y-1">
              {data.alerts.map((row) => {
                const danger = num(row.stock) <= 0 || (num(row.minimum) > 0 && num(row.stock) <= num(row.minimum) * 0.25);
                return (
                  <li key={row.id}>
                    <Link href={row.href} className="flex min-h-11 items-center gap-3 rounded-xl px-1 hover:bg-chip">
                      <span className={`size-2.5 shrink-0 rounded-full ${danger ? "bg-danger" : "bg-warn"}`} aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-sm">{row.name}</span>
                      <span className="shrink-0 text-sm text-muted">
                        {formatIdDecimal(row.stock)} {row.unit}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  tone,
  label,
  value,
  children,
}: {
  icon: typeof Receipt;
  tone: "ok" | "accent" | "warn";
  label: string;
  value: string;
  children: ReactNode;
}) {
  const toneClass =
    tone === "ok" ? "bg-ok-soft text-ok" : tone === "warn" ? "bg-warn-soft text-warn" : "bg-accent-soft text-accent";
  return (
    <section className={CARD}>
      <div className="flex items-start gap-3">
        <span className={`inline-flex size-11 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon size={20} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-1 truncate text-2xl font-semibold tracking-tight">{value}</p>
          {children}
        </div>
      </div>
    </section>
  );
}
