import Link from "next/link";
import { Banknote, CreditCard, Download, Info, Percent, QrCode, Receipt, ShoppingCart, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { formatIdDecimal, money } from "@/lib/format";
import { reportDesk } from "@/server/queries";
import { HourBars } from "./HourBars";
import { ReportDonut } from "./ReportDonut";
import { ReportFilters } from "./ReportFilters";

const TABS = [
  ["ringkasan", "Ringkasan"],
  ["penjualan", "Penjualan"],
  ["produk", "Produk"],
  ["kasir", "Kasir"],
  ["pembayaran", "Pembayaran"],
  ["pajak", "Pajak & Biaya"],
  ["shift", "Shift"],
  ["stok", "Stok"],
] as const;

type Tab = (typeof TABS)[number][0];

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
  debit: "Debit",
  credit: "Kredit",
  ewallet: "E-wallet",
};

const PAYMENT_ICON = {
  cash: Banknote,
  qris: QrCode,
  debit: CreditCard,
  credit: CreditCard,
  ewallet: Wallet,
} as const;

const PAYMENT_TONE: Record<string, string> = {
  cash: "bg-ok-soft text-ok",
  qris: "bg-accent-soft text-accent",
  debit: "bg-chip text-ink",
  credit: "bg-warn-soft text-warn",
  ewallet: "bg-accent-soft text-accent",
};

const PILL_TONE = ["bg-accent-soft text-accent", "bg-ok-soft text-ok", "bg-warn-soft text-warn", "bg-chip text-ink"];
const CARD = "rounded-2xl border border-line bg-surface p-5 shadow-card";
const PAGE_SIZE = 10;

function isTab(value: string | undefined): value is Tab {
  return TABS.some(([key]) => key === value);
}

function href(query: { from: string; to: string; cashier: string; method: string }, tab: Tab) {
  const params = new URLSearchParams();
  if (tab !== "ringkasan") params.set("tab", tab);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.cashier) params.set("cashier", query.cashier);
  if (query.method) params.set("method", query.method);
  const text = params.toString();
  return text ? `/reports?${text}` : "/reports";
}

function pageHref(query: { from: string; to: string; cashier: string; method: string }, tab: Tab, page: number) {
  const params = new URLSearchParams();
  if (tab !== "ringkasan") params.set("tab", tab);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.cashier) params.set("cashier", query.cashier);
  if (query.method) params.set("method", query.method);
  if (page > 1) params.set("page", String(page));
  const text = params.toString();
  return text ? `/reports?${text}` : "/reports";
}

function pageCount(total: number) {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

function clampPage(raw: string | undefined, total: number) {
  const parsed = Number(raw);
  const requested = Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
  return Math.min(requested, pageCount(total));
}

function pageSlice<T>(rows: T[], page: number) {
  const start = (page - 1) * PAGE_SIZE;
  return rows.slice(start, start + PAGE_SIZE);
}

function longDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1)),
  );
}

