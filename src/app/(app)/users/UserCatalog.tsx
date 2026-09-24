"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, List, MoreHorizontal, Search } from "lucide-react";
import { resetUserPassword } from "@/app/actions/ops";
import { ProductImage } from "@/components/ProductImage";

const PILL = "h-11 shrink-0 rounded-full border border-line bg-white px-3 text-sm outline-none focus:border-accent";

export type UserRow = {
  id: string;
  name: string;
  email: string | null;
  role: "ADMIN" | "MANAGER" | "CASHIER";
  active: boolean;
  image: string | null;
  lastLogin: string | null;
  number: number;
};

type Query = {
  q: string;
  role: string;
  status: string;
  page: string;
  id: string;
  fresh: string;
};

const ROLE_LABEL = { ADMIN: "Admin", MANAGER: "Manajer", CASHIER: "Kasir" } as const;
const ROLE_CLASS = {
  ADMIN: "bg-white text-accent ring-1 ring-accent/30",
  MANAGER: "bg-white text-ink ring-1 ring-line",
  CASHIER: "bg-ok-soft text-ok",
} as const;

function href(query: Query, patch: Partial<Query>) {
  const next = { ...query, ...patch };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.role) params.set("role", next.role);
  if (next.status) params.set("status", next.status);
  if (next.page && next.page !== "1") params.set("page", next.page);
  if (next.id) params.set("id", next.id);
  if (next.fresh) params.set("new", "1");
  const text = params.toString();
  return text ? `/users?${text}` : "/users";
}

