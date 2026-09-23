import Link from "next/link";
import { desc } from "drizzle-orm";
import { Clock, Plus, Shield, UserCheck, Users } from "lucide-react";
import { getDb } from "@/lib/db";
import { users } from "@/lib/schema";
import type { Role } from "@/lib/rbac";
import { UserCatalog } from "./UserCatalog";
import { UserDetail } from "./UserDetail";

const PAGE_SIZE = 8;
const ROLE_LABEL = { ADMIN: "admin", MANAGER: "manajer", CASHIER: "kasir" } as const;

function share(count: number, total: number) {
  if (total <= 0) return "0% dari total";
  return `${Math.round((count / total) * 100)}% dari total`;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string; id?: string; new?: string }>;
}) {
  const params = await searchParams;
  const rows = await getDb().select().from(users).orderBy(desc(users.createdAt));
  const people = rows.map((row) => ({
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    phone: row.phone,
    role: row.role as Role,
    active: row.isActive,
    image: row.image,
    lastLogin: row.lastLogin ? row.lastLogin.toISOString() : null,
  }));
  const totalCount = people.length;
  const activeCount = people.filter((row) => row.active).length;
  const inactiveCount = totalCount - activeCount;
  const adminCount = people.filter((row) => row.role === "ADMIN").length;
  const q = params.q?.trim().toLowerCase() ?? "";
  const role = params.role === "ADMIN" || params.role === "MANAGER" || params.role === "CASHIER" ? params.role : "";
  const status = params.status === "active" || params.status === "inactive" ? params.status : "";
  const filtered = people.filter((row) => {
    if (q) {
      const haystack = `${row.name} ${row.email ?? ""} ${row.username} ${ROLE_LABEL[row.role]}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (role && row.role !== role) return false;
    if (status === "active" && !row.active) return false;
    if (status === "inactive" && row.active) return false;
    return true;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(params.page) || 1), pages);
  const startIndex = (page - 1) * PAGE_SIZE;
  const creating = params.new === "1";
  const current = creating ? null : people.find((row) => row.id === params.id) ?? null;
  const query = {
    q: params.q?.trim() ?? "",
    role,
    status,
    page: String(page),
    id: current?.id ?? "",
    fresh: creating ? "1" : "",
  };
  const back = new URLSearchParams();
  if (query.q) back.set("q", query.q);
  if (query.role) back.set("role", query.role);
  if (query.status) back.set("status", query.status);
  if (query.page !== "1") back.set("page", query.page);
  const cancelHref = back.size ? `/users?${back.toString()}` : "/users";

  return (
    <div>
      <div className="mt-1 mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pengguna</h1>
          <p className="mt-1 text-sm text-muted">Kelola akses pengguna, peran, dan izin sistem dengan mudah.</p>
        </div>
        <Link href="/users?new=1" className="btn inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white">
          <Plus size={16} aria-hidden />
          Tambah Pengguna
        </Link>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Users} label="Total Pengguna" value={String(totalCount)} hint="akun terdaftar" tone="bg-chip text-ink" />
        <Kpi icon={UserCheck} label="Aktif" value={String(activeCount)} hint={share(activeCount, totalCount)} tone="bg-ok-soft text-ok" />
        <Kpi icon={Clock} label="Nonaktif" value={String(inactiveCount)} hint={share(inactiveCount, totalCount)} tone="bg-warn-soft text-warn" />
        <Kpi icon={Shield} label="Admin" value={String(adminCount)} hint={share(adminCount, totalCount)} tone="bg-accent-soft text-accent" />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <UserCatalog
          query={query}
          rows={filtered.slice(startIndex, startIndex + PAGE_SIZE).map((row, index) => ({
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role,
            active: row.active,
            image: row.image,
            lastLogin: row.lastLogin,
            number: startIndex + index + 1,
          }))}
          total={filtered.length}
          page={page}
          pages={pages}
          start={filtered.length === 0 ? 0 : startIndex + 1}
          end={Math.min(startIndex + PAGE_SIZE, filtered.length)}
        />
        <aside className="rounded-2xl border border-line bg-surface p-4 shadow-card">
          {creating || current ? (
            <UserDetail key={current?.id ?? "new"} user={current} cancelHref={cancelHref} />
          ) : (
            <div>
              <h2 className="font-semibold">Detail Pengguna</h2>
              <p className="mt-3 text-sm text-muted">Pilih pengguna untuk melihat peran dan hak aksesnya.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  hint: string;
  tone: string;
}) {
  return (
    <article className="flex h-full min-h-36 flex-col rounded-2xl border border-line bg-surface p-4 shadow-card">
      <span className={`inline-flex size-10 items-center justify-center rounded-xl ${tone}`}>
        <Icon size={18} aria-hidden />
      </span>
      <p className="mt-3 text-sm text-muted">{label}</p>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-auto pt-1 text-xs text-muted">{hint}</p>
    </article>
  );
}
