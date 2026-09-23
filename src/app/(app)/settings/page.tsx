import {
  Archive,
  Coins,
  Download,
  FileText,
  Mail,
  MapPin,
  Package,
  Palette,
  Percent,
  Phone,
  ScrollText,
  Store,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { importBackup, saveSettings } from "@/app/actions/ops";
import { AccentColorPicker } from "@/components/AccentColorPicker";
import { IdNumberInput } from "@/components/IdNumberInput";
import { ImageField } from "@/components/ImageField";
import { Card, Field, PageHeader, PrimaryButton, ghostButtonClass, inputClass } from "@/components/ui";
import { getSettingsMap } from "@/lib/settings";
import { defaultAccent, normalizeShopMode, parseAccentColor } from "@/lib/theme";
import { ImportBackupForm } from "./ImportBackupForm";
import { ModeCards } from "./ModeCards";

function SectionHeading({
  icon: Icon,
  title,
  text,
  className = "",
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 gap-3 ${className}`}>
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Icon size={18} aria-hidden />
      </span>
      <div className="min-w-0">
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-0.5 text-sm leading-5 text-muted">{text}</p>
      </div>
    </div>
  );
}

function IconField({
  icon: Icon,
  label,
  name,
  defaultValue,
  type = "text",
}: {
  icon: LucideIcon;
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <Icon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
        <input name={name} type={type} defaultValue={defaultValue} className={`${inputClass} pl-10`} />
      </div>
    </Field>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; imported?: string }>;
}) {
  const s = await getSettingsMap();
  const params = await searchParams;
  const current = normalizeShopMode(s.shop_mode);
  const accent = parseAccentColor(s.ui_accent_color);
  const currency = s.currency || "Rp";

  return (
    <div>
      <PageHeader title="Pengaturan" description="Kelola konfigurasi sistem sesuai kebutuhan bisnis Anda." />
      {params.saved ? (
        <p className="mb-4 rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">Pengaturan tersimpan. Kasir memakai mode baru.</p>
      ) : null}
      {params.imported ? (
        <p className="mb-4 rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">
          Data cadangan berhasil diimpor. Katalog, shift, dan transaksi sudah diganti.
        </p>
      ) : null}

      <form action={saveSettings} className="grid items-start gap-6 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <SectionHeading icon={Store} title="Mode toko" text="Pilih mode yang sesuai dengan jenis bisnis Anda." />
            <ModeCards current={current} />
          </Card>
          <Card>
            <SectionHeading icon={Palette} title="Warna aksen" text="Pilih warna utama untuk tampilan sistem kasir." />
            <div className="mt-4">
              <AccentColorPicker value={accent} defaultColor={defaultAccent(current)} />
            </div>
          </Card>
          <Card>
            <SectionHeading
              icon={Archive}
              title="Cadangan"
              text="Ekspor data transaksi, produk, pengguna, dan pengaturan ke file JSON sebagai cadangan. Impor data untuk memulihkan sistem atau memindahkan ke perangkat lain."
            />
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <a href="/api/backup" className={`${ghostButtonClass} h-full min-h-11 w-full gap-2 px-3 text-center`}>
                <Download size={16} aria-hidden />
                Unduh backup JSON
              </a>
              <a href="/api/backup/fnb-demo" className={`${ghostButtonClass} h-full min-h-11 w-full gap-2 px-3 text-center`}>
                <Download size={16} aria-hidden />
                Unduh contoh F&B demo
              </a>
              <a href="/api/backup/retail-demo" className={`${ghostButtonClass} h-full min-h-11 w-full gap-2 px-3 text-center sm:col-span-2`}>
                <Download size={16} aria-hidden />
                Unduh contoh retail demo
              </a>
            </div>
            <ImportBackupForm />
            <p className="mt-4 rounded-xl bg-chip px-3 py-3 text-xs leading-5 text-muted">
              Data cadangan meliputi produk, kategori, resep, transaksi, pengguna, dan pengaturan. Akun login tidak diubah.
              Disarankan untuk melakukan backup secara berkala.
            </p>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <SectionHeading
                className="flex-1"
                icon={Store}
                title="Identitas toko"
                text="Atur informasi utama toko yang akan ditampilkan pada struk dan sistem."
              />
              <label htmlFor="shop-logo" className={`${ghostButtonClass} h-11 shrink-0 cursor-pointer gap-2 whitespace-nowrap`}>
                <Upload size={16} aria-hidden />
                Upload Logo
              </label>
            </div>
            <div className="mt-4 grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_13rem]">
              <div className="flex flex-col gap-3">
                <Field label="Nama toko *">
                  <input name="shop_name" defaultValue={s.shop_name} required className={inputClass} />
                </Field>
                <IconField icon={MapPin} label="Alamat" name="shop_address" defaultValue={s.shop_address} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <IconField icon={Phone} label="Telepon" name="shop_phone" defaultValue={s.shop_phone} />
                  <IconField icon={Mail} label="Email" name="shop_email" defaultValue={s.shop_email} />
                </div>
                <IconField icon={FileText} label="Footer struk" name="receipt_footer" defaultValue={s.receipt_footer} />
              </div>
              <div className="flex h-full flex-col rounded-2xl border border-dashed border-line p-3">
                <p className="mb-2 text-center text-sm font-medium">Logo</p>
                <ImageField
                  variant="card"
                  kind="logo"
                  filename={s.shop_logo}
                  name={s.shop_name || "Toko"}
                  fieldName="logo"
                  inputId="shop-logo"
                  pickLabel="Pilih gambar"
                  previewClassName="mx-auto size-28 shrink-0 self-center rounded-xl object-cover"
                  hint="JPG, PNG, atau WEBP. Maks. 2MB. Ukuran 300 x 300 px."
                />
              </div>
            </div>
          </Card>

          <Card>
            <SectionHeading icon={Coins} title="Mata uang" text="Pilih mata uang yang digunakan untuk transaksi." />
            <div className="mt-4">
              <Field label="Mata uang">
                <select name="currency" defaultValue={currency} className={inputClass}>
                  <option value="Rp">Rp</option>
                  {currency !== "Rp" ? <option value={currency}>{currency}</option> : null}
                </select>
              </Field>
            </div>
          </Card>

          <Card>
            <SectionHeading icon={Percent} title="Pajak & Service" text="Persen pajak dan service pada transaksi." />
            <div className="mt-4 grid items-start gap-3 sm:grid-cols-2">
              <Field label="Pajak %" hint="Contoh: 11 untuk 11%">
                <IdNumberInput name="tax_percent" defaultValue={s.tax_percent || "0"} />
              </Field>
              <Field label="Service %" hint="Contoh: 11 untuk 11%">
                <IdNumberInput name="service_charge_percent" defaultValue={s.service_charge_percent || "0"} />
              </Field>
            </div>
          </Card>

          <Card>
            <SectionHeading icon={ScrollText} title="Kertas struk" text="Pilih ukuran kertas untuk printer struk." />
            <div className="mt-4">
              <Field label="Kertas struk">
                <select name="receipt_paper_size" defaultValue={s.receipt_paper_size || "80mm"} className={inputClass}>
                  <option value="80mm">80mm</option>
                  <option value="58mm">58mm</option>
                </select>
              </Field>
            </div>
          </Card>

          <Card>
            <SectionHeading icon={Package} title="Izinkan stok negatif" text="Tentukan apakah stok bisa bersisa negatif." />
            <div className="mt-4">
              <Field label="Izinkan stok negatif">
                <select name="allow_negative_stock" defaultValue={s.allow_negative_stock || "0"} className={inputClass}>
                  <option value="0">Tidak</option>
                  <option value="1">Ya</option>
                </select>
              </Field>
            </div>
          </Card>

          <PrimaryButton type="submit" className="h-11 w-full">
            Simpan Pengaturan
          </PrimaryButton>
        </div>
      </form>
      <form id="import-backup" action={importBackup} />
    </div>
  );
}
