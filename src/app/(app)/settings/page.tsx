import { saveSettings } from "@/app/actions/ops";
import { Card, Field, PageHeader, PrimaryButton, ghostButtonClass, inputClass } from "@/components/ui";
import { IdNumberInput } from "@/components/IdNumberInput";
import { getSettingsMap } from "@/lib/settings";
import { ModeCards } from "./ModeCards";
import { AccentColorPicker } from "@/components/AccentColorPicker";
import { ImageField } from "@/components/ImageField";
import { defaultAccent, normalizeShopMode, parseAccentColor } from "@/lib/theme";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const s = await getSettingsMap();
  const params = await searchParams;
  const current = normalizeShopMode(s.shop_mode);
  const accent = parseAccentColor(s.ui_accent_color);
  return (
    <div>
      <PageHeader title="Pengaturan" description="Mode toko mengganti katalog kasir dan alur pesanan, tanpa menghapus data." />
      {params.saved ? (
        <p className="mb-4 rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">Pengaturan tersimpan. Kasir memakai mode baru.</p>
      ) : null}
      <form action={saveSettings} className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-5">
          <Card>
            <h2 className="text-lg font-semibold">Mode toko</h2>
            <p className="mt-1 text-sm text-muted">
              Menyimpan mode akan mengganti katalog kasir, default dine-in/bawa pulang, dan menu Resep/Inventori.
            </p>
            <ModeCards current={current} />
          </Card>
          <Card>
            <h2 className="text-lg font-semibold">Warna aksen</h2>
            <p className="mt-1 mb-3 text-sm text-muted">
              Reset memakai palet mode: F&B cokelat, retail biru.
            </p>
            <AccentColorPicker value={accent} defaultColor={defaultAccent(current)} />
          </Card>
          <Card>
            <h2 className="text-lg font-semibold">Cadangan</h2>
            <p className="mt-1 text-sm text-muted">Unduh dump JSON tabel toko. Simpan di disk lokal; cloud replica adalah Phase 2.</p>
            <a href="/api/backup" className={`${ghostButtonClass} mt-3`}>
              Unduh backup JSON
            </a>
          </Card>
        </div>
        <Card className="h-full lg:col-span-7">
          <h2 className="text-lg font-semibold">Identitas toko</h2>
          <div className="mt-4 space-y-3">
            <Field label="Nama toko">
              <input name="shop_name" defaultValue={s.shop_name} className={inputClass} />
            </Field>
            <Field label="Logo" hint="JPG, PNG, atau WEBP. Maksimal 2MB.">
              <ImageField kind="logo" filename={s.shop_logo} name={s.shop_name || "Toko"} fieldName="logo" />
            </Field>
            <Field label="Alamat">
              <input name="shop_address" defaultValue={s.shop_address} className={inputClass} />
            </Field>
            <Field label="Telepon">
              <input name="shop_phone" defaultValue={s.shop_phone} className={inputClass} />
            </Field>
            <Field label="Email">
              <input name="shop_email" defaultValue={s.shop_email} className={inputClass} />
            </Field>
            <Field label="Footer struk">
              <input name="receipt_footer" defaultValue={s.receipt_footer} className={inputClass} />
            </Field>
            <Field label="Mata uang">
              <input name="currency" defaultValue={s.currency || "Rp"} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pajak %" hint="Boleh koma, contoh 11,5">
                <IdNumberInput name="tax_percent" defaultValue={s.tax_percent || "0"} />
              </Field>
              <Field label="Service %" hint="Boleh koma, contoh 5">
                <IdNumberInput name="service_charge_percent" defaultValue={s.service_charge_percent || "0"} />
              </Field>
            </div>
            <Field label="Kertas struk">
              <select name="receipt_paper_size" defaultValue={s.receipt_paper_size || "80mm"} className={inputClass}>
                <option value="80mm">80mm</option>
                <option value="58mm">58mm</option>
              </select>
            </Field>
            <Field label="Izinkan stok negatif">
              <select name="allow_negative_stock" defaultValue={s.allow_negative_stock || "0"} className={inputClass}>
                <option value="0">Tidak</option>
                <option value="1">Ya</option>
              </select>
            </Field>
            <PrimaryButton type="submit">Simpan</PrimaryButton>
          </div>
        </Card>
      </form>
    </div>
  );
}
