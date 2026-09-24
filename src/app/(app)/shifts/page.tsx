import Link from "next/link";
import { CheckCircle2, CirclePlay, Clock, MoreHorizontal, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { closeShift, deleteShiftAdmin, openShift, updateShiftAdmin } from "@/app/actions/ops";
import { Field, PrimaryButton, inputClass } from "@/components/ui";
import { MoneyInput } from "@/components/MoneyInput";
import { getSession } from "@/lib/auth";
import { money, num } from "@/lib/format";
import { getOpenShift, shiftDesk, type ShiftDeskRow } from "@/server/queries";
import { ShiftFilters } from "./ShiftFilters";

const CARD = "rounded-2xl border border-line bg-surface p-4 shadow-card";
const ROLE: Record<string, string> = { ADMIN: "Admin", MANAGER: "Manajer", CASHIER: "Kasir" };

type Query = {
  status?: string;
  date?: string;
  cashier?: string;
  q?: string;
  page?: string;
  id?: string;
  edit?: string;
};

function href(current: Query, patch: Partial<Query>) {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value) params.set(key, value);
  }
  const text = params.toString();
  return text ? `/shifts?${text}` : "/shifts";
}

function clock(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

function longDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.slice(0, 1).toUpperCase()).join("") || "?";
}

function durationLabel(seconds: number) {
  const hours = Math.round(seconds / 3600);
  if (hours >= 1) return `${hours} jam`;
  return `${Math.max(0, Math.round(seconds / 60))} mnt`;
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

export default async function ShiftsPage({ searchParams }: { searchParams: Promise<Query> }) {
  const session = await getSession();
  if (!session) return null;
  const params = await searchParams;
  const isAdmin = session.role === "ADMIN";
  const current = await getOpenShift(session.id);
  const requestedId = params.edit || params.id || current?.id;
  const desk = await shiftDesk({
    status: params.status,
    date: params.date,
    cashierId: params.cashier,
    search: params.q,
    page: Number(params.page) || 1,
    id: requestedId,
  });
  const viewing = desk.selected;
  const query: Query = {
    status: params.status === "open" || params.status === "closed" ? params.status : "",
    date: params.date,
    cashier: params.cashier,
    q: params.q,
    page: desk.page > 1 ? String(desk.page) : "",
    id: viewing?.id,
    edit: params.edit,
  };
  const pages = Math.max(1, Math.ceil(desk.total / desk.pageSize));
  const start = desk.total === 0 ? 0 : (desk.page - 1) * desk.pageSize + 1;
  const end = Math.min(desk.page * desk.pageSize, desk.total);
  const ownOpen = viewing?.status === "open" && viewing.userId === session.id;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Shift</h1>
        <p className="mt-1 text-sm text-muted">Kelola aktivitas shift kasir dan pantau ringkasan kas harian.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={CirclePlay} label="Shift Aktif" value={String(desk.kpi.openCount)} hint="Sedang berjalan" tone="ok" />
        <Kpi icon={CheckCircle2} label="Shift Selesai" value={String(desk.kpi.closedToday)} hint="Hari ini" tone="ok" />
        <Kpi icon={Clock} label="Total Durasi" value={durationLabel(desk.kpi.durationSeconds)} hint="Hari ini" tone="warn" />
        <Kpi icon={Wallet} label="Total Kas Masuk" value={money(desk.kpi.cashToday)} tone="danger">
          <Delta current={desk.kpi.cashToday} previous={desk.kpi.cashYesterday} />
        </Kpi>
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className={`${CARD} min-w-0`}>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              <Tab href={href(query, { status: "", page: "" })} active={!query.status}>
                Semua Shift
              </Tab>
              <Tab href={href(query, { status: "open", page: "" })} active={query.status === "open"}>
                Shift Aktif
              </Tab>
              <Tab href={href(query, { status: "closed", page: "" })} active={query.status === "closed"}>
                Shift Selesai
              </Tab>
            </div>
            <ShiftFilters
              q={params.q}
              date={params.date}
              cashier={params.cashier}
              status={query.status}
              id={viewing?.id}
              edit={params.edit}
              cashiers={desk.cashiers}
            />
          </div>

          {desk.rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">Tidak ada shift yang cocok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] border-separate border-spacing-y-1.5 text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 pb-1 font-medium first:pl-4">No. Shift</th>
                    <th className="px-3 pb-1 font-medium">Kasir</th>
                    <th className="px-3 pb-1 font-medium">Waktu Mulai</th>
                    <th className="px-3 pb-1 font-medium">Waktu Selesai</th>
                    <th className="px-3 pb-1 font-medium">Modal Awal</th>
                    <th className="px-3 pb-1 font-medium">Total Penjualan</th>
                    <th className="px-3 pb-1 font-medium">Selisih</th>
                    <th className="px-3 pb-1 font-medium">Status</th>
                    <th className="px-3 pb-1 font-medium last:pr-4">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {desk.rows.map((row) => {
                    const selected = viewing?.id === row.id;
                    const tone = selected
                      ? "bg-accent-soft/50"
                      : row.status === "open"
                        ? "group-hover:bg-ok-soft"
                        : "group-hover:bg-accent-soft/45";
                    const cell = `px-3 py-2.5 align-middle transition-colors duration-ui first:rounded-l-2xl first:pl-4 last:rounded-r-2xl last:pr-4 ${tone}`;
                    return (
                      <tr key={row.id} className="group text-ink">
                        <td className={`relative font-medium ${cell}`}>
                          {selected ? <span aria-hidden className="absolute top-1/2 left-1.5 h-5 w-1 -translate-y-1/2 rounded-full bg-accent" /> : null}
                          {row.shiftNumber}
                        </td>
                        <td className={cell}>
                          <span className="inline-flex items-center gap-2">
                            <span className="inline-flex size-8 items-center justify-center rounded-full bg-white text-xs font-semibold text-accent ring-1 ring-line">
                              {initials(row.cashierName)}
                            </span>
                            <span className="font-medium">{row.cashierName}</span>
                          </span>
                        </td>
                        <td className={cell}>{clock(row.openingAt)}</td>
                        <td className={cell}>{row.closingAt ? clock(row.closingAt) : "-"}</td>
                        <td className={cell}>{money(num(row.openingCash))}</td>
                        <td className={`font-medium ${cell}`}>{money(num(row.sales))}</td>
                        <td className={`${cell} ${row.status === "closed" && num(row.difference) < 0 ? "font-medium text-danger" : ""}`}>
                          {row.status === "open" ? "-" : money(num(row.difference))}
                        </td>
                        <td className={cell}>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              row.status === "open" ? "bg-white text-ok ring-1 ring-ok" : "bg-ok-soft text-ok"
                            }`}
                          >
                            {row.status === "open" ? "Aktif" : "Selesai"}
                          </span>
                        </td>
                        <td className={cell}>
                          <div className="flex items-center gap-1">
                            <Link href={href(query, { id: row.id, edit: "" })} className="rounded-full border border-line bg-white px-3 py-1 text-xs font-medium">
                              Lihat
                            </Link>
                            {isAdmin ? <AdminMenu row={row} query={query} /> : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <p>
              Menampilkan {start} - {end} dari {desk.total} shift
            </p>
            <div className="flex items-center gap-1">
              <PageLink query={query} page={desk.page - 1} disabled={desk.page <= 1} label="Sebelumnya" />
              {Array.from({ length: pages }, (_, index) => index + 1)
                .filter((item) => pages <= 7 || Math.abs(item - desk.page) <= 2 || item === 1 || item === pages)
                .map((item, index, list) => {
                  const prev = list[index - 1];
                  return (
                    <span key={item} className="inline-flex items-center">
                      {prev && item - prev > 1 ? <span className="px-1">…</span> : null}
                      <PageLink query={query} page={item} current={item === desk.page} label={String(item)} />
                    </span>
                  );
                })}
              <PageLink query={query} page={desk.page + 1} disabled={desk.page >= pages} label="Berikutnya" />
            </div>
          </div>
        </section>

        <aside className={CARD}>
          {params.edit && viewing ? (
            <EditForm row={viewing} cancelHref={href(query, { edit: "" })} />
          ) : viewing ? (
            <ShiftPanel row={viewing} ownOpen={ownOpen} />
          ) : (
            <form action={openShift} className="space-y-3">
              <h2 className="font-semibold">Buka shift</h2>
              <p className="text-sm text-muted">Checkout menolak penjualan jika shift belum terbuka.</p>
              <Field label="Modal awal">
                <MoneyInput name="openingCash" defaultValue={0} />
              </Field>
              <PrimaryButton type="submit">Buka shift</PrimaryButton>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}

function ShiftPanel({ row, ownOpen }: { row: ShiftDeskRow; ownOpen: boolean }) {
  const expected = num(row.openingCash) + num(row.cashSales);
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold">{row.status === "open" ? "Shift Saat Ini" : "Detail Shift"}</h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.status === "open" ? "bg-ok-soft text-ok" : "bg-chip text-muted"}`}>
          {row.status === "open" ? "Sedang Berjalan" : "Selesai"}
        </span>
      </div>
      <p className="mt-3 font-semibold">{row.shiftNumber}</p>
      <p className="text-sm text-muted">{longDate(row.openingAt)}</p>
      <div className="mt-4 flex items-center gap-3">
        <span className="inline-flex size-10 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent">
          {initials(row.cashierName)}
        </span>
        <div>
          <p className="font-medium">{row.cashierName}</p>
          <p className="text-xs text-muted">{ROLE[row.cashierRole] || "Kasir"}</p>
        </div>
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Waktu Mulai</dt>
          <dd>{clock(row.openingAt)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Modal Kas Awal</dt>
          <dd>{money(num(row.openingCash))}</dd>
        </div>
      </dl>

      {ownOpen ? (
        <form action={closeShift} className="mt-4 space-y-3">
          <p className="rounded-xl bg-chip px-3 py-2 text-xs text-muted">
            Hitung dan masukkan uang fisik saat menutup shift untuk melihat selisih kas.
          </p>
          <p className="text-sm">Kas diharapkan {money(expected)}</p>
          <Field label="Kas aktual">
            <MoneyInput name="actualCash" required />
          </Field>
          <Field label="Catatan">
            <input name="note" className={inputClass} />
          </Field>
          <PrimaryButton type="submit" className="w-full">
            Tutup Shift
          </PrimaryButton>
        </form>
      ) : row.status === "open" ? (
        <p className="mt-4 text-sm text-muted">Shift ini dibuka oleh {row.cashierName}.</p>
      ) : null}

      <div className="mt-5 border-t border-line pt-4">
        <h3 className="font-semibold">Ringkasan Shift</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Jumlah Transaksi</dt>
            <dd>{row.trxCount}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Total Penjualan</dt>
            <dd>{money(num(row.sales))}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Pembayaran Tunai</dt>
            <dd>{money(num(row.cash))}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Pembayaran Non-Tunai</dt>
            <dd>{money(num(row.nonCash))}</dd>
          </div>
        </dl>
        <p className="mt-3 rounded-xl bg-ok-soft px-3 py-2 text-xs text-ok">Data real-time sesuai transaksi yang masuk pada shift ini.</p>
      </div>
    </div>
  );
}

function EditForm({ row, cancelHref }: { row: ShiftDeskRow; cancelHref: string }) {
  return (
    <form action={updateShiftAdmin} className="space-y-3">
      <input type="hidden" name="id" value={row.id} />
      <h2 className="font-semibold">Ubah shift</h2>
      <p className="text-sm text-muted">
        {row.shiftNumber} · {row.cashierName}
      </p>
      <Field label="Modal awal">
        <MoneyInput name="openingCash" defaultValue={num(row.openingCash)} />
      </Field>
      {row.status === "closed" ? (
        <Field label="Kas aktual / tutup">
          <MoneyInput name="closingCash" defaultValue={num(row.closingCash)} required />
        </Field>
      ) : null}
      <Field label="Catatan">
        <input name="note" className={inputClass} defaultValue={row.note ?? ""} />
      </Field>
      <div className="flex gap-2">
        <PrimaryButton type="submit">Simpan</PrimaryButton>
        <Link href={cancelHref} className="btn inline-flex items-center rounded-lg border border-line px-4 text-sm">
          Batal
        </Link>
      </div>
    </form>
  );
}

function AdminMenu({ row, query }: { row: ShiftDeskRow; query: Query }) {
  return (
    <details className="relative">
      <summary className="flex size-8 cursor-pointer list-none items-center justify-center rounded-full hover:bg-chip [&::-webkit-details-marker]:hidden" aria-label="Aksi shift">
        <MoreHorizontal size={16} />
      </summary>
      <div className="menu-pop absolute right-0 z-20 mt-1 w-36 rounded-xl border border-line bg-white p-1 shadow-card">
        <Link href={href(query, { id: row.id, edit: row.id })} className="block rounded-lg px-3 py-2 hover:bg-chip">
          Ubah
        </Link>
        <form action={deleteShiftAdmin}>
          <input type="hidden" name="id" value={row.id} />
          <button type="submit" className="w-full rounded-lg px-3 py-2 text-left text-danger hover:bg-chip">
            Hapus
          </button>
        </form>
      </div>
    </details>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  children,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  hint?: string;
  tone: "ok" | "warn" | "danger";
  children?: React.ReactNode;
}) {
  const tones = { ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", danger: "bg-danger/10 text-danger" };
  return (
    <div className={CARD}>
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex size-10 items-center justify-center rounded-2xl ${tones[tone]}`}>
          <Icon size={18} aria-hidden />
        </span>
      </div>
      <p className="mt-3 text-sm text-muted">{label}</p>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      {children ?? (hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null)}
    </div>
  );
}

function Tab({ href: to, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={to} className={`inline-flex h-10 items-center rounded-full px-3 text-sm font-medium transition-colors duration-ui ${active ? "bg-accent text-white" : "text-muted hover:bg-accent-soft"}`}>
      {children}
    </Link>
  );
}

function PageLink({
  query,
  page,
  current,
  disabled,
  label,
}: {
  query: Query;
  page: number;
  current?: boolean;
  disabled?: boolean;
  label: string;
}) {
  const className = `inline-flex h-9 min-w-9 items-center justify-center rounded-full px-2 ${
    current ? "bg-accent text-white" : "hover:bg-chip"
  } ${disabled ? "pointer-events-none opacity-40" : ""}`;
  if (disabled) return <span className={className}>{label}</span>;
  return (
    <Link href={href(query, { page: page > 1 ? String(page) : "" })} className={className} aria-current={current ? "page" : undefined}>
      {label}
    </Link>
  );
}
