import Link from "next/link";
import { desc } from "drizzle-orm";
import { closeShift, deleteShiftAdmin, openShift, updateShiftAdmin } from "@/app/actions/ops";
import {
  Card,
  Field,
  PageHeader,
  PrimaryButton,
  dangerActionClass,
  editActionClass,
  inputClass,
  tableCellClass,
  tableHeadCellClass,
  tableHeadRowClass,
} from "@/components/ui";
import { MoneyInput } from "@/components/MoneyInput";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { money, num } from "@/lib/format";
import { shifts, users } from "@/lib/schema";
import { getOpenShift } from "@/server/queries";
import { eq } from "drizzle-orm";

export default async function ShiftsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { edit } = await searchParams;
  const isAdmin = session.role === "ADMIN";
  const current = await getOpenShift(session.id);
  const db = getDb();
  const history = await db
    .select({
      id: shifts.id,
      openingAt: shifts.openingAt,
      closingAt: shifts.closingAt,
      openingCash: shifts.openingCash,
      cashSales: shifts.cashSales,
      closingCash: shifts.closingCash,
      difference: shifts.difference,
      status: shifts.status,
      note: shifts.note,
      cashier: users.name,
    })
    .from(shifts)
    .innerJoin(users, eq(users.id, shifts.userId))
    .orderBy(desc(shifts.openingAt))
    .limit(50);
  const editing = isAdmin && edit ? history.find((row) => row.id === edit) : undefined;
  const expected = current ? num(current.openingCash) + num(current.cashSales) : 0;
  return (
    <div>
      <PageHeader title="Shift" description="Checkout menolak penjualan jika shift belum terbuka." />
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Card>
          {editing ? (
            <form action={updateShiftAdmin} className="space-y-3" key={editing.id}>
              <input type="hidden" name="id" value={editing.id} />
              <h2 className="font-semibold">Ubah shift</h2>
              <p className="text-sm text-muted">
                {editing.cashier} · {editing.status === "open" ? "terbuka" : "ditutup"} · tunai {money(num(editing.cashSales))}
              </p>
              <Field label="Modal awal">
                <MoneyInput name="openingCash" defaultValue={num(editing.openingCash)} />
              </Field>
              {editing.status === "closed" ? (
                <Field label="Kas aktual / tutup">
                  <MoneyInput name="closingCash" defaultValue={num(editing.closingCash)} required />
                </Field>
              ) : null}
              <Field label="Catatan">
                <input name="note" className={inputClass} defaultValue={editing.note ?? ""} />
              </Field>
              <div className="flex gap-2">
                <PrimaryButton type="submit">Simpan</PrimaryButton>
                <Link href="/shifts" className="btn inline-flex items-center rounded-lg border border-line px-4 text-sm">
                  Batal
                </Link>
              </div>
            </form>
          ) : current ? (
            <form action={closeShift} className="space-y-3">
              <p className="text-sm">
                Dibuka {current.openingAt.toLocaleString("id-ID")} · modal {money(num(current.openingCash))}
              </p>
              <p className="text-sm">Penjualan tunai {money(num(current.cashSales))}</p>
              <p className="text-sm font-medium">Kas diharapkan {money(expected)}</p>
              <Field label="Kas aktual">
                <MoneyInput name="actualCash" required />
              </Field>
              <Field label="Catatan">
                <input name="note" className={inputClass} />
              </Field>
              <PrimaryButton type="submit">Tutup shift</PrimaryButton>
            </form>
          ) : (
            <form action={openShift} className="space-y-3">
              <Field label="Modal awal">
                <MoneyInput name="openingCash" defaultValue={0} />
              </Field>
              <PrimaryButton type="submit">Buka shift</PrimaryButton>
            </form>
          )}
        </Card>
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className={tableHeadRowClass}>
                <th className={tableHeadCellClass}>Kasir</th>
                <th className={tableHeadCellClass}>Status</th>
                <th className={tableHeadCellClass}>Modal</th>
                <th className={tableHeadCellClass}>Kas tutup</th>
                <th className={tableHeadCellClass}>Selisih</th>
                {isAdmin ? <th className={`${tableHeadCellClass} text-right`}>Aksi</th> : null}
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className={tableCellClass}>{row.cashier}</td>
                  <td className={tableCellClass}>{row.status === "open" ? "terbuka" : "ditutup"}</td>
                  <td className={tableCellClass}>{money(num(row.openingCash))}</td>
                  <td className={tableCellClass}>{row.closingCash != null ? money(num(row.closingCash)) : "-"}</td>
                  <td className={tableCellClass}>{row.difference ? money(num(row.difference)) : "-"}</td>
                  {isAdmin ? (
                    <td className={`${tableCellClass} text-right`}>
                      <div className="flex flex-row items-center justify-end gap-2">
                        <Link href={`/shifts?edit=${row.id}`} className={editActionClass}>
                          Ubah
                        </Link>
                        <form action={deleteShiftAdmin} className="inline">
                          <input type="hidden" name="id" value={row.id} />
                          <button type="submit" className={dangerActionClass}>
                            Hapus
                          </button>
                        </form>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