function clock(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <p className="mt-auto pt-2 text-xs leading-snug text-muted">0% vs. periode sebelumnya</p>;
  const pct = previous === 0 ? 100 : Math.round(((current - previous) / previous) * 100);
  const up = pct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <p className={`mt-auto flex flex-wrap items-center gap-1 pt-2 text-xs font-medium leading-snug ${up ? "text-ok" : "text-danger"}`}>
      <Icon size={14} aria-hidden />
      {up ? "+" : ""}
      {pct}% vs. periode sebelumnya
    </p>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
  current,
  previous,
}: {
  icon: typeof Receipt;
  label: string;
  value: string;
  tone: string;
  current: number;
  previous: number;
}) {
  return (
    <article className={`${CARD} flex h-full min-w-0 flex-col`}>
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon size={18} aria-hidden />
        </span>
        <p className="min-w-0 text-right text-sm leading-snug text-muted">{label}</p>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight break-words">{value}</p>
      <Delta current={current} previous={previous} />
    </article>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-sm text-muted">{text}</p>;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; from?: string; to?: string; cashier?: string; method?: string; page?: string }>;
}) {
  const params = await searchParams;
  const tab: Tab = isTab(params.tab) ? params.tab : "ringkasan";
  const desk = await reportDesk({
    from: params.from,
    to: params.to,
    cashierId: params.cashier,
    method: params.method,
  });
  const query = { from: desk.from, to: desk.to, cashier: desk.cashierId, method: desk.method };
  const pagedTotal =
    tab === "penjualan"
      ? desk.sales.length
      : tab === "produk"
        ? desk.products.length
        : tab === "pajak"
          ? desk.tax.length
          : tab === "shift"
            ? desk.shifts.length
            : tab === "stok"
              ? desk.stock.length
              : 0;
  const page = clampPage(params.page, pagedTotal);
  const salesPage = pageSlice(desk.sales, page);
  const productsPage = pageSlice(desk.products, page);
  const taxPage = pageSlice(desk.tax, page);
  const shiftsPage = pageSlice(desk.shifts, page);
  const stockPage = pageSlice(desk.stock, page);
  const paymentTotal = desk.payments.reduce((sum, row) => sum + row.total, 0);
  const exportParams = new URLSearchParams({ tab, from: desk.from, to: desk.to });
  if (desk.cashierId) exportParams.set("cashier", desk.cashierId);
  if (desk.method) exportParams.set("method", desk.method);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Laporan</h1>
          <p className="mt-1 text-sm text-muted">Analisis penjualan, transaksi, produk, dan aktivitas kas dalam satu tempat.</p>
        </div>
        <a href={`/api/reports/export?${exportParams.toString()}`} className="btn inline-flex shrink-0 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-medium">
          <Download size={15} aria-hidden />
          Ekspor Laporan
        </a>
      </div>

      <ReportFilters tab={tab} from={desk.from} to={desk.to} cashier={desk.cashierId} method={desk.method} cashiers={desk.cashiers} />

      <div className="mt-4 grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Banknote} label="Total Penjualan" value={money(desk.kpi.sales)} tone="bg-ok-soft text-ok" current={desk.kpi.sales} previous={desk.kpi.prevSales} />
        <Kpi icon={ShoppingCart} label="Jumlah Transaksi" value={String(desk.kpi.trx)} tone="bg-accent-soft text-accent" current={desk.kpi.trx} previous={desk.kpi.prevTrx} />
        <Kpi icon={Receipt} label="Rata-rata Transaksi" value={money(desk.kpi.average)} tone="bg-warn-soft text-warn" current={desk.kpi.average} previous={desk.kpi.prevAverage} />
        <Kpi icon={Percent} label="Total Diskon" value={money(desk.kpi.discount)} tone="bg-danger/10 text-danger" current={desk.kpi.discount} previous={desk.kpi.prevDiscount} />
      </div>

      <div className="mt-4 flex gap-1 overflow-x-auto">
        {TABS.map(([key, label]) => (
          <Link
            key={key}
            href={href(query, key)}
            className={`inline-flex h-10 shrink-0 items-center rounded-full px-3 text-sm font-medium transition-colors duration-ui ${
              tab === key ? "bg-accent text-white" : "text-muted hover:bg-accent-soft"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {tab === "ringkasan" ? (
        <div className="mt-4 space-y-4">
          <div className="grid items-stretch gap-4 xl:grid-cols-2">
            <section className={`${CARD} flex h-full min-w-0 flex-col`}>
              <HourBars hours={desk.hours} />
            </section>
            <section className={`${CARD} flex h-full min-w-0 flex-col`}>
              <ReportDonut slices={desk.categories} />
            </section>
          </div>
          <div className="grid items-stretch gap-4 xl:grid-cols-2">
            <section className={`${CARD} flex h-full min-w-0 flex-col`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="min-w-0 font-semibold">Produk Terlaris</h2>
                <Link href={href(query, "produk")} className="shrink-0 text-sm font-medium text-accent">
                  Lihat Semua
                </Link>
              </div>
              {desk.products.length === 0 ? (
                <Empty text="Belum ada produk terjual pada periode ini." />
              ) : (
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="w-8 pb-2 font-medium">#</th>
                      <th className="pb-2 font-medium">Produk</th>
                      <th className="w-28 pb-2 font-medium">Kategori</th>
                      <th className="w-16 pb-2 font-medium">Terjual</th>
                      <th className="w-36 pb-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {desk.products.slice(0, 5).map((row, index) => (
                      <tr key={row.id} className="h-14 border-t border-line">
                        <td className="pr-2 text-muted">{index + 1}</td>
                        <td className="pr-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <ProductImage kind="products" filename={row.image} name={row.name} className="size-9 shrink-0 rounded-xl object-cover text-xs" />
                            <span className="truncate font-medium">{row.name}</span>
                          </span>
                        </td>
                        <td className="pr-2">
                          <span className={`inline-block max-w-full truncate rounded-full px-2.5 py-1 text-xs font-medium ${PILL_TONE[index % PILL_TONE.length]}`}>{row.category}</span>
                        </td>
                        <td className="pr-2">{row.qty}</td>
                        <td className="text-right font-medium">{money(row.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
            <section className={`${CARD} flex h-full min-w-0 flex-col`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="min-w-0 font-semibold">Metode Pembayaran</h2>
                <Link href={href(query, "pembayaran")} className="shrink-0 text-sm font-medium text-accent">
                  Lihat Semua
                </Link>
              </div>
              <table className="w-full table-fixed text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="pb-2 font-medium">Metode</th>
                    <th className="w-24 pb-2 font-medium">Transaksi</th>
                    <th className="w-36 pb-2 font-medium">Total</th>
                    <th className="w-16 pb-2 text-right font-medium">%</th>
                  </tr>
                </thead>
                  <tbody>
                    {desk.payments.map((row) => {
                      const Icon = PAYMENT_ICON[row.method as keyof typeof PAYMENT_ICON] ?? Wallet;
                      const pct = paymentTotal > 0 ? Math.round((row.total / paymentTotal) * 100) : 0;
                      return (
                        <tr key={row.method} className="h-14 border-t border-line">
                          <td className="pr-2">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full ${PAYMENT_TONE[row.method] ?? "bg-chip text-ink"}`}>
                                <Icon size={16} aria-hidden />
                              </span>
                              <span className="truncate">{PAYMENT_LABEL[row.method] ?? row.method}</span>
                            </span>
                          </td>
                          <td className="pr-2">{row.trx}</td>
                          <td className="pr-2 font-medium">{money(row.total)}</td>
                          <td className="text-right">{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </section>
          </div>
        </div>
      ) : null}

      {tab === "penjualan" ? (
        <section className={`${CARD} mt-4`}>
          {desk.sales.length === 0 ? (
            <Empty text="Belum ada penjualan pada periode ini." />
          ) : (
            <>
              <Table
                columns={["Tanggal", "Jumlah Transaksi", "Total Penjualan"]}
                rows={salesPage.map((row) => [longDate(row.date), String(row.trx), money(row.total)])}
              />
              <Pager query={query} tab="penjualan" page={page} total={desk.sales.length} />
            </>
          )}
        </section>
      ) : null}

      {tab === "produk" ? (
        <section className={`${CARD} mt-4`}>
          {desk.products.length === 0 ? (
            <Empty text="Belum ada produk terjual pada periode ini." />
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="pb-2 font-medium">Produk</th>
                    <th className="pb-2 font-medium">Kategori</th>
                    <th className="pb-2 font-medium">Terjual</th>
                    <th className="pb-2 text-right font-medium">Total Penjualan</th>
                  </tr>
                </thead>
                <tbody>
                  {productsPage.map((row, index) => (
                    <tr key={row.id} className="border-t border-line">
                      <td className="py-2.5 pr-3">
                        <span className="inline-flex items-center gap-2 font-medium">
                          <ProductImage kind="products" filename={row.image} name={row.name} className="size-9 rounded-xl object-cover text-xs" />
                          {row.name}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${PILL_TONE[index % PILL_TONE.length]}`}>{row.category}</span>
                      </td>
                      <td className="py-2.5 pr-3">{row.qty}</td>
                      <td className="py-2.5 text-right font-medium">{money(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager query={query} tab="produk" page={page} total={desk.products.length} />
            </>
          )}
        </section>
      ) : null}

      {tab === "kasir" ? (
        <section className={`${CARD} mt-4`}>
          {desk.cashierRows.length === 0 ? (
            <Empty text="Belum ada penjualan kasir pada periode ini." />
          ) : (
            <Table
              columns={["Kasir", "Jumlah Transaksi", "Total Penjualan"]}
              rows={desk.cashierRows.map((row) => [row.name, String(row.trx), money(row.total)])}
            />
          )}
        </section>
      ) : null}

      {tab === "pembayaran" ? (
        <section className={`${CARD} mt-4`}>
          <Table
            columns={["Metode", "Jumlah Transaksi", "Total", "Persentase"]}
            rows={desk.payments.map((row) => [
              PAYMENT_LABEL[row.method] ?? row.method,
              String(row.trx),
              money(row.total),
              `${paymentTotal > 0 ? Math.round((row.total / paymentTotal) * 100) : 0}%`,
            ])}
          />
        </section>
      ) : null}

      {tab === "pajak" ? (
        <section className={`${CARD} mt-4`}>
          {desk.tax.length === 0 ? (
            <Empty text="Belum ada pajak atau biaya pada periode ini." />
          ) : (
            <>
              <Table
                columns={["Tanggal", "Pajak", "Biaya Layanan", "Total"]}
                rows={taxPage.map((row) => [longDate(row.date), money(row.tax), money(row.service), money(row.tax + row.service)])}
              />
              <Pager query={query} tab="pajak" page={page} total={desk.tax.length} />
            </>
          )}
        </section>
      ) : null}

      {tab === "shift" ? (
        <section className={`${CARD} mt-4`}>
          {desk.shifts.length === 0 ? (
            <Empty text="Belum ada shift pada periode ini." />
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[48rem] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted">
                  <tr>
                    {["Kasir", "Dibuka", "Ditutup", "Modal Awal", "Cash Sales", "Aktual", "Selisih"].map((column) => (
                      <th key={column} className="pb-2 pr-3 font-medium">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shiftsPage.map((row) => (
                    <tr key={`${row.cashier}-${row.openingAt}`} className="border-t border-line">
                      <td className="py-2.5 pr-3 font-medium">{row.cashier}</td>
                      <td className="py-2.5 pr-3">{clock(row.openingAt)}</td>
                      <td className="py-2.5 pr-3">{row.closingAt ? clock(row.closingAt) : "-"}</td>
                      <td className="py-2.5 pr-3">{money(row.openingCash)}</td>
                      <td className="py-2.5 pr-3">{money(row.cashSales)}</td>
                      <td className="py-2.5 pr-3">{row.closingCash == null ? "-" : money(row.closingCash)}</td>
                      <td className={`py-2.5 pr-3 ${row.difference != null && row.difference < 0 ? "text-danger" : ""}`}>
                        {row.difference == null ? "-" : money(row.difference)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager query={query} tab="shift" page={page} total={desk.shifts.length} />
            </>
          )}
        </section>
      ) : null}

      {tab === "stok" ? (
        <section className={`${CARD} mt-4`}>
          {desk.stock.length === 0 ? (
            <Empty text="Belum ada stok." />
          ) : (
            <>
              <Table
                columns={["Jenis", "Nama", "SKU", "Stok", "Minimum", "Nilai"]}
                rows={stockPage.map((row) => [
                  row.kind,
                  row.name,
                  row.sku,
                  formatIdDecimal(row.stock),
                  formatIdDecimal(row.minimum),
                  money(row.value),
                ])}
              />
              <Pager query={query} tab="stok" page={page} total={desk.stock.length} />
            </>
          )}
        </section>
      ) : null}

      <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted">
        <Info size={16} aria-hidden />
        Data pada laporan ini diperbarui sesuai transaksi yang masuk.
      </p>
    </div>
  );
}

function Pager({
  query,
  tab,
  page,
  total,
}: {
  query: { from: string; to: string; cashier: string; method: string };
  tab: Tab;
  page: number;
  total: number;
}) {
  const pages = pageCount(total);
  if (total === 0 || pages <= 1) return null;
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  const link = "inline-flex h-9 items-center rounded-full px-3 text-sm font-medium";
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
      <p>
        Menampilkan {start}–{end} dari {total}
      </p>
      <div className="flex gap-2">
        {page <= 1 ? (
          <span className={`${link} pointer-events-none opacity-40`}>Sebelumnya</span>
        ) : (
          <Link href={pageHref(query, tab, page - 1)} className={`${link} hover:bg-chip`}>
            Sebelumnya
          </Link>
        )}
        {page >= pages ? (
          <span className={`${link} pointer-events-none opacity-40`}>Berikutnya</span>
        ) : (
          <Link href={pageHref(query, tab, page + 1)} className={`${link} hover:bg-chip`}>
            Berikutnya
          </Link>
        )}
      </div>
    </div>
  );
}

function Table({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-muted">
          <tr>
            {columns.map((column) => (
              <th key={column} className="pb-2 pr-3 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-line">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className={`py-2.5 pr-3 ${cellIndex === 0 ? "font-medium" : ""}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
