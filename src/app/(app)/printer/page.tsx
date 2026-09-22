import { eq } from "drizzle-orm";
import { savePrinter } from "@/app/actions/ops";
import { Card, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { inventoryItems, printers } from "@/lib/schema";
import { getSetting } from "@/lib/settings";
import { normalizeShopMode } from "@/lib/theme";
import { recipeHpp } from "@/server/queries";
import { HppCalculator } from "./HppCalculator";

export default async function PrinterPage() {
  const session = await getSession();
  if (!session) return null;
  const shopMode = normalizeShopMode(await getSetting("shop_mode", "fnb"));
  const showHpp = shopMode === "fnb" && session.role !== "CASHIER";
  const db = getDb();
  const [printer] = await db.select().from(printers).limit(1);
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
    <div>
      <PageHeader
        title="Printer"
        description={
          showHpp
            ? "Struk thermal di kiri. Kalkulator HPP racikan di kanan."
            : "Web Bluetooth atau bridge lokal 127.0.0.1:9100."
        }
      />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <h2 className="text-lg font-semibold">Perangkat struk</h2>
          <form action={savePrinter} className="mt-3 space-y-3">
            {printer ? <input type="hidden" name="id" value={printer.id} /> : null}
            <Field label="Nama">
              <input name="name" defaultValue={printer?.name ?? "Kasir Utama"} className={inputClass} />
            </Field>
            <Field label="Kertas">
              <select name="paperSize" defaultValue={printer?.paperSize ?? "80mm"} className={inputClass}>
                <option value="80mm">80mm</option>
                <option value="58mm">58mm</option>
              </select>
            </Field>
            <Field label="Koneksi">
              <select name="connectionMode" defaultValue={printer?.connectionMode ?? "web_bluetooth"} className={inputClass}>
                <option value="web_bluetooth">Web Bluetooth</option>
                <option value="local_bridge">Local bridge</option>
              </select>
            </Field>
            <Field label="Bridge URL">
              <input name="bridgeUrl" defaultValue={printer?.bridgeUrl ?? "http://127.0.0.1:9100"} className={inputClass} />
            </Field>
            <Field label="BLE Service UUID">
              <input name="bleServiceUuid" defaultValue={printer?.bleServiceUuid ?? ""} className={inputClass} />
            </Field>
            <Field label="BLE Characteristic UUID">
              <input
                name="bleCharacteristicUuid"
                defaultValue={printer?.bleCharacteristicUuid ?? ""}
                className={inputClass}
              />
            </Field>
            <PrimaryButton type="submit">Simpan printer</PrimaryButton>
          </form>
        </Card>
        {showHpp ? (
          <div className="lg:col-span-7">
            <HppCalculator products={hppRows} inventory={inventory} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
