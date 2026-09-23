import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Box,
  Calendar,
  PackagePlus,
  ShoppingBag,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { formatIdDecimal, money } from "@/lib/format";
import type { retailDashboard } from "@/server/queries";
import { CategoryDonut } from "./CategoryDonut";
import { RetailBarChart } from "./RetailBarChart";

type Data = Awaited<ReturnType<typeof retailDashboard>>;

const CARD = "rounded-2xl border border-line bg-surface p-5 shadow-card";
const WEEKDAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;
const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

function jakartaDate(value: string | Date | number = Date.now()) {
  return new Date(new Date(value).getTime() + JAKARTA_OFFSET_MS);
}

function greeting(name: string) {
  const hour = jakartaDate().getUTCHours();
  const hello = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 19 ? "Selamat sore" : "Selamat malam";
  const first = name.trim().split(/\s+/)[0] || "Admin";
  return `${hello}, ${first}`;
}

function formatJakarta(value: string | Date | number) {
  const date = jakartaDate(value);
  return `${WEEKDAYS[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
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

function Kpi({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <section className={CARD}>
      <div className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Icon size={20} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-1 truncate text-xl font-semibold tracking-tight sm:text-2xl">{value}</p>
          {children}
        </div>
      </div>
    </section>
  );
}

const ACTIONS = [
  { href: "/pos", label: "Mulai transaksi", icon: ShoppingCart },
  { href: "/products/new", label: "Tambah produk", icon: PackagePlus },
  { href: "/products", label: "Kelola stok", icon: Box },
  { href: "/reports", label: "Lihat laporan", icon: BarChart3 },
] as const;

export function RetailDashboard({ data, userName }: { data: Data; userName: string }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting(userName)}</h1>
          <p className="mt-1 text-sm text-muted">Kelola toko retail dengan lebih mudah.</p>
        </div>
        <p className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm shadow-card">
          <Calendar size={16} aria-hidden />
          {formatJakarta(Date.now())}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Wallet} label="Total penjualan" value={money(data.kpi.revenueToday)}>
          <Delta current={data.kpi.revenueToday} previous={data.kpi.revenueYesterday} />
        </Kpi>
        <Kpi icon={ShoppingBag} label="Jumlah transaksi" value={String(data.kpi.trxToday)}>
          <Delta current={data.kpi.trxToday} previous={data.kpi.trxYesterday} />
        </Kpi>
        <Kpi icon={Box} label="Produk terjual" value={String(data.kpi.itemsToday)}>
          <Delta current={data.kpi.itemsToday} previous={data.kpi.itemsYesterday} />
        </Kpi>
        <Kpi icon={Users} label="Pelanggan tercatat" value={String(data.kpi.customersToday)}>
          <Delta current={data.kpi.customersToday} previous={data.kpi.customersYesterday} />
        </Kpi>
      </div>

      <div className="grid items-stretch gap-4 xl:grid-cols-12">
        <section className={`${CARD} h-full xl:col-span-6`}>
          <RetailBarChart today={data.hourly} week={data.week} month={data.month} compare={data.compare} />
        </section>
        <section className={`${CARD} h-full xl:col-span-3`}>
          <CategoryDonut slices={data.categories} />
        </section>
        <section className={`${CARD} flex h-full flex-col justify-between bg-accent-soft xl:col-span-3`}>
          <div>
            <p className="text-sm font-medium text-accent">Katalog retail</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">Produk siap dijual di kasir</h2>
            <p className="mt-2 text-sm text-muted">Harga, stok, dan barang terlaris mengikuti katalog retail.</p>
          </div>
          <Link
            href="/products"
            className="btn mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white"
          >
            Lihat produk
            <ArrowRight size={16} aria-hidden />
          </Link>
        </section>
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-3">
        <section className={`${CARD} h-full`}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Produk terlaris</h2>
            <Link href="/products" className="shrink-0 text-sm text-accent hover:underline">
              Lihat semua
            </Link>
          </div>
          {data.top.length === 0 ? (
            <p className="py-6 text-sm text-muted">Belum ada barang retail terjual hari ini.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="py-2 pr-3 font-medium">Produk</th>
                  <th className="px-2 py-2 font-medium">Terjual</th>
                  <th className="py-2 pl-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.top.map((row, index) => (
                  <tr key={row.name} className="border-t border-line">
                    <td className="py-2.5 pr-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="w-4 shrink-0 text-xs text-muted">{index + 1}</span>
                        <ProductImage kind="products" filename={row.image} name={row.name} className="size-9 shrink-0 rounded-lg" />
                        <span className="min-w-0 truncate font-medium">{row.name}</span>
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-muted">{row.qty}</td>
                    <td className="py-2.5 pl-2 text-right whitespace-nowrap">{money(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className={`${CARD} h-full`}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Transaksi terbaru</h2>
            <Link href="/transactions" className="shrink-0 text-sm text-accent hover:underline">
              Lihat semua
            </Link>
          </div>
          {data.recent.length === 0 ? (
            <p className="py-6 text-sm text-muted">Belum ada transaksi retail.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {data.recent.map((row) => (
                <li key={row.id}>
                  <Link href={`/transactions/${row.id}`} className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-2 py-2.5">
                    <span className="text-muted">{row.time}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{row.number}</span>
                      <span className="block truncate text-xs text-muted">{row.customer}</span>
                    </span>
                    <span className="shrink-0 whitespace-nowrap">{money(row.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${CARD} flex h-full flex-col`}>
          <h2 className="font-semibold">Aksi cepat</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex min-h-16 flex-col justify-between rounded-xl border border-line bg-chip px-3 py-2 text-sm font-medium transition-colors hover:border-accent"
              >
                <action.icon size={16} aria-hidden />
                {action.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-semibold">Stok menipis</h2>
              <Link href="/products" className="shrink-0 text-sm text-accent hover:underline">
                Lihat semua
              </Link>
            </div>
            {data.lowStock.length === 0 ? (
              <p className="text-sm text-muted">Semua barang di atas stok minimum.</p>
            ) : (
              <ul className="space-y-2">
                {data.lowStock.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{row.name}</span>
                      <span className="text-xs text-muted">Sisa {formatIdDecimal(row.stock)}</span>
                    </span>
                    <Link href={`/products/${row.id}`} className="shrink-0 text-sm font-medium text-danger hover:underline">
                      Restock
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
