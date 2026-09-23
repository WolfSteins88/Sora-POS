"use client";

import { PrimaryButton } from "@/components/ui";
import { receiptSectionOn } from "@/lib/receipt";

type Trx = {
  transaction_number: string;
  created_at: string;
  total: string;
  cashier_name?: string;
  note?: string;
  items: { product_name: string; quantity: number; subtotal: string }[];
  payments: { method: string; amount: string; change_amount: string }[];
};

function receiptText(trx: Trx, settings: Record<string, string>) {
  const w = settings.receipt_paper_size === "58mm" ? 32 : 42;
  const line = () => "-".repeat(w);
  const rows: string[] = [];
  if (receiptSectionOn(settings, "receipt_show_name")) rows.push(settings.shop_name || "Toko");
  if (receiptSectionOn(settings, "receipt_show_address") && settings.shop_address) rows.push(settings.shop_address);
  if (settings.shop_phone) rows.push(settings.shop_phone);
  rows.push(line());
  if (receiptSectionOn(settings, "receipt_show_number")) rows.push(trx.transaction_number);
  if (receiptSectionOn(settings, "receipt_show_time")) rows.push(new Date(trx.created_at).toLocaleString("id-ID"));
  if (receiptSectionOn(settings, "receipt_show_cashier") && trx.cashier_name) rows.push(trx.cashier_name);
  if (receiptSectionOn(settings, "receipt_show_items")) {
    rows.push(line());
    rows.push(...trx.items.map((i) => `${i.quantity}x ${i.product_name}`));
  }
  if (receiptSectionOn(settings, "receipt_show_note") && trx.note) rows.push(trx.note);
  rows.push(line());
  if (receiptSectionOn(settings, "receipt_show_total")) rows.push(`TOTAL ${trx.total}`);
  if (receiptSectionOn(settings, "receipt_show_method")) {
    rows.push(...(trx.payments ?? []).map((p) => `${p.method} ${p.amount} kb ${p.change_amount}`));
  }
  if (receiptSectionOn(settings, "receipt_show_footer")) rows.push(settings.receipt_footer || "Terima kasih");
  return rows.filter(Boolean).join("\n");
}

export function PrintButton({
  transaction,
  settings,
  label = "Cetak struk",
  variant = "primary",
}: {
  transaction: Trx;
  settings: Record<string, string>;
  label?: string;
  variant?: "primary" | "ghost";
}) {
  async function print() {
    const text = receiptText(transaction, settings);
    const payload = new TextEncoder().encode(`\x1b\x40${text}\n\n\n\x1d\x56\x00`);
    const ble = (navigator as unknown as { bluetooth?: { requestDevice: (o: object) => Promise<unknown> } }).bluetooth;
    if (ble) {
      try {
        const device = (await ble.requestDevice({
          acceptAllDevices: true,
          optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"],
        })) as {
          gatt?: {
            connect: () => Promise<{
              getPrimaryService: (id: string) => Promise<{
                getCharacteristic: (id: string) => Promise<{ writeValue: (d: BufferSource) => Promise<void> }>;
              }>;
            }>;
          };
        };
        const server = await device.gatt?.connect();
        const service = await server?.getPrimaryService("000018f0-0000-1000-8000-00805f9b34fb");
        const characteristic = await service?.getCharacteristic("00002af1-0000-1000-8000-00805f9b34fb");
        await characteristic?.writeValue(payload);
        return;
      } catch {
        /* fall through */
      }
    }
    try {
      await fetch("http://127.0.0.1:9100/print", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: payload,
      });
    } catch {
      window.print();
    }
  }

  if (variant === "ghost") {
    return (
      <button
        type="button"
        onClick={() => void print()}
        className="btn inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-line px-3 text-sm"
      >
        {label}
      </button>
    );
  }

  return (
    <PrimaryButton type="button" onClick={() => void print()}>
      {label}
    </PrimaryButton>
  );
}
