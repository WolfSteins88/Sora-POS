"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ImagePlus, Info, X } from "lucide-react";
import { saveInventoryItem } from "@/app/actions/ops";
import { IdNumberInput } from "@/components/IdNumberInput";
import { MoneyInput } from "@/components/MoneyInput";
import { ProductImage } from "@/components/ProductImage";
import { inputClass, PrimaryButton } from "@/components/ui";
import { money } from "@/lib/format";

const UNITS = ["pcs", "g", "kg", "ml", "liter"] as const;
const CARD = "rounded-2xl border border-line bg-surface p-5 shadow-card";

type Item = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  stock: number;
  minimum: number;
  cost: number;
  status: "active" | "inactive";
  image: string | null;
  createdAt: string;
  updatedAt: string;
};

function stockText(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(value);
}

function day(iso: string | null) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export function InventoryEditor({ item, lastStockAt }: { item: Item | null; lastStockAt: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(item?.name ?? "");
  const [unit, setUnit] = useState(item?.unit ?? "pcs");
  const [stock, setStock] = useState(item?.stock ?? 0);
  const [minimum, setMinimum] = useState(item?.minimum ?? 0);
  const [cost, setCost] = useState(item?.cost ?? 0);
  const [active, setActive] = useState(item?.status !== "inactive");
  const [preview, setPreview] = useState<string | null>(null);

  function onFile(file: File | undefined) {
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  const title = item ? "Ubah Bahan" : "Tambah Bahan";

  return (
    <div>
      <p className="text-sm text-muted">
        <Link href="/products" className="hover:text-ink">
          Produk
        </Link>
        <span className="px-1.5">/</span>
        <Link href="/inventory" className="hover:text-ink">
          Inventori Bahan
        </Link>
        <span className="px-1.5">/</span>
        {title}
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted">
        {item ? "Perbarui informasi bahan baku, termasuk stok saat ini." : "Masukkan informasi bahan baku untuk menambah stok ke sistem."}
      </p>

      <form action={saveInventoryItem} className="mt-5 grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        {item ? <input type="hidden" name="id" value={item.id} /> : null}
        <input type="hidden" name="status" value={active ? "active" : "inactive"} />
        <div className="space-y-4">
          <section className={CARD}>
            <h2 className="font-semibold">Informasi Bahan</h2>
            <p className="mt-1 text-sm text-muted">Lengkapi detail bahan baku yang akan ditambahkan.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium">Nama Bahan</span>
                <input name="name" required value={name} onChange={(event) => setName(event.target.value)} className={`${inputClass} mt-1.5`} />
              </label>
              <label className="block text-sm">
                <span className="font-medium">SKU</span>
                <input className={`${inputClass} mt-1.5 bg-chip`} value={item?.sku ?? "Otomatis saat simpan"} readOnly />
              </label>
              <label className="block text-sm sm:col-span-2 sm:max-w-xs">
                <span className="font-medium">Satuan</span>
                <select name="unit" value={unit} onChange={(event) => setUnit(event.target.value)} className={`${inputClass} mt-1.5`}>
                  {UNITS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium">Foto Bahan</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)]">
                <div className="relative">
                  {preview ? (
                    <img src={preview} alt="" className="aspect-square w-full rounded-xl object-cover" />
                  ) : (
                    <ProductImage kind="inventory" filename={item?.image} name={name || "Bahan"} className="aspect-square w-full rounded-xl object-cover text-lg" />
                  )}
                  {preview ? (
                    <button
                      type="button"
                      aria-label="Batalkan foto baru"
                      onClick={() => {
                        setPreview(null);
                        if (inputRef.current) inputRef.current.value = "";
                      }}
                      className="absolute top-1 right-1 inline-flex size-6 items-center justify-center rounded-full bg-white text-ink shadow-card"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line px-3 py-4 text-center"
                >
                  <ImagePlus size={18} className="text-muted" aria-hidden />
                  <span className="mt-2 text-sm font-medium">Unggah Foto</span>
                  <span className="mt-1 text-xs text-muted">JPG, PNG, atau WEBP. Maks. 2MB. Rekomendasi 400 x 400 px.</span>
                </button>
                <div className="rounded-xl bg-chip/70 px-3 py-3 text-sm text-muted">
                  <p className="inline-flex items-center gap-1 font-medium text-ink">
                    <Info size={14} aria-hidden />
                    Tips Foto
                  </p>
                  <p className="mt-1">Gunakan foto yang jelas dengan pencahayaan baik agar mudah dikenali.</p>
                </div>
                <input
                  ref={inputRef}
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => onFile(event.target.files?.[0])}
                />
              </div>
            </div>
          </section>

          <section className={CARD}>
            <h2 className="font-semibold">Informasi Stok</h2>
            <p className="mt-1 text-sm text-muted">Atur jumlah stok dan batas minimum untuk memudahkan pemantauan.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="font-medium">Stok Saat Ini</span>
                <span className="mt-1.5 block">
                  <IdNumberInput name="currentStock" defaultValue={item?.stock ?? 0} onValueChange={setStock} />
                </span>
              </label>
              <label className="block text-sm">
                <span className="font-medium">Stok Minimum</span>
                <span className="mt-1.5 block">
                  <IdNumberInput name="minimumStock" defaultValue={item?.minimum ?? 0} onValueChange={setMinimum} />
                </span>
              </label>
              <label className="block text-sm">
                <span className="font-medium">Harga Beli (per satuan)</span>
                <span className="mt-1.5 block">
                  <MoneyInput name="cost" defaultValue={item?.cost ?? 0} onValueChange={setCost} />
                </span>
              </label>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium">Status</p>
              <p className="mt-1 text-sm text-muted">Atur status ketersediaan bahan ini.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActive(true)}
                  className={`rounded-2xl border px-4 py-3 text-left ${active ? "border-accent bg-accent-soft/40" : "border-line"}`}
                >
                  <span className="font-medium">Aktif</span>
                  <span className="mt-1 block text-sm text-muted">Bahan tersedia dan dapat digunakan.</span>
                </button>
                <button
                  type="button"
                  aria-pressed={!active}
                  onClick={() => setActive(false)}
                  className={`rounded-2xl border px-4 py-3 text-left ${!active ? "border-accent bg-accent-soft/40" : "border-line"}`}
                >
                  <span className="font-medium">Nonaktif</span>
                  <span className="mt-1 block text-sm text-muted">Bahan tidak digunakan sementara.</span>
                </button>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <Link href="/inventory" className="btn inline-flex items-center gap-2 rounded-full border border-line px-4 text-sm font-medium">
                <X size={15} aria-hidden />
                Batal
              </Link>
              <PrimaryButton type="submit" className="rounded-full">
                Simpan Bahan
              </PrimaryButton>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className={CARD}>
            <h2 className="font-semibold">Pratinjau Bahan</h2>
            <div className="mt-4 flex items-start gap-3">
              {preview ? (
                <img src={preview} alt="" className="size-20 shrink-0 rounded-xl object-cover" />
              ) : (
                <ProductImage kind="inventory" filename={item?.image} name={name || "Bahan"} className="size-20 shrink-0 rounded-xl object-cover" />
              )}
              <div className="min-w-0">
                <p className="font-semibold">{name || "Nama bahan"}</p>
                <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-ok-soft text-ok" : "bg-chip text-muted"}`}>
                  {active ? "Aktif" : "Nonaktif"}
                </span>
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <PreviewRow label="SKU" value={item?.sku ?? "Otomatis"} />
              <PreviewRow label="Satuan" value={unit} />
              <PreviewRow label="Stok Saat Ini" value={`${stockText(stock)} ${unit}`} />
              <PreviewRow label="Stok Minimum" value={`${stockText(minimum)} ${unit}`} />
              <PreviewRow label="Harga Beli" value={money(cost)} />
            </dl>
          </section>
          <section className={CARD}>
            <h2 className="font-semibold">Riwayat Perubahan</h2>
            {item ? (
              <ul className="mt-3 space-y-3 text-sm">
                <li>
                  <p className="font-medium">Bahan dibuat</p>
                  <p className="text-muted">{day(item.createdAt)}</p>
                </li>
                <li>
                  <p className="font-medium">Stok diperbarui</p>
                  <p className="text-muted">{day(lastStockAt)}</p>
                </li>
                <li>
                  <p className="font-medium">Informasi diubah</p>
                  <p className="text-muted">{day(item.updatedAt)}</p>
                </li>
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">Riwayat akan muncul setelah bahan disimpan.</p>
            )}
          </section>
          <p className="rounded-2xl bg-ok-soft px-4 py-3 text-sm text-ok">
            Pastikan informasi bahan sudah sesuai. Anda masih dapat mengubahnya nanti.
          </p>
        </div>
      </form>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
