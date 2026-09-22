import Link from "next/link";
import { CatalogTabs } from "@/components/CatalogTabs";
import {
  PageHeader,
  Card,
  Badge,
  EmptyState,
  dangerActionClass,
  editActionClass,
  ghostButtonClass,
  tableCellClass,
  tableHeadCellClass,
  tableHeadRowClass,
} from "@/components/ui";
import { listProducts } from "@/server/queries";
import { money, num } from "@/lib/format";
import { deleteProduct } from "@/app/actions/ops";
import { ProductImage } from "@/components/ProductImage";
import { getSetting } from "@/lib/settings";
import { catalogPackFromQuery } from "@/lib/theme";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ pack?: string }>;
}) {
  const params = await searchParams;
  const shopMode = await getSetting("shop_mode", "fnb");
  const pack = catalogPackFromQuery(params.pack, shopMode);
  const rows = await listProducts(pack);
  return (
    <div>
      <PageHeader
        title="Produk"
        description={
          pack === "retail"
            ? "Katalog retail: barang kemasan dengan stok SKU."
            : "Katalog F&B: barang stok SKU atau racikan resep."
        }
        actions={
          <div className="flex gap-2">
            {pack === "fnb" ? (
              <Link href="/products/addons" className={ghostButtonClass}>
                Add-on
              </Link>
            ) : null}
            <Link
              href={`/products/new?pack=${pack}`}
              className="btn inline-flex items-center rounded-xl bg-accent px-4 text-sm font-semibold text-white"
            >
              Tambah produk
            </Link>
          </div>
        }
      />
      <CatalogTabs basePath="/products" pack={pack} />
      {rows.length === 0 ? (
        <EmptyState
          title={pack === "retail" ? "Belum ada produk Retail" : "Belum ada produk F&B"}
          description="Tambah produk untuk katalog ini."
          action={
            <Link
              href={`/products/new?pack=${pack}`}
              className="btn inline-flex items-center rounded-xl bg-accent px-4 text-sm font-semibold text-white"
            >
              Tambah produk
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={tableHeadRowClass}>
                  <th className={tableHeadCellClass}>Foto</th>
                  <th className={tableHeadCellClass}>Nama</th>
                  <th className={tableHeadCellClass}>Jenis</th>
                  <th className={tableHeadCellClass}>SKU</th>
                  <th className={tableHeadCellClass}>Harga</th>
                  <th className={tableHeadCellClass}>Stok</th>
                  <th className={`${tableHeadCellClass} text-right`}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className={tableCellClass}>
                      <ProductImage
                        kind="products"
                        filename={row.image}
                        name={row.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    </td>
                    <td className={tableCellClass}>
                      <Link className="font-semibold" href={`/products/${row.id}`}>
                        {row.name}
                      </Link>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="text-xs text-muted">{row.categoryName}</span>
                        {row.isFeatured ? <Badge tone="accent">Unggulan</Badge> : null}
                        {row.stockStatus === "sold_out" ? <Badge tone="warn">Habis</Badge> : null}
                      </div>
                    </td>
                    <td className={tableCellClass}>{row.kind === "goods" ? "Barang" : "Racikan"}</td>
                    <td className={`${tableCellClass} text-muted`}>{row.sku}</td>
                    <td className={tableCellClass}>{money(num(row.price))}</td>
                    <td className={tableCellClass}>
                      {row.kind === "goods" ? num(row.currentStock) : row.stockStatus === "sold_out" ? "habis" : "tersedia"}
                    </td>
                    <td className={`${tableCellClass} text-right`}>
                      <div className="flex flex-row items-center justify-end gap-2">
                        <Link href={`/products/${row.id}`} className={editActionClass}>
                          Ubah
                        </Link>
                        <form action={deleteProduct} className="inline">
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
      )}
    </div>
  );
}
