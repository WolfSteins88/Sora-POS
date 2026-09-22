import Link from "next/link";
import { deleteCategory, saveCategory } from "@/app/actions/ops";
import {
  Field,
  PageHeader,
  PrimaryButton,
  Card,
  EmptyState,
  dangerActionClass,
  editActionClass,
  ghostButtonClass,
  inputClass,
  tableCellClass,
  tableHeadCellClass,
  tableHeadRowClass,
} from "@/components/ui";
import { ImageField } from "@/components/ImageField";
import { ProductImage } from "@/components/ProductImage";
import { CatalogTabs } from "@/components/CatalogTabs";
import { listCategories } from "@/server/queries";
import { getSetting } from "@/lib/settings";
import { catalogPackFromQuery } from "@/lib/theme";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; pack?: string }>;
}) {
  const { edit, pack: packQuery } = await searchParams;
  const shopMode = await getSetting("shop_mode", "fnb");
  const pack = catalogPackFromQuery(packQuery, shopMode);
  const rows = await listCategories(false, pack);
  const current = rows.find((row) => row.id === edit);
  return (
    <div>
      <PageHeader
        title="Kategori"
        description={pack === "retail" ? "Kategori katalog retail." : "Kategori katalog F&B."}
      />
      <CatalogTabs basePath="/categories" pack={pack} />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <h2 className="mb-3 font-semibold">{current ? "Ubah kategori" : "Tambah"}</h2>
          <form action={saveCategory} className="space-y-3" key={current?.id ?? "new"}>
            {current ? <input type="hidden" name="id" value={current.id} /> : null}
            <input type="hidden" name="catalogPack" value={current?.catalogPack ?? pack} />
            <Field label="Foto" hint="JPG, PNG, atau WEBP. Maksimal 2MB.">
              <ImageField kind="categories" filename={current?.image} name={current?.name || "Kategori"} />
            </Field>
            <Field label="Nama">
              <input name="name" required defaultValue={current?.name} key={current?.id ?? "new"} className={inputClass} />
            </Field>
            <Field label="Deskripsi">
              <input name="description" defaultValue={current?.description ?? ""} className={inputClass} />
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
              <PrimaryButton type="submit">Simpan</PrimaryButton>
              {current ? (
                <Link href={`/categories?pack=${pack}`} className={ghostButtonClass}>
                  Batal
                </Link>
              ) : null}
            </div>
          </form>
        </Card>
        {rows.length === 0 ? (
          <EmptyState
            title={pack === "retail" ? "Belum ada kategori Retail" : "Belum ada kategori F&B"}
            description="Tambah kategori di formulir kiri."
          />
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className={tableHeadRowClass}>
                  <th className={tableHeadCellClass}>Foto</th>
                  <th className={tableHeadCellClass}>Nama</th>
                  <th className={tableHeadCellClass}>Status</th>
                  <th className={`${tableHeadCellClass} text-right`}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className={tableCellClass}>
                      <ProductImage kind="categories" filename={row.image} name={row.name} className="h-10 w-10 rounded-lg object-cover" />
                    </td>
                    <td className={`${tableCellClass} font-semibold`}>{row.name}</td>
                    <td className={tableCellClass}>{row.status}</td>
                    <td className={`${tableCellClass} text-right`}>
                      <div className="flex flex-row items-center justify-end gap-2">
                        <Link href={`/categories?pack=${pack}&edit=${row.id}`} className={editActionClass}>
                          Ubah
                        </Link>
                        <form action={deleteCategory} className="inline">
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
        )}
      </div>
    </div>
  );
}
