import type { ReactNode } from "react";
import Link from "next/link";
import { Ban, Receipt, ShoppingCart, TrendingDown, TrendingUp, Wallet, X } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { money, num } from "@/lib/format";
import { getSettingsMap } from "@/lib/settings";
import { normalizeShopMode } from "@/lib/theme";
import { getTransactionFull, transactionDesk } from "@/server/queries";
import { PrintButton } from "./[id]/PrintButton";
import { RefundButton } from "./RefundButton";
import { TransactionFilters } from "./TransactionFilters";

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
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const CARD = "rounded-2xl border border-line bg-surface p-4 shadow-card";

type Query = {
  q?: string;
  from?: string;
  to?: string;
  method?: string;
  status?: string;
  cashier?: string;
  page?: string;
  id?: string;
};

function href(current: Query, patch: Partial<Query>) {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value) params.set(key, value);
  }
  const text = params.toString();
  return text ? `/transactions?${text}` : "/transactions";
}

function formatWhen(value: string | Date) {
  const date = new Date(new Date(value).getTime() + 7 * 60 * 60 * 1000);
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()} ${hh}.${mm}`;
}

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous <= 0 && current <= 0) return <p className="mt-1 text-xs text-muted">0% vs kemarin</p>;
  if (previous <= 0) return <p className="mt-1 text-xs font-medium text-ok">Baru vs kemarin</p>;
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

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Query> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const [desk, settings, detail] = await Promise.all([
    transactionDesk({
      search: params.q,
      dateFrom: params.from,
      dateTo: params.to,
      method: params.method,
      status: params.status,
      cashierId: params.cashier,
      page,
    }),
    getSettingsMap(),
    params.id ? getTransactionFull(params.id) : Promise.resolve(null),
  ]);
  const currency = settings.currency || "Rp";
  const retail = normalizeShopMode(settings.shop_mode) === "retail";
  const pages = Math.max(1, Math.ceil(desk.total / desk.pageSize));
  const start = desk.total === 0 ? 0 : (desk.page - 1) * desk.pageSize + 1;
  const end = Math.min(desk.page * desk.pageSize, desk.total);
  const filters: Query = {
    q: params.q,
    from: params.from,
    to: params.to,
    method: params.method,
    status: params.status,
    cashier: params.cashier,
    page: String(desk.page),
    id: params.id,
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transaksi</h1>
          <p className="mt-1 text-sm text-muted">Lihat, cari, dan kelola riwayat transaksi toko.</p>
        </div>
        {settings.receipt_footer ? (
          <p className="max-w-xs text-right text-sm italic text-muted">&ldquo;{settings.receipt_footer}&rdquo;</p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Receipt} label="Total transaksi (hari ini)" value={String(desk.kpi.trxToday)} tone="accent">
          <Delta current={desk.kpi.trxToday} previous={desk.kpi.trxYesterday} />
        </Kpi>
        <Kpi icon={Wallet} label="Total penjualan (hari ini)" value={money(desk.kpi.revenueToday, currency)} tone="ok">
          <Delta current={desk.kpi.revenueToday} previous={desk.kpi.revenueYesterday} />
        </Kpi>
        <Kpi icon={ShoppingCart} label="Rata-rata transaksi" value={money(desk.kpi.avgToday, currency)} tone="warn">
          <Delta current={desk.kpi.avgToday} previous={desk.kpi.avgYesterday} />
        </Kpi>
        <Kpi icon={Ban} label="Transaksi dibatalkan" value={String(desk.kpi.cancelToday)} tone="danger">
          <Delta current={desk.kpi.cancelToday} previous={desk.kpi.cancelYesterday} />
        </Kpi>
      </div>

      <div className={`mt-4 grid items-start gap-4 ${detail ? "xl:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
        <section className={CARD}>
          <TransactionFilters
            q={params.q}
            from={params.from}
            to={params.to}
            method={params.method}
            status={params.status}
            cashier={params.cashier}
            payments={Object.entries(PAYMENT_LABEL).map(([value, label]) => ({ value, label }))}
            cashiers={desk.cashiers}
          />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="pb-2 font-medium" />
                  <th className="pb-2 font-medium">No. transaksi</th>
                  <th className="pb-2 font-medium">Tanggal</th>
                  <th className="pb-2 font-medium">Kasir</th>
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 font-medium">Total</th>
                  <th className="pb-2 font-medium">Bayar</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {desk.rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted">
                      Tidak ada transaksi pada filter ini.
                    </td>
                  </tr>
                ) : null}
                {desk.rows.map((row) => {
                  const selected = row.id === params.id;
                  const method = String(row.payment_method || "");
                  return (
                    <tr key={row.id} className={`border-t border-line ${selected ? "bg-chip" : ""}`}>
                      <td className="py-2">
                        <Link
                          href={href(filters, { id: row.id })}
                          aria-label={`Detail ${row.transaction_number}`}
                          className="inline-flex size-9 items-center justify-center"
                        >
                          <span
                            className={`inline-flex size-4 items-center justify-center rounded border ${selected ? "border-accent bg-accent text-white" : "border-line"}`}
                            aria-hidden
                          >
                            {selected ? "✓" : ""}
                          </span>
                        </Link>
                      </td>
                      <td className="py-2 font-medium">
                        <Link href={href(filters, { id: row.id })}>{row.transaction_number}</Link>
                      </td>
                      <td className="py-2 text-muted">{formatWhen(row.created_at)}</td>
                      <td className="py-2">{row.cashier_name}</td>
                      <td className="py-2">{row.item_count}</td>
                      <td className="py-2">{money(num(row.total), currency)}</td>
                      <td className="py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_CLASS[method] ?? "bg-chip text-ink"}`}>
                          {PAYMENT_LABEL[method] ?? (method || "-")}
                        </span>
                      </td>
                      <td className="py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${row.status === "cancelled" ? "bg-red-50 text-danger" : "bg-ok-soft text-ok"}`}
                        >
                          {row.status === "cancelled" ? "Refund" : "Selesai"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <p>
              Menampilkan {start}–{end} dari {desk.total} transaksi
            </p>
            <div className="flex items-center gap-1">
              {Array.from({ length: pages }, (_, index) => index + 1)
                .filter((n) => n === 1 || n === pages || Math.abs(n - desk.page) <= 1)
                .map((n, index, list) => {
                  const prev = list[index - 1];
                  return (
                    <span key={n} className="inline-flex items-center gap-1">
                      {prev && n - prev > 1 ? <span>…</span> : null}
                      <Link
                        href={href(filters, { page: String(n) })}
                        className={`inline-flex size-9 items-center justify-center rounded-full ${n === desk.page ? "bg-accent text-white" : "border border-line"}`}
                        aria-current={n === desk.page ? "page" : undefined}
                      >
                        {n}
                      </Link>
                    </span>
                  );
                })}
            </div>
          </div>
        </section>

        {detail ? (
          <aside className={`${CARD} xl:sticky xl:top-4`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{detail.transaction_number}</h2>
                <p className="text-xs text-muted">{formatWhen(detail.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${detail.status === "cancelled" ? "bg-red-50 text-danger" : "bg-ok-soft text-ok"}`}
                >
                  {detail.status === "cancelled" ? "Refund" : "Selesai"}
                </span>
                <Link href={href(filters, { id: "" })} aria-label="Tutup detail" className="inline-flex size-9 items-center justify-center rounded-full">
                  <X size={16} aria-hidden />
                </Link>
              </div>
            </div>
            <div className={`mt-3 grid gap-2 text-sm ${retail ? "grid-cols-1" : "grid-cols-2"}`}>
              <p>
                <span className="block text-xs text-muted">Kasir</span>
                {detail.cashier_name}
              </p>
              {retail ? null : (
                <p>
                  <span className="block text-xs text-muted">Meja</span>
                  {detail.order_type === "dine_in" ? detail.table_number || "-" : "Bawa pulang"}
                </p>
              )}
            </div>
            <ul className="mt-3 max-h-64 space-y-3 overflow-auto border-t border-line pt-3">
              {detail.items.map(
                (item: {
                  id: string;
                  product_name: string;
                  quantity: number;
                  subtotal: string;
                  product_image?: string | null;
                  variants?: { option_name: string }[];
                  addons?: { addon_name: string }[];
                }) => {
                  const extra = [
                    ...(item.variants ?? []).map((variant) => variant.option_name),
                    ...(item.addons ?? []).map((addon) => addon.addon_name),
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li key={item.id} className="flex items-center gap-3">
                      <ProductImage
                        kind="products"
                        filename={item.product_image}
                        name={item.product_name}
                        className="size-12 shrink-0 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.product_name}</p>
                        {extra ? <p className="truncate text-xs text-muted">{extra}</p> : null}
                      </div>
                      <span className="text-xs text-muted">{item.quantity}</span>
                      <span className="text-sm">{money(num(item.subtotal), currency)}</span>
                    </li>
                  );
                },
              )}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd>{money(num(detail.subtotal), currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Diskon</dt>
                <dd>- {money(num(detail.discount), currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Pajak</dt>
                <dd>{money(num(detail.tax), currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Service</dt>
                <dd>{money(num(detail.service_charge), currency)}</dd>
              </div>
              <div className="flex justify-between pt-1 text-base font-semibold">
                <dt>Total</dt>
                <dd>{money(num(detail.total), currency)}</dd>
              </div>
            </dl>
            {detail.payments?.[0] ? (
              <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Metode</dt>
                  <dd>{PAYMENT_LABEL[String(detail.payments[0].method)] ?? detail.payments[0].method}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Uang diterima</dt>
                  <dd>{money(num(detail.payments[0].amount), currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Kembalian</dt>
                  <dd>{money(num(detail.payments[0].change_amount), currency)}</dd>
                </div>
              </dl>
            ) : null}
            <div className="mt-4 flex gap-2">
              <PrintButton
                variant="ghost"
                label="Cetak ulang"
                settings={settings}
                transaction={{
                  transaction_number: String(detail.transaction_number),
                  created_at: String(detail.created_at),
                  total: String(detail.total),
                  items: detail.items.map((item: { product_name: string; quantity: number; subtotal: string | number }) => ({
                    product_name: item.product_name,
                    quantity: item.quantity,
                    subtotal: String(item.subtotal),
                  })),
                  payments: (detail.payments ?? []).map(
                    (payment: { method: string; amount: string | number; change_amount: string | number }) => ({
                      method: payment.method,
                      amount: String(payment.amount),
                      change_amount: String(payment.change_amount),
                    }),
                  ),
                }}
              />
              {detail.status === "completed" ? <RefundButton id={String(detail.id)} /> : null}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
  children,
}: {
  icon: typeof Receipt;
  label: string;
  value: string;
  tone: "accent" | "ok" | "warn" | "danger";
  children: ReactNode;
}) {
  const toneClass =
    tone === "ok"
      ? "bg-ok-soft text-ok"
      : tone === "warn"
        ? "bg-warn-soft text-warn"
        : tone === "danger"
          ? "bg-red-50 text-danger"
          : "bg-accent-soft text-accent";
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
