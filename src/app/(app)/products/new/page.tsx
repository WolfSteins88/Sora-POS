import Link from "next/link";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { listCategories } from "@/server/queries";
import { getSetting } from "@/lib/settings";
import { catalogPackFromQuery } from "@/lib/theme";
import { ProductForm } from "../ProductForm";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ pack?: string }>;
}) {
  const params = await searchParams;
  const shopMode = await getSetting("shop_mode", "fnb");
  const pack = catalogPackFromQuery(params.pack, shopMode);
  const categories = await listCategories(false, pack);
  return (
    <div>
      <PageHeader
        title="Produk baru"
        description={pack === "retail" ? "Katalog retail" : "Katalog F&B"}
      />
      {categories.length === 0 ? (
        <EmptyState
          title="Belum ada kategori"
          description="Buat kategori untuk katalog ini sebelum menambah produk."
          action={
            <Link
              href={`/categories?pack=${pack}`}
              className="btn inline-flex items-center rounded-xl bg-accent px-4 text-sm font-semibold text-white"
            >
              Tambah kategori
            </Link>
          }
        />
      ) : (
        <Card className="p-5">
          <ProductForm categories={categories} pack={pack} />
        </Card>
      )}
    </div>
  );
}
