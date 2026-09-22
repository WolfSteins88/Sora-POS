import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { PageHeader, Card } from "@/components/ui";
import { getDb } from "@/lib/db";
import { addons } from "@/lib/schema";
import { getProductDetail, listCategories } from "@/server/queries";
import { ProductForm } from "../ProductForm";
import { RecipeExtras } from "../RecipeExtras";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductDetail(id);
  if (!product) notFound();
  const cats = await listCategories(false, product.catalogPack);
  const allAddons = await getDb().select().from(addons).where(eq(addons.status, "active"));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <PageHeader
          title={product.name}
          actions={
            product.kind === "recipe" ? (
              <Link href={`/recipes/${product.id}`} className="text-sm underline">
                Kelola resep
              </Link>
            ) : null
          }
        />
        <Card className="p-5">
          <ProductForm categories={cats} pack={product.catalogPack} product={product} />
        </Card>
      </div>
      <Card>
        <RecipeExtras
          productId={product.id}
          kind={product.kind}
          initialVariants={product.variants.map((v) => ({
            name: v.name,
            isRequired: v.isRequired,
            options: v.options.map((o) => ({
              name: o.name,
              priceAdjustment: Number(o.priceAdjustment),
              isDefault: o.isDefault,
            })),
          }))}
          allAddons={allAddons}
          linkedAddonIds={product.addons.map((a) => a.id)}
        />
      </Card>
    </div>
  );
}
