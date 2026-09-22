import Link from "next/link";
import { deleteAddon, saveAddon } from "@/app/actions/ops";
import { Card, Field, PageHeader, PrimaryButton, dangerActionClass, editActionClass, inputClass } from "@/components/ui";
import { MoneyInput } from "@/components/MoneyInput";
import { getDb } from "@/lib/db";
import { addons } from "@/lib/schema";
import { money, num } from "@/lib/format";

export default async function AddonsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const rows = await getDb().select().from(addons);
  const current = rows.find((row) => row.id === edit);
  return (
    <div>
      <PageHeader title="Add-on" description="Hanya dipakai produk racikan." />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <h2 className="mb-3 font-semibold">{current ? "Ubah add-on" : "Tambah"}</h2>
          <form action={saveAddon} className="space-y-3" key={current?.id ?? "new"}>
            {current ? <input type="hidden" name="id" value={current.id} /> : null}
            <Field label="Nama">
              <input name="name" required defaultValue={current?.name} key={current?.id ?? "new"} className={inputClass} />
            </Field>
            <Field label="Harga">
              <MoneyInput name="price" defaultValue={current?.price ?? 0} />
            </Field>
            <Field label="Urutan">
              <input name="sortOrder" type="number" defaultValue={current?.sortOrder ?? 0} className={inputClass} />
            </Field>
            <Field label="Status">
              <select name="status" className={inputClass} defaultValue={current?.status ?? "active"}>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </Field>
            <div className="flex gap-2">
              <PrimaryButton type="submit">{current ? "Simpan" : "Tambah"}</PrimaryButton>
              {current ? (
                <Link href="/products/addons" className="btn inline-flex items-center rounded-lg border border-line px-4 text-sm">
                  Batal
                </Link>
              ) : null}
            </div>
          </form>
        </Card>
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-2">Nama</th>
                <th>Harga</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="py-2">{row.name}</td>
                  <td>{money(num(row.price))}</td>
                  <td>{row.status}</td>
                  <td className="text-right">
                    <div className="flex flex-row items-center justify-end gap-2">
                      <Link href={`/products/addons?edit=${row.id}`} className={editActionClass}>
                        Ubah
                      </Link>
                      <form action={deleteAddon} className="inline">
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
        </Card>
      </div>
    </div>
  );
}
