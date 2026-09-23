"use client";

import { useMemo, useState } from "react";
import { savePrinter } from "@/app/actions/ops";
import { ProductImage } from "@/components/ProductImage";
import { Card, Field, PrimaryButton, ghostButtonClass, inputClass } from "@/components/ui";
import { money } from "@/lib/format";
import { RECEIPT_TOGGLES, receiptSectionOn } from "@/lib/receipt";

type PrinterRow = {
  id: string;
  name: string;
  paperSize: string;
  connectionMode: string;
  bridgeUrl: string | null;
  bleServiceUuid: string | null;
  bleCharacteristicUuid: string | null;
};

const TABS = [
  ["device", "Pengaturan Printer"],
  ["design", "Desain Struk"],
  ["preview", "Contoh Struk"],
] as const;

const DEFAULT_SERVICE = "000018f0-0000-1000-8000-00805f9b34fb";
const DEFAULT_CHARACTERISTIC = "00002af1-0000-1000-8000-00805f9b34fb";

function lineOf(width: number) {
  return "-".repeat(width);
}

export function PrinterDesk({
  printer,
  settings,
}: {
  printer: PrinterRow | null;
  settings: Record<string, string>;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("device");
  const [name, setName] = useState(printer?.name ?? "Kasir Utama");
  const [paperSize, setPaperSize] = useState(printer?.paperSize === "58mm" ? "58mm" : "80mm");
  const [connectionMode, setConnectionMode] = useState(
    printer?.connectionMode === "local_bridge" ? "local_bridge" : "web_bluetooth",
  );
  const [bridgeUrl, setBridgeUrl] = useState(printer?.bridgeUrl || "http://127.0.0.1:9100");
  const [serviceUuid, setServiceUuid] = useState(printer?.bleServiceUuid ?? "");
  const [characteristicUuid, setCharacteristicUuid] = useState(printer?.bleCharacteristicUuid ?? "");
  const [shopName, setShopName] = useState(settings.shop_name ?? "");
  const [address, setAddress] = useState(settings.shop_address ?? "");
  const [footer, setFooter] = useState((settings.receipt_footer ?? "").slice(0, 100));
  const [toggles, setToggles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(RECEIPT_TOGGLES.map(([key]) => [key, receiptSectionOn(settings, key)])),
  );
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState("");
  const [testOk, setTestOk] = useState(false);
  const [testing, setTesting] = useState(false);

  const preview = useMemo(() => {
    const width = paperSize === "58mm" ? 32 : 42;
    const rows: string[] = [];
    if (toggles.receipt_show_name) rows.push(shopName || "Toko");
    if (toggles.receipt_show_address && address) rows.push(address);
    if (settings.shop_phone) rows.push(settings.shop_phone);
    rows.push(lineOf(width));
    if (toggles.receipt_show_number) rows.push("TRX-CONTOH");
    if (toggles.receipt_show_time) rows.push("23/09/2026, 17.00");
    if (toggles.receipt_show_cashier) rows.push("Kasir");
    if (toggles.receipt_show_items) {
      rows.push(lineOf(width));
      rows.push("1x Americano");
      rows.push("1x Croissant");
    }
    if (toggles.receipt_show_note) rows.push("Catatan: kurang manis");
    rows.push(lineOf(width));
    if (toggles.receipt_show_total) rows.push(`TOTAL ${money(28000)}`);
    if (toggles.receipt_show_method) rows.push("Tunai");
    if (toggles.receipt_show_footer) rows.push(footer || "Terima kasih");
    return rows.join("\n");
  }, [address, footer, paperSize, settings.shop_phone, shopName, toggles]);

  async function testPrint() {
    setTesting(true);
    setTestMessage("");
    setTestOk(false);
    const text = `Uji cetak\n${shopName || name || "Toko"}`;
    const payload = new TextEncoder().encode(`\x1b\x40${text}\n\n\n\x1d\x56\x00`);
    try {
      if (connectionMode === "web_bluetooth") {
        const ble = (navigator as unknown as { bluetooth?: { requestDevice: (options: object) => Promise<unknown> } }).bluetooth;
        if (!ble) throw new Error("Browser ini tidak punya Web Bluetooth.");
        const service = serviceUuid || DEFAULT_SERVICE;
        const characteristic = characteristicUuid || DEFAULT_CHARACTERISTIC;
        const device = (await ble.requestDevice({ acceptAllDevices: true, optionalServices: [service] })) as {
          gatt?: {
            connect: () => Promise<{
              getPrimaryService: (id: string) => Promise<{
                getCharacteristic: (id: string) => Promise<{ writeValue: (data: BufferSource) => Promise<void> }>;
              }>;
            }>;
          };
        };
        const server = await device.gatt?.connect();
        const gattService = await server?.getPrimaryService(service);
        const gattCharacteristic = await gattService?.getCharacteristic(characteristic);
        if (!gattCharacteristic) throw new Error("Karakteristik printer tidak ditemukan.");
        await gattCharacteristic.writeValue(payload);
      } else {
        const base = (bridgeUrl || "http://127.0.0.1:9100").replace(/\/$/, "");
        const response = await fetch(`${base}/print`, {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: payload,
        });
        if (!response.ok) throw new Error("Bridge menolak cetak.");
      }
      setTestOk(true);
      setTestMessage("Baris percobaan terkirim.");
    } catch (err) {
      setTestOk(false);
      setTestMessage(err instanceof Error ? err.message : "Uji cetak gagal.");
    } finally {
      setTesting(false);
    }
  }

  const modeLabel = connectionMode === "local_bridge" ? "Bridge lokal" : "Web Bluetooth";

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Printer & Struk</h2>
          <p className="mt-1 text-sm text-muted">Mode koneksi: {modeLabel}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1 border-b border-line">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 py-2 text-sm ${tab === id ? "border-b-2 border-accent font-semibold text-ink" : "text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <form action={savePrinter} className="mt-4">
        {printer ? <input type="hidden" name="id" value={printer.id} /> : null}
        <input type="hidden" name="name" value={name} />
        <input type="hidden" name="paperSize" value={paperSize} />
        <input type="hidden" name="connectionMode" value={connectionMode} />
        <input type="hidden" name="bridgeUrl" value={bridgeUrl} />
        <input type="hidden" name="bleServiceUuid" value={serviceUuid} />
        <input type="hidden" name="bleCharacteristicUuid" value={characteristicUuid} />
        <input type="hidden" name="shop_name" value={shopName} />
        <input type="hidden" name="shop_address" value={address} />
        <input type="hidden" name="receipt_footer" value={footer} />
        {RECEIPT_TOGGLES.map(([key]) =>
          toggles[key] ? <input key={key} type="hidden" name={key} value="1" /> : null,
        )}

        <div className={tab === "device" ? "space-y-3" : "hidden"}>
          <Field label="Nama printer">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Kertas">
            <select className={inputClass} value={paperSize} onChange={(e) => setPaperSize(e.target.value)}>
              <option value="80mm">80mm</option>
              <option value="58mm">58mm</option>
            </select>
          </Field>
          <Field label="Koneksi">
            <select
              className={inputClass}
              value={connectionMode}
              onChange={(e) => setConnectionMode(e.target.value)}
            >
              <option value="web_bluetooth">Web Bluetooth</option>
              <option value="local_bridge">Bridge lokal</option>
            </select>
          </Field>
          <Field label="URL bridge">
            <input className={inputClass} value={bridgeUrl} onChange={(e) => setBridgeUrl(e.target.value)} />
          </Field>
          <Field label="UUID layanan Bluetooth">
            <input className={inputClass} value={serviceUuid} onChange={(e) => setServiceUuid(e.target.value)} />
          </Field>
          <Field label="UUID karakteristik Bluetooth">
            <input
              className={inputClass}
              value={characteristicUuid}
              onChange={(e) => setCharacteristicUuid(e.target.value)}
            />
          </Field>
          <button type="button" className={`${ghostButtonClass} h-11`} disabled={testing} onClick={() => void testPrint()}>
            {testing ? "Mengirim…" : "Uji Cetak"}
          </button>
          {testMessage ? <p className={`text-sm ${testOk ? "text-ok" : "text-danger"}`}>{testMessage}</p> : null}
        </div>

        <div className={tab === "design" ? "space-y-3" : "hidden"}>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2 text-sm">
            <span>Logo</span>
            <input
              type="checkbox"
              checked={toggles.receipt_show_logo}
              onChange={(e) => setToggles((s) => ({ ...s, receipt_show_logo: e.target.checked }))}
            />
          </label>
          <div className="flex items-center gap-3">
            {logoPreview ? (
              <img src={logoPreview} alt="" className="h-16 w-16 rounded-lg object-cover" />
            ) : (
              <ProductImage kind="logo" filename={settings.shop_logo} name={shopName || "Toko"} className="h-16 w-16 rounded-lg object-cover" />
            )}
            <input
              type="file"
              name="logo"
              accept="image/*"
              className="text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setLogoPreview(file ? URL.createObjectURL(file) : null);
              }}
            />
          </div>
          {RECEIPT_TOGGLES.filter(([key]) => key !== "receipt_show_logo").map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2 text-sm">
              <span>{label}</span>
              <input
                type="checkbox"
                checked={Boolean(toggles[key])}
                onChange={(e) => setToggles((s) => ({ ...s, [key]: e.target.checked }))}
              />
            </label>
          ))}
          <Field label="Nama usaha">
            <input className={inputClass} value={shopName} onChange={(e) => setShopName(e.target.value)} />
          </Field>
          <Field label="Alamat">
            <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <Field label="Pesan akhir" hint={`${footer.length}/100`}>
            <input
              className={inputClass}
              maxLength={100}
              value={footer}
              onChange={(e) => setFooter(e.target.value.slice(0, 100))}
            />
          </Field>
        </div>

        <div className={tab === "preview" ? "" : "hidden"}>
          <div className="mx-auto max-w-xs rounded-xl border border-line bg-chip p-4">
            {toggles.receipt_show_logo ? (
              logoPreview ? (
                <img src={logoPreview} alt="" className="mx-auto mb-3 h-14 w-14 rounded-lg object-cover" />
              ) : (
                <ProductImage
                  kind="logo"
                  filename={settings.shop_logo}
                  name={shopName || "Toko"}
                  className="mx-auto mb-3 h-14 w-14 rounded-lg object-cover"
                />
              )
            ) : null}
            <pre className="whitespace-pre-wrap text-center font-mono text-xs leading-5">{preview}</pre>
          </div>
        </div>

        <div className="mt-5">
          <PrimaryButton type="submit" className="h-11">
            Simpan printer
          </PrimaryButton>
        </div>
      </form>
    </Card>
  );
}
