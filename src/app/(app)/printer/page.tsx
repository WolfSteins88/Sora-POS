import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { inventoryItems, printers } from "@/lib/schema";
import { getSetting, getSettingsMap } from "@/lib/settings";
import { normalizeShopMode } from "@/lib/theme";
import { recipeHpp } from "@/server/queries";
import { HppCalculator } from "./HppCalculator";
import { PrinterDesk } from "./PrinterDesk";

export default async function PrinterPage() {
  const session = await getSession();
  if (!session) return null;
  const shopMode = normalizeShopMode(await getSetting("shop_mode", "fnb"));
  const showHpp = shopMode === "fnb" && session.role !== "CASHIER";
  const db = getDb();
  const [printer] = await db.select().from(printers).limit(1);
  const settings = await getSettingsMap();
  const hppRows = showHpp ? await recipeHpp() : [];
  const inventory = showHpp
    ? await db
        .select({
          id: inventoryItems.id,
          name: inventoryItems.name,
          sku: inventoryItems.sku,
          unit: inventoryItems.unit,
          cost: inventoryItems.cost,
        })
        .from(inventoryItems)
        .where(eq(inventoryItems.status, "active"))
    : [];
  return (
    <div className={`grid items-start gap-6 ${showHpp ? "xl:grid-cols-2" : ""}`}>
      <PrinterDesk
        printer={
          printer
            ? {
                id: printer.id,
                name: printer.name,
                paperSize: printer.paperSize,
                connectionMode: printer.connectionMode,
                bridgeUrl: printer.bridgeUrl,
                bleServiceUuid: printer.bleServiceUuid,
                bleCharacteristicUuid: printer.bleCharacteristicUuid,
              }
            : null
        }
        settings={settings}
      />
      {showHpp ? <HppCalculator products={hppRows} inventory={inventory} /> : null}
    </div>
  );
}
