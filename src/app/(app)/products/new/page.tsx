import { eq } from "drizzle-orm";
import { ProductForm } from "../ProductForm";
import { getDb } from "@/lib/db";
import { addons } from "@/lib/schema";
import { getSetting } from "@/lib/settings";
import { catalogPackFromQuery } from "@/lib/theme";
import { listCategories } from "@/server/queries";

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
    <ProductForm
      categories={categories.map((item) => ({ id: item.id, name: item.name }))}
      pack={pack}
    />
  );
}