export function loginText(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function UserCatalog({
  query,
  rows,
  total,
  page,
  pages,
  start,
  end,
}: {
  query: Query;
  rows: UserRow[];
  total: number;
  page: number;
  pages: number;
  start: number;
  end: number;
}) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "grid">("list");
  const [checked, setChecked] = useState<string[]>([]);
  const pageIds = rows.map((row) => row.id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => checked.includes(id));

  function open(id: string) {
    router.push(href(query, { id, fresh: "" }));
  }

  return (
    <section className="min-w-0 rounded-2xl border border-line bg-surface p-4 shadow-card">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form
          method="get"
          action="/users"
          className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
          onChange={(event) => {
            const target = event.target;
            if (target instanceof HTMLInputElement && target.name === "q") return;
            event.currentTarget.requestSubmit();
          }}
        >
          {query.id ? <input type="hidden" name="id" value={query.id} /> : null}
          {query.fresh ? <input type="hidden" name="new" value="1" /> : null}
          <label className="relative min-w-40 flex-1 basis-52">
            <span className="sr-only">Cari pengguna</span>
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden />
            <input
              name="q"
              defaultValue={query.q}
              placeholder="Cari nama, email, atau peran..."
              className="h-11 w-full rounded-full border border-line bg-white pr-3 pl-9 text-sm outline-none focus:border-accent"
            />
          </label>
          <select name="role" defaultValue={query.role} aria-label="Peran" className={PILL}>
            <option value="">Semua Peran</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manajer</option>
            <option value="CASHIER">Kasir</option>
          </select>
          <select name="status" defaultValue={query.status} aria-label="Status" className={PILL}>
            <option value="">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
          <button type="submit" className="sr-only">
            Terapkan
          </button>
        </form>
        <div className="inline-flex h-11 items-center rounded-full border border-line bg-white p-1">
          <button
            type="button"
            aria-label="Tampilan daftar"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
            className={`inline-flex size-9 items-center justify-center rounded-full ${view === "list" ? "bg-accent text-white" : "text-muted"}`}
          >
            <List size={16} />
          </button>
          <button
            type="button"
            aria-label="Tampilan kartu"
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
            className={`inline-flex size-9 items-center justify-center rounded-full ${view === "grid" ? "bg-accent text-white" : "text-muted"}`}
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Tidak ada pengguna yang cocok.</p>
      ) : view === "list" ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] border-separate border-spacing-y-1.5 text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="w-8 px-3 pb-1 font-medium first:pl-4">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={() =>
                      setChecked((current) => (allChecked ? current.filter((id) => !pageIds.includes(id)) : [...new Set([...current, ...pageIds])]))
                    }
                    aria-label="Pilih semua pengguna di halaman ini"
                  />
                </th>
                <th className="px-3 pb-1 font-medium">#</th>
                <th className="px-3 pb-1 font-medium">Foto</th>
                <th className="px-3 pb-1 font-medium">Nama Lengkap</th>
                <th className="px-3 pb-1 font-medium">Email</th>
                <th className="px-3 pb-1 font-medium">Peran</th>
                <th className="px-3 pb-1 font-medium">Status</th>
                <th className="px-3 pb-1 font-medium">Terakhir Login</th>
                <th className="px-3 pb-1 font-medium last:pr-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const selected = query.id === row.id;
                const tone = selected ? "bg-accent-soft/50" : "group-hover:bg-accent-soft/40";
                const cell = `h-14 px-3 align-middle transition-colors duration-ui first:rounded-l-2xl first:pl-4 last:rounded-r-2xl last:pr-4 ${tone}`;
                return (
                  <tr key={row.id} onClick={() => open(row.id)} className="group cursor-pointer text-ink">
                    <td className={cell} onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={checked.includes(row.id)}
                        onChange={() => setChecked((current) => (current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id]))}
                        aria-label={`Pilih ${row.name}`}
                      />
                    </td>
                    <td className={`${cell} text-muted`}>{row.number}</td>
                    <td className={cell}>
                      <ProductImage kind="users" filename={row.image} name={row.name} className="size-10 shrink-0 rounded-full bg-white object-cover ring-1 ring-white" />
                    </td>
                    <td className={cell}>
                      <span className="whitespace-nowrap font-medium">{row.name}</span>
                    </td>
                    <td className={`${cell} whitespace-nowrap`}>{row.email || "—"}</td>
                    <td className={cell}>
                      <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-semibold ${ROLE_CLASS[row.role]}`}>{ROLE_LABEL[row.role]}</span>
                    </td>
                    <td className={cell}>
                      <StatusPill active={row.active} />
                    </td>
                    <td className={`${cell} whitespace-nowrap`}>{loginText(row.lastLogin)}</td>
                    <td className={cell} onClick={(event) => event.stopPropagation()}>
                      <RowMenu id={row.id} name={row.name} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => {
            const selected = query.id === row.id;
            return (
              <article
                key={row.id}
                onClick={() => open(row.id)}
                className={`cursor-pointer rounded-2xl border p-3 ${selected ? "border-accent bg-accent-soft/40" : "border-line hover:bg-accent-soft/30"}`}
              >
                <div className="flex items-start gap-3">
                  <ProductImage kind="users" filename={row.image} name={row.name} className="size-12 shrink-0 rounded-full object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{row.name}</p>
                    <p className="truncate text-sm text-muted">{row.email || "—"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_CLASS[row.role]}`}>{ROLE_LABEL[row.role]}</span>
                      <StatusPill active={row.active} />
                    </div>
                  </div>
                  <RowMenu id={row.id} name={row.name} />
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <p>
          Menampilkan {start} - {end} dari {total} pengguna
        </p>
        <div className="flex items-center gap-1">
          <PageLink query={query} page={page - 1} disabled={page <= 1} label="Sebelumnya" />
          {Array.from({ length: pages }, (_, index) => index + 1)
            .filter((item) => pages <= 7 || Math.abs(item - page) <= 2 || item === 1 || item === pages)
            .map((item, index, list) => {
              const prev = list[index - 1];
              return (
                <span key={item} className="inline-flex items-center">
                  {prev && item - prev > 1 ? <span className="px-1">…</span> : null}
                  <PageLink query={query} page={item} current={item === page} label={String(item)} />
                </span>
              );
            })}
          <PageLink query={query} page={page + 1} disabled={page >= pages} label="Berikutnya" />
        </div>
      </div>
    </section>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-semibold ${active ? "bg-ok-soft text-ok" : "bg-danger/10 text-danger"}`}>
      {active ? "Aktif" : "Nonaktif"}
    </span>
  );
}

function RowMenu({ id, name }: { id: string; name: string }) {
  return (
    <details className="relative" onClick={(event) => event.stopPropagation()}>
      <summary className="flex size-8 cursor-pointer list-none items-center justify-center rounded-full bg-white hover:bg-chip [&::-webkit-details-marker]:hidden" aria-label={`Aksi ${name}`}>
        <MoreHorizontal size={16} />
      </summary>
      <div className="menu-pop absolute right-0 z-20 mt-1 w-40 rounded-xl border border-line bg-white p-1 shadow-card">
        <form action={resetUserPassword}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="password" value="password123" />
          <button type="submit" className="w-full rounded-lg px-3 py-2 text-left hover:bg-chip">
            Reset sandi
          </button>
        </form>
      </div>
    </details>
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
    <Link href={href(query, { page: page > 1 ? String(page) : "1" })} className={className} aria-current={current ? "page" : undefined}>
      {label}
    </Link>
  );
}
