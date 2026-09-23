import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { AlertTriangle, Box, OctagonAlert, Pencil, Plus, SlidersHorizontal, Warehouse } from "lucide-react";
import { moveInventory } from "@/app/actions/ops";
import { inputClass, PrimaryButton } from "@/components/ui";
import { getDb } from "@/lib/db";
import { money } from "@/lib/format";
import { inventoryItems, inventoryMovements } from "@/lib/schema";
import { InventoryCatalog } from "./InventoryCatalog";
import { InventoryEditor } from "./InventoryEditor";
import { ProductImage } from "@/components/ProductImage";

const PAGE_SIZE = 8;
const MOVE_LABEL = { in: "Masuk", out: "Keluar", adjustment: "Penyesuaian", sale: "Penjualan" } as const;

type Level = "safe" | "low" | "out";

function stockLevel(stock: number, minimum: number): Level {
  if (stock <= 0) return "out";
  if (stock <= minimum) return "low";
  return "safe";
}

function stockText(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(value);
}

function clock(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; level?: string; page?: string; id?: string; edit?: string; adjust?: string; new?: string; history?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();
  const rows = await db.select().from(inventoryItems).orderBy(inventoryItems.name);
  const items = rows.map((row) => {
    const stock = Number(row.currentStock);
    const minimum = Number(row.minimumStock);
    return {
      ...row,
      stock: Number.isFinite(stock) ? stock : 0,
      minimum: Number.isFinite(minimum) ? minimum : 0,
      costValue: Number(row.cost) || 0,
      level: stockLevel(Number.isFinite(stock) ? stock : 0, Number.isFinite(minimum) ? minimum : 0),
    };
  });
  const total = items.length;
  const safe = items.filter((row) => row.level === "safe").length;
  const low = items.filter((row) => row.level === "low").length;
  const out = items.filter((row) => row.level === "out").length;
  const q = params.q?.trim().toLowerCase() ?? "";
  const level = params.level === "safe" || params.level === "low" || params.level === "out" ? params.level : "";
  const filtered = items.filter((row) => {
    if (q && !row.name.toLowerCase().includes(q) && !row.sku.toLowerCase().includes(q)) return false;
    if (level && row.level !== level) return false;
    return true;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(params.page) || 1), pages);
  const startIndex = (page - 1) * PAGE_SIZE;
  const creating = params.new === "1";
  const selectedId = params.edit || params.adjust || params.id || "";
  const current = creating ? null : items.find((row) => row.id === selectedId) ?? null;
  const editing = Boolean(current && params.edit === current.id);
  const adjusting = Boolean(current && params.adjust === current.id);
  const showHistory = params.history === "1";
  const moves = current
    ? await db
        .select()
        .from(inventoryMovements)
        .where(eq(inventoryMovements.inventoryItemId, current.id))
        .orderBy(desc(inventoryMovements.createdAt))
        .limit(showHistory ? 30 : 6)
    : [];
  const visibleMoves = showHistory ? moves : moves.slice(0, 5);
  if (creating || editing) {
    return (
      <InventoryEditor
        key={current?.id ?? "new"}
        item={
          current
            ? {
                id: current.id,
                name: current.name,
                sku: current.sku,
                unit: current.unit,
                stock: current.stock,
                minimum: current.minimum,
                cost: current.costValue,
                status: current.status,
                image: current.image,
                createdAt: current.createdAt.toISOString(),
                updatedAt: current.updatedAt.toISOString(),
              }
            : null
        }
        lastStockAt={moves[0] ? moves[0].createdAt.toISOString() : null}
      />
    );
  }
  const query = {
    q: params.q?.trim() ?? "",
    level,
    page: String(page),
    id: current?.id ?? "",
    edit: editing ? current!.id : "",
    adjust: adjusting ? current!.id : "",
    fresh: creating ? "1" : "",
  };
  const backHref = current ? `/inventory?id=${current.id}` : "/inventory";

  return (
    <div>
      <p className="text-sm text-muted">
        <Link href="/products" className="hover:text-ink">
          Produk
        </Link>
        <span className="px-1.5">/</span>
        Inventori Bahan
      </p>
      <div className="mt-1 mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventori Bahan</h1>
          <p className="mt-1 text-sm text-muted">Kelola stok bahan baku, pantau pemakaian, dan pastikan ketersediaan untuk operasional.</p>
        </div>
        <Link href="/inventory?new=1" className="btn inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white">
          <Plus size={16} aria-hidden />
          Tambah Bahan
        </Link>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Box} label="Total Bahan" value={String(total)} hint="item bahan baku" tone="bg-chip text-ink" />
        <Kpi icon={Warehouse} label="Stok Aman" value={String(safe)} hint={share(safe, total)} tone="bg-ok-soft text-ok" />
        <Kpi icon={AlertTriangle} label="Stok Menipis" value={String(low)} hint={share(low, total)} tone="bg-warn-soft text-warn" />
        <Kpi icon={OctagonAlert} label="Stok Habis" value={String(out)} hint={share(out, total)} tone="bg-danger/10 text-danger" />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <InventoryCatalog
          query={query}
          rows={filtered.slice(startIndex, startIndex + PAGE_SIZE).map((row, index) => ({
            id: row.id,
            name: row.name,
            sku: row.sku,
            unit: row.unit,
            stock: row.stock,
            minimum: row.minimum,
            level: row.level,
            number: startIndex + index + 1,
          }))}
          total={filtered.length}
          page={page}
          pages={pages}
          start={filtered.length === 0 ? 0 : startIndex + 1}
          end={Math.min(startIndex + PAGE_SIZE, filtered.length)}
        />
        <aside className="rounded-2xl border border-line bg-surface p-4 shadow-card">
          {adjusting && current ? (
            <AdjustForm id={current.id} name={current.name} unit={current.unit} cancelHref={backHref} />
          ) : current ? (
            <div>
              <div className="flex items-start gap-3">
                <ProductImage kind="inventory" filename={current.image} name={current.name} className="size-16 shrink-0 rounded-2xl object-cover text-xl" />
                <div className="min-w-0">
                  <h2 className="font-semibold">{current.name}</h2>
                  <p className="text-sm text-muted">{current.sku}</p>
                  <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${current.level === "safe" ? "bg-ok-soft text-ok" : current.level === "low" ? "bg-warn-soft text-warn" : "bg-danger/10 text-danger"}`}>
                    {current.level === "safe" ? "Aman" : current.level === "low" ? "Menipis" : "Habis"}
                  </span>
                </div>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <Row label="SKU" value={current.sku} />
                <Row label="Satuan" value={current.unit} />
                <Row label="Stok Saat Ini" value={`${stockText(current.stock)} ${current.unit}`} />
                <Row label="Stok Minimum" value={`${stockText(current.minimum)} ${current.unit}`} />
                <Row label="Harga Beli" value={money(current.costValue)} />
                <Row label="Total Nilai Stok" value={money(Math.round(current.stock * current.costValue))} />
              </dl>
              <div className="mt-5 flex items-center justify-between gap-3">
                <h3 className="font-semibold">Riwayat Stok</h3>
                {moves.length > 5 && !showHistory ? (
                  <Link href={`/inventory?id=${current.id}&history=1`} className="text-sm font-medium text-accent">
                    Lihat Semua
                  </Link>
                ) : null}
              </div>
              {visibleMoves.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Belum ada gerakan stok.</p>
              ) : (
                <table className="mt-3 w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="pb-2 font-medium">Tanggal</th>
                      <th className="pb-2 font-medium">Aktivitas</th>
                      <th className="pb-2 text-right font-medium">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleMoves.map((move) => {
                      const amount = Number(move.quantity);
                      const incoming = move.type === "in" || (move.type === "adjustment" && amount >= 0);
                      const shown = Math.abs(amount);
                      return (
                        <tr key={move.id} className="border-t border-line">
                          <td className="py-2 pr-2">{clock(move.createdAt)}</td>
                          <td className="py-2 pr-2">{MOVE_LABEL[move.type]}</td>
                          <td className={`py-2 text-right font-medium ${incoming ? "text-ok" : "text-danger"}`}>
                            {incoming ? "+" : "-"}
                            {stockText(shown)} {current.unit}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Link href={`/inventory?id=${current.id}&edit=${current.id}`} className="btn inline-flex items-center justify-center gap-2 rounded-full border border-line text-sm font-medium">
                  <Pencil size={15} aria-hidden />
                  Ubah Bahan
                </Link>
                <Link href={`/inventory?id=${current.id}&adjust=${current.id}`} className="btn inline-flex items-center justify-center gap-2 rounded-full bg-accent text-sm font-semibold text-white">
                  <SlidersHorizontal size={15} aria-hidden />
                  Sesuaikan Stok
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="font-semibold">Detail Bahan</h2>
              <p className="mt-3 text-sm text-muted">Pilih bahan untuk melihat stok dan riwayatnya.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function share(count: number, total: number) {
  if (total <= 0) return "0% dari total";
  return `${Math.round((count / total) * 100)}% dari total`;
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Box;
  label: string;
  value: string;
  hint: string;
  tone: string;
}) {
  return (
    <article className="h-full rounded-2xl border border-line bg-surface p-4 shadow-card">
      <span className={`inline-flex size-10 items-center justify-center rounded-xl ${tone}`}>
        <Icon size={18} aria-hidden />
      </span>
      <p className="mt-3 text-sm text-muted">{label}</p>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted">{hint}</p>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function AdjustForm({ id, name, unit, cancelHref }: { id: string; name: string; unit: string; cancelHref: string }) {
  return (
    <form action={moveInventory} className="space-y-3">
      <h2 className="font-semibold">Sesuaikan Stok</h2>
      <p className="text-sm text-muted">{name}</p>
      <input type="hidden" name="id" value={id} />
      <label className="block text-sm">
        <span className="font-medium">Jenis</span>
        <select name="type" className={`${inputClass} mt-1.5`}>
          <option value="in">Masuk</option>
          <option value="out">Keluar</option>
          <option value="adjustment">Set stok baru</option>
        </select>
      </label>
      <label className="block text-sm">
        <span className="font-medium">Jumlah ({unit})</span>
        <input name="quantity" required inputMode="decimal" className={`${inputClass} mt-1.5`} placeholder="0" />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Catatan</span>
        <input name="note" className={`${inputClass} mt-1.5`} />
      </label>
      <div className="flex items-center justify-between gap-2 pt-2">
        <Link href={cancelHref} className="text-sm font-medium text-muted">
          Batal
        </Link>
        <PrimaryButton type="submit" className="rounded-full">
          Simpan
        </PrimaryButton>
      </div>
    </form>
  );
}
