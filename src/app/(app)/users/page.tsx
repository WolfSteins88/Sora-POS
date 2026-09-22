import Link from "next/link";
import { desc } from "drizzle-orm";
import { deleteUser, resetUserPassword, saveUser } from "@/app/actions/ops";
import { Card, Field, PageHeader, PrimaryButton, dangerActionClass, editActionClass, neutralActionClass, inputClass } from "@/components/ui";
import { getDb } from "@/lib/db";
import { users } from "@/lib/schema";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const rows = await getDb().select().from(users).orderBy(desc(users.createdAt));
  const current = rows.find((row) => row.id === edit);
  return (
    <div>
      <PageHeader title="Pengguna" description="RBAC ADMIN / MANAGER / CASHIER." />
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Card>
          <h2 className="mb-3 font-semibold">{current ? "Ubah pengguna" : "Tambah"}</h2>
          <form action={saveUser} className="space-y-3" key={current?.id ?? "new"}>
            {current ? <input type="hidden" name="id" value={current.id} /> : null}
            <Field label="Nama">
              <input name="name" required defaultValue={current?.name} key={current?.id ?? "new"} className={inputClass} />
            </Field>
            <Field label="Username">
              <input name="username" required defaultValue={current?.username} className={inputClass} />
            </Field>
            <Field label="Email">
              <input name="email" type="email" defaultValue={current?.email ?? ""} className={inputClass} />
            </Field>
            <Field label="Password" hint={current ? "Kosongkan jika tidak diganti." : undefined}>
              <input name="password" type="password" required={!current} className={inputClass} />
            </Field>
            <Field label="Peran">
              <select name="role" className={inputClass} defaultValue={current?.role ?? "CASHIER"}>
                <option value="CASHIER">Kasir</option>
                <option value="MANAGER">Manajer</option>
                <option value="ADMIN">Admin</option>
              </select>
            </Field>
            <Field label="Status">
              <select name="isActive" className={inputClass} defaultValue={current?.isActive === false ? "0" : "1"}>
                <option value="1">Aktif</option>
                <option value="0">Nonaktif</option>
              </select>
            </Field>
            <div className="flex gap-2">
              <PrimaryButton type="submit">{current ? "Simpan" : "Tambah"}</PrimaryButton>
              {current ? (
                <Link href="/users" className="btn inline-flex items-center rounded-lg border border-line px-4 text-sm">
                  Batal
                </Link>
              ) : null}
            </div>
          </form>
        </Card>
        <Card>
          <table className="w-full text-sm">
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="py-2">
                    {row.name}
                    <div className="text-xs text-muted">
                      {row.username} · {row.role}
                      {row.email ? ` · ${row.email}` : ""}
                    </div>
                  </td>
                  <td>{row.isActive ? "aktif" : "nonaktif"}</td>
                  <td className="text-right">
                    <div className="flex flex-row items-center justify-end gap-2">
                      <Link href={`/users?edit=${row.id}`} className={editActionClass}>
                        Ubah
                      </Link>
                      <form action={resetUserPassword} className="inline">
                        <input type="hidden" name="id" value={row.id} />
                        <input type="hidden" name="password" value="password123" />
                        <button type="submit" className={neutralActionClass}>
                          Reset
                        </button>
                      </form>
                      <form action={deleteUser} className="inline">
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
