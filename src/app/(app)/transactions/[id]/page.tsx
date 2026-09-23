import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { money, num } from "@/lib/format";
import { getSettingsMap } from "@/lib/settings";
import { normalizeShopMode } from "@/lib/theme";
import { getTransactionFull } from "@/server/queries";
import { PrintButton } from "./PrintButton";

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trx = await getTransactionFull(id);
  if (!trx) notFound();
  const settings = await getSettingsMap();
  const retail = normalizeShopMode(settings.shop_mode) === "retail";
  return (
    <div className="max-w-xl">
      <PageHeader
        title={trx.transaction_number}
        description={`${trx.cashier_name} · ${trx.status}`}
        actions={
          <PrintButton
            transaction={{
              transaction_number: String(trx.transaction_number),
              created_at: String(trx.created_at),
              total: String(trx.total),
              cashier_name: trx.cashier_name ? String(trx.cashier_name) : "",
              note: trx.note ? String(trx.note) : "",
              items: trx.items.map((item: { product_name: string; quantity: number; subtotal: string | number }) => ({
                product_name: item.product_name,
                quantity: item.quantity,
                subtotal: String(item.subtotal),
              })),
              payments: (trx.payments ?? []).map(
                (p: { method: string; amount: string | number; change_amount: string | number }) => ({
                  method: p.method,
                  amount: String(p.amount),
                  change_amount: String(p.change_amount),
                }),
              ),
            }}
            settings={settings}
          />
        }
      />
      <Card>
        {retail ? null : (
          <p className="text-sm text-muted">
            {trx.order_type === "dine_in" ? `Meja ${trx.table_number || "-"}` : "Bawa pulang"}
          </p>
        )}
        <ul className="mt-3 divide-y divide-line text-sm">
          {trx.items.map((item: { id: string; product_name: string; quantity: number; subtotal: string; variants?: { option_name: string }[]; addons?: { addon_name: string }[] }) => (
            <li key={item.id} className="flex justify-between py-2">
              <div>
                <p>
                  {item.quantity}× {item.product_name}
                </p>
                <p className="text-xs text-muted">
                  {(item.variants ?? []).map((v) => v.option_name).join(", ")}
                  {(item.addons ?? []).map((a) => a.addon_name).join(", ")}
                </p>
              </div>
              <span>{money(num(item.subtotal), settings.currency)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between font-semibold">
          <span>Total</span>
          <span>{money(num(trx.total), settings.currency)}</span>
        </div>
      </Card>
    </div>
  );
}
