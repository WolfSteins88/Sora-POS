import Link from "next/link";
import { desc } from "drizzle-orm";
import { deleteInventoryItem, moveInventory, saveInventoryItem } from "@/app/actions/ops";
import {
  Card,
  Field,
  PageHeader,
  PrimaryButton,
  compactInputClass,
  dangerActionClass,
  editActionClass,
  ghostButtonClass,
  inputClass,
  neutralActionClass,
  tableCellClass,
  tableHeadCellClass,
  tableHeadRowClass,
} from "@/components/ui";
import { MoneyInput } from "@/components/MoneyInput";
import { IdNumberInput } from "@/components/IdNumberInput";
import { getDb } from "@/lib/db";
import { inventoryItems, inventoryMovements } from "@/lib/schema";
import { num } from "@/lib/format";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const db = getDb();
  const rows = await db.select().from(inventoryItems);
  const moves = await db.select().from(inventoryMovements).orderBy(desc(inventoryMovements.createdAt)).limit(20);
  const current = rows.find((row) => row.id === edit);
  return (
    <div>
      <PageHeader title="Inventori bahan" description="Bahan baku untuk racikan. Gerakan stok memakai kunci baris." />
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Card>
          <h2 className="mb-3 font-semibold">{current ? "Ubah bahan" : "Tambah bahan"}</h2>
          <form action={saveInventoryItem} className="space-y-3" key={current?.id ?? "new"}>
            {current ? <input type="hidden" name="id" value={current.id} /> : null}
            <Field label="Nama">
              <input name="name" required defaultValue={current?.name} key={current?.id ?? "new"} className={inputClass} />
            </Field>
            <Field label="SKU" hint={current ? undefined : "Otomatis saat simpan"}>
              {current ? (
                <>
                  <input className={`${inputClass} bg-chip`} value={current.sku} readOnly />
                  <input type="hidden" name="sku" value={current.sku} />
                </>
              ) : (
                <input className={`${inputClass} bg-chip`} disabled placeholder="Otomatis saat simpan" />
              )}
            </Field>
            <Field label="Satuan">
              <select name="unit" className={inputClass} defaultValue={current?.unit ?? "pcs"}>
                <option value="pcs">pcs</option>
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="ml">ml</option>
                <option value="liter">liter</option>
              </select>
            </Field>
            {current ? null : (
              <Field label="Stok" hint="Boleh koma, contoh 15,5. Setelah tersimpan, ubah stok lewat gerakan.">
                <IdNumberInput name="currentStock" defaultValue={0} />
              </Field>
            )}
            <Field label="Minimum">
              <IdNumberInput name="minimumStock" defaultValue={current?.minimumStock ?? 0} />
            </Field>
            <Field label="HPP">
              <MoneyInput name="cost" defaultValue={current?.cost ?? 0} />
            </Field>
            <Field label="Status">
              <select name="status" className={inputClass} defaultValue={current?.status ?? "active"}>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </Field>
            <div className="flex gap-2">
              <PrimaryButton type="submit">{current ? "Simpan" : "Simpan bahan"}</PrimaryButton>
              {current ? (
                <Link href="/inventory" className={ghostButtonClass}>
                  Batal
                </Link>
              ) : null}
            </div>
          </form>
        </Card>
        <div className="space-y-4">
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={tableHeadRowClass}>
                    <th className={tableHeadCellClass}>Bahan</th>
                    <th className={tableHeadCellClass}>Stok</th>
                    <th className={tableHeadCellClass}>Gerakan</th>
                    <th className={`${tableHeadCellClass} text-right`}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-line last:border-0 align-middle">
                      <td className={tableCellClass}>
                        <p className="font-semibold">{row.name}</p>
                        <p className="text-xs text-muted">
                          {row.sku} · {row.unit} · {row.status}
                        </p>
                      </td>
                      <td className={tableCellClass}>
                        {num(row.currentStock)}
                        {num(row.currentStock) <= num(row.minimumStock) ? (
                          <span className="ml-1 text-warn">rendah</span>
                        ) : null}
                      </td>
                      <td className={tableCellClass}>
                        <form action={moveInventory} className="flex flex-nowrap items-center gap-2">
                          <input type="hidden" name="id" value={row.id} />
                          <select name="type" className={compactInputClass} aria-label="Jenis gerakan">
                            <option value="in">Masuk</option>
                            <option value="out">Keluar</option>
                            <option value="adjustment">Set</option>
                          </select>
                          <input
                            name="quantity"
                            inputMode="decimal"
                            aria-label="Jumlah"
                            className={`${compactInputClass} w-24`}
                            required
                          />
                          <button type="submit" className={neutralActionClass}>
                            OK
                          </button>
                        </form>
                      </td>
                      <td className={`${tableCellClass} text-right`}>
                        <div className="flex flex-row items-center justify-end gap-2">
                          <Link href={`/inventory?edit=${row.id}`} className={editActionClass}>
                            Ubah
                          </Link>
                          <form action={deleteInventoryItem} className="inline">
                            <input type="hidden" name="id" value={row.id} />
                            <button type="submit" className={dangerActionClass}>
                              Hapus
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card>
            <h2 className="font-semibold">Mutasi terakhir</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {moves.map((m) => (
                <li key={m.id}>
                  {m.type} {num(m.quantity)} · {m.stockBefore} → {m.stockAfter} · {m.reference}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
