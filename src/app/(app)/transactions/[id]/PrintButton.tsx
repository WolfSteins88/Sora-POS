"use client";

import { PrimaryButton } from "@/components/ui";

type Trx = {
  transaction_number: string;
  created_at: string;
  total: string;
  items: { product_name: string; quantity: number; subtotal: string }[];
  payments: { method: string; amount: string; change_amount: string }[];
};

function receiptText(trx: Trx, settings: Record<string, string>) {
  const w = settings.receipt_paper_size === "58mm" ? 32 : 42;
  const line = (ch = "-") => ch.repeat(w);
  const rows = [
    settings.shop_name || "Toko",
    settings.shop_address || "",
    settings.shop_phone || "",
    line(),
    trx.transaction_number,
    new Date(trx.created_at).toLocaleString("id-ID"),
    line(),
    ...trx.items.map((i) => `${i.quantity}x ${i.product_name}`),
    line(),
    `TOTAL ${trx.total}`,
    ...(trx.payments ?? []).map((p) => `${p.method} ${p.amount} kb ${p.change_amount}`),
    settings.receipt_footer || "Terima kasih",
  ];
  return rows.filter(Boolean).join("\n");
}

export function PrintButton({
  transaction,
  settings,
}: {
  transaction: Trx;
  settings: Record<string, string>;
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

  return (
    <PrimaryButton type="button" onClick={() => void print()}>
      Cetak struk
    </PrimaryButton>
  );
}
