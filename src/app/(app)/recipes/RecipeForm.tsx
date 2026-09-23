"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ImagePlus, Info, Plus, Trash2, X } from "lucide-react";
import { saveRecipeForm } from "@/app/actions/ops";
import { IdNumberInput } from "@/components/IdNumberInput";
import { MoneyInput } from "@/components/MoneyInput";
import { ProductImage } from "@/components/ProductImage";
import { inputClass, PrimaryButton } from "@/components/ui";
import { money } from "@/lib/format";

const CARD = "rounded-2xl border border-line bg-surface p-5 shadow-card";
const PORTIONS = ["1 Cup (8 oz)", "1 Cup (12 oz)", "1 Cup (16 oz)", "1 Gelas", "1 Porsi"];

type Inventory = { id: string; name: string; unit: string; cost: number };
type Line = { key: string; inventoryItemId: string; quantity: number };

function lineKey() {
  return Math.random().toString(36).slice(2);
}

export function RecipeForm({
  product,
  portion,
  note,
  lines,
  categories,
  inventory,
}: {
  product: {
    id: string;
    name: string;
    categoryId: string;
    price: number;
    status: "active" | "inactive";
    image: string | null;
    description: string | null;
  } | null;
  portion: string;
  note: string;
  lines: { inventoryItemId: string; quantity: number }[];
  categories: { id: string; name: string }[];
  inventory: Inventory[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(product?.name ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? "");
  const [portionValue, setPortionValue] = useState(portion);
  const [price, setPrice] = useState(product?.price ?? 0);
  const [active, setActive] = useState(product?.status !== "inactive");
  const [comment, setComment] = useState(note);
  const [preview, setPreview] = useState<string | null>(null);
  const [rows, setRows] = useState<Line[]>(() => {
    const source = lines.length ? lines : [{ inventoryItemId: inventory[0]?.id ?? "", quantity: 1 }];
    return source.map((line) => ({ ...line, key: lineKey() }));
  });
  const portions = PORTIONS.includes(portionValue) ? PORTIONS : [portionValue, ...PORTIONS];
  const categoryName = categories.find((item) => item.id === categoryId)?.name ?? "—";
  const stock = new Map(inventory.map((item) => [item.id, item]));
  const hpp = rows.reduce((sum, row) => sum + row.quantity * (stock.get(row.inventoryItemId)?.cost ?? 0), 0);
  const margin = price > 0 ? Math.round(((price - hpp) / price) * 100) : 0;
  const title = product ? "Edit Resep" : "Tambah Resep";

  return (
    <div>
      <p className="text-sm text-muted">
        <Link href="/products" className="hover:text-ink">
          Produk
        </Link>
        <span className="px-1.5">/</span>
        <Link href="/recipes" className="hover:text-ink">
          Resep
        </Link>
        <span className="px-1.5">/</span>
        {title}
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted">
        {product ? "Perbarui komposisi bahan dan detail resep produk." : "Masukkan komposisi bahan dan detail resep produk."}
      </p>

      <form action={saveRecipeForm} className="mt-5 grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        {product ? <input type="hidden" name="id" value={product.id} /> : null}
        <input type="hidden" name="status" value={active ? "active" : "inactive"} />
        <div className="space-y-4">
          <section className={CARD}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Informasi Resep</h2>
                <p className="mt-1 text-sm text-muted">Lengkapi informasi dasar resep produk.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={active}
                onClick={() => setActive((value) => !value)}
                className="inline-flex items-center gap-2 text-sm"
              >
                <span className="text-muted">Status</span>
                <span className={`relative h-6 w-11 rounded-full ${active ? "bg-accent" : "bg-line"}`}>
                  <span className={`absolute top-0.5 size-5 rounded-full bg-white ${active ? "left-5" : "left-0.5"}`} />
                </span>
                <span className="font-medium">{active ? "Aktif" : "Nonaktif"}</span>
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium">Nama Produk</span>
                <input name="name" required value={name} onChange={(event) => setName(event.target.value)} className={`${inputClass} mt-1.5`} />
              </label>
              <label className="block text-sm">
                <span className="font-medium">Kategori</span>
                <select name="categoryId" required value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={`${inputClass} mt-1.5`}>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium">Porsi / Ukuran</span>
                <select name="portion" value={portionValue} onChange={(event) => setPortionValue(event.target.value)} className={`${inputClass} mt-1.5`}>
                  {portions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium">Harga Jual</span>
                <span className="mt-1.5 block">
                  <MoneyInput name="price" defaultValue={product?.price ?? 0} onValueChange={setPrice} />
                </span>
              </label>
            </div>
          </section>

          <section className={CARD}>
            <h2 className="font-semibold">Foto Produk</h2>
            <p className="mt-1 text-sm text-muted">Gunakan foto produk yang menarik dan sesuai.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)]">
              <div className="relative">
                {preview ? (
                  <img src={preview} alt="" className="aspect-square w-full rounded-xl object-cover" />
                ) : (
                  <ProductImage kind="products" filename={product?.image} name={name || "Resep"} className="aspect-square w-full rounded-xl object-cover text-lg" />
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
              <button type="button" onClick={() => inputRef.current?.click()} className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line px-3 py-4 text-center">
                <ImagePlus size={18} className="text-muted" aria-hidden />
                <span className="mt-2 text-sm font-medium">Unggah Foto</span>
                <span className="mt-1 text-xs text-muted">JPG, PNG, atau WEBP. Maks. 2MB. Rekomendasi 800 x 800 px.</span>
              </button>
              <div className="rounded-xl bg-chip/70 px-3 py-3 text-sm text-muted">
                <p className="inline-flex items-center gap-1 font-medium text-ink">
                  <Info size={14} aria-hidden />
                  Tips Foto
                </p>
                <p className="mt-1">Gunakan pencahayaan yang baik dan tampilkan produk dengan jelas.</p>
              </div>
              <input
                ref={inputRef}
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => setPreview(event.target.files?.[0] ? URL.createObjectURL(event.target.files[0]) : null)}
              />
            </div>
          </section>

          <section className={CARD}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Daftar Bahan</h2>
                <p className="mt-1 text-sm text-muted">Tambahkan bahan yang digunakan dalam resep beserta takarannya.</p>
              </div>
              <button
                type="button"
                onClick={() => setRows((list) => [...list, { key: lineKey(), inventoryItemId: inventory[0]?.id ?? "", quantity: 1 }])}
                className="btn inline-flex items-center gap-1 rounded-full border border-line px-3 text-sm font-medium"
              >
                <Plus size={14} aria-hidden />
                Tambah Bahan
              </button>
            </div>
            {inventory.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Belum ada bahan di inventori.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="pb-2 font-medium">#</th>
                      <th className="pb-2 font-medium">Nama Bahan</th>
                      <th className="pb-2 font-medium">Jumlah</th>
                      <th className="pb-2 font-medium">Satuan</th>
                      <th className="pb-2 font-medium">HPP (per satuan)</th>
                      <th className="pb-2 font-medium">Subtotal</th>
                      <th className="pb-2 font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const item = stock.get(row.inventoryItemId);
                      const cost = item?.cost ?? 0;
                      return (
                        <tr key={row.key} className="border-t border-line">
                          <td className="py-2 pr-2 text-muted">{index + 1}</td>
                          <td className="py-2 pr-2">
                            <select
                              name="inventoryItemId"
                              aria-label={`Bahan ${index + 1}`}
                              value={row.inventoryItemId}
                              onChange={(event) =>
                                setRows((list) => list.map((line) => (line.key === row.key ? { ...line, inventoryItemId: event.target.value } : line)))
                              }
                              className={inputClass}
                            >
                              {inventory.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 pr-2">
                            <IdNumberInput
                              name="quantity"
                              defaultValue={row.quantity}
                              onValueChange={(quantity) => setRows((list) => list.map((line) => (line.key === row.key ? { ...line, quantity } : line)))}
                            />
                          </td>
                          <td className="py-2 pr-2 whitespace-nowrap">{item?.unit ?? "—"}</td>
                          <td className="py-2 pr-2 whitespace-nowrap">{money(cost)}</td>
                          <td className="py-2 pr-2 whitespace-nowrap">{money(row.quantity * cost)}</td>
                          <td className="py-2">
                            <button
                              type="button"
                              aria-label={`Hapus bahan ${index + 1}`}
                              onClick={() => setRows((list) => list.filter((line) => line.key !== row.key))}
                              className="inline-flex size-9 items-center justify-center rounded-full text-danger hover:bg-danger/10"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-5 flex items-center justify-between gap-3">
              <Link href="/recipes" className="btn inline-flex items-center gap-2 rounded-full border border-line px-4 text-sm font-medium">
                <X size={15} aria-hidden />
                Batal
              </Link>
              <PrimaryButton type="submit" className="rounded-full">
                Simpan Resep
              </PrimaryButton>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className={CARD}>
            <h2 className="font-semibold">Preview Resep</h2>
            <div className="mt-4 flex items-start gap-3">
              {preview ? (
                <img src={preview} alt="" className="size-20 shrink-0 rounded-xl object-cover" />
              ) : (
                <ProductImage kind="products" filename={product?.image} name={name || "Resep"} className="size-20 shrink-0 rounded-xl object-cover" />
              )}
              <div className="min-w-0">
                <p className="font-semibold">{name || "Nama produk"}</p>
                <span className="mt-1 inline-flex rounded-full bg-chip px-2.5 py-1 text-xs font-semibold">{categoryName}</span>
                {product?.description && product.description.trim().toLowerCase() !== (product.name || "").trim().toLowerCase() ? (
                  <p className="mt-2 text-sm text-muted">{product.description}</p>
                ) : null}
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <PreviewRow label="Kategori" value={categoryName} />
              <PreviewRow label="Harga Jual" value={money(price)} />
              <PreviewRow label="Porsi" value={portionValue} />
              <PreviewRow label="Margin" value={`${margin}%`} />
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Status</dt>
                <dd>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-ok-soft text-ok" : "bg-chip text-muted"}`}>
                    {active ? "Aktif" : "Nonaktif"}
                  </span>
                </dd>
              </div>
            </dl>
          </section>
          <section className={CARD}>
            <h2 className="font-semibold">Ringkasan Biaya</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <PreviewRow label="Total HPP per porsi" value={money(hpp)} />
              <PreviewRow label="Harga Jual" value={money(price)} />
              <PreviewRow label="Estimasi Margin" value={`${margin}%`} />
            </dl>
          </section>
          <section className={CARD}>
            <h2 className="font-semibold">Catatan</h2>
            <textarea
              name="note"
              maxLength={500}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Tambahkan catatan untuk resep ini (opsional)..."
              className={`${inputClass} mt-3 min-h-28`}
            />
            <p className="mt-1 text-right text-xs text-muted">{comment.length}/500</p>
          </section>
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
