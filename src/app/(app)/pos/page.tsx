import { getSettingsMap } from "@/lib/settings";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { getProductDetail, listHeldOrders, posCatalog, getOpenShift } from "@/server/queries";
import { PosClient } from "./PosClient";
import { num } from "@/lib/format";
import { normalizeShopMode } from "@/lib/theme";

export default async function PosPage() {
  const session = await getSession();
  if (!session) return null;
  const settings = await getSettingsMap();
  const shopMode = normalizeShopMode(settings.shop_mode);
  const { categories, products } = await posCatalog(shopMode);
  const catalog: Record<string, Awaited<ReturnType<typeof getProductDetail>>> = {};
  for (const p of products.filter((x) => x.kind === "recipe")) {
    catalog[p.id] = await getProductDetail(p.id);
  }
  const held = await listHeldOrders(session.id);
  const shift = await getOpenShift(session.id);
  return (
    <div>
      <PageHeader
        title="Kasir"
        description={
          shopMode === "retail"
            ? "Tap barang untuk masuk keranjang."
            : "Tap barang langsung masuk keranjang. Racikan membuka pilihan variant."
        }
      />
      <PosClient
        shopMode={shopMode}
        taxPercent={num(settings.tax_percent)}
        servicePercent={num(settings.service_charge_percent)}
        currency={settings.currency || "Rp"}
        categories={categories}
        products={products}
        catalog={catalog as never}
        held={held}
        shiftOpen={!!shift}
      />
    </div>
  );
}
