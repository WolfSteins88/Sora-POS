"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, ClipboardList, Coffee, Plus, Settings2, X } from "lucide-react";
import { deleteProduct, saveProduct } from "@/app/actions/ops";
import { ImageField } from "@/components/ImageField";
import { IdNumberInput } from "@/components/IdNumberInput";
import { MoneyInput } from "@/components/MoneyInput";
import { ProductImage } from "@/components/ProductImage";
import { inputClass } from "@/components/ui";
import { money, num } from "@/lib/format";
import { RecipeExtras } from "./RecipeExtras";

type Category = { id: string; name: string };
type Variant = {
  name: string;
  isRequired: boolean;
  options: { name: string; priceAdjustment: number; isDefault: boolean }[];
};
type Addon = { id: string; name: string; price?: string };
type RecipeLine = { name: string; quantity: number; unit: string };
type ProductValues = {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  kind: "goods" | "recipe";
  price: string;
  cost: string;
  description: string | null;
  status: string;
  stockStatus: string;
  currentStock: string;
  minimumStock: string;
  catalogPack?: "fnb" | "retail";
  image?: string | null;
  isFeatured?: boolean;
  sortOrder?: number;
};

const FORM_ID = "product-editor-form";

export function ProductForm({
  categories,
  pack,
  product,
  closeHref,
  desk = false,
  initialVariants = [],
  allAddons = [],
  linkedAddonIds = [],
  recipeLines = [],
  defaultKind = "goods",
}: {
  categories: Category[];
  pack: "fnb" | "retail";
  product?: ProductValues;
  closeHref?: string;
  desk?: boolean;
  initialVariants?: Variant[];
  allAddons?: Addon[];
  linkedAddonIds?: string[];
  recipeLines?: RecipeLine[];
  defaultKind?: "goods" | "recipe";
}) {
  const lockedPack = product?.catalogPack ?? pack;
  const isRetail = lockedPack === "retail";
  const [kind, setKind] = useState<"goods" | "recipe">(isRetail ? "goods" : (product?.kind ?? defaultKind));
  const [active, setActive] = useState(product?.status !== "inactive");
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(num(product?.price ?? 0));
  const [tab, setTab] = useState("info");
  const showStock = isRetail || kind === "goods";
  const showRecipeTabs = Boolean(product) && !isRetail && product?.kind === "recipe";
  const tabs = [
    { id: "info", label: "Informasi Dasar", icon: ClipboardList },
    ...(showRecipeTabs
      ? [
          { id: "variants", label: "Varian", icon: Coffee },
          { id: "addons", label: "Topping", icon: Plus },
          { id: "recipe", label: "Resep / BOM", icon: BookOpen },
        ]
      : []),
    { id: "settings", label: "Pengaturan lainnya", icon: Settings2 },
  ];
  const cancelHref = closeHref ?? `/products?pack=${lockedPack}`;

  return (
    <div className="rounded-3xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{product ? "Edit Produk" : "Tambah Produk"}</h2>
          <p className="mt-1 text-sm text-muted">
            {isRetail
              ? "Ubah informasi produk dan stok barang."
              : "Ubah informasi produk, varian, topping, dan resep bahan baku."}
          </p>
        </div>
        {closeHref ? (
          <Link href={closeHref} aria-label="Tutup" className="rounded-full p-2 text-muted hover:bg-chip">
            <X size={18} />
          </Link>
        ) : null}
      </div>

      {categories.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-line p-4 text-sm">
          <p>Buat kategori untuk katalog ini sebelum menambah produk.</p>
          <Link href={`/categories?pack=${lockedPack}`} className="mt-3 inline-flex rounded-full bg-accent px-4 py-2 font-semibold text-white">
            Tambah kategori
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {tabs.map((item) => {
              const Icon = item.icon;
              const selected = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium ${
                    selected ? "bg-accent text-white" : "border border-line bg-white text-ink"
                  }`}
                >
                  <Icon size={14} aria-hidden />
                  {item.label}
                </button>
              );
            })}
          </div>

          <form id={FORM_ID} action={saveProduct} className={tab === "info" || tab === "settings" ? "mt-4 space-y-4" : "hidden"}>
            {product ? <input type="hidden" name="id" value={product.id} /> : null}
            <input type="hidden" name="catalogPack" value={lockedPack} />
            <input type="hidden" name="status" value={active ? "active" : "inactive"} />
            {desk ? <input type="hidden" name="next" value="desk" /> : null}
            {isRetail ? <input type="hidden" name="kind" value="goods" /> : null}

            <div className={tab === "info" ? "space-y-4" : "hidden"}>
              <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
                <div className="flex h-full flex-col rounded-2xl border border-line p-3">
                  <p className="mb-2 text-sm font-medium">Foto Produk</p>
                  <ImageField variant="card" kind="products" filename={product?.image} name={name || "Produk"} />
                </div>
                <div className="grid gap-3">
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Nama Produk</span>
                    <input name="name" required value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Kategori</span>
                    <select name="categoryId" required defaultValue={product?.categoryId} className={inputClass}>
                      {categories.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">SKU</span>
                    {product ? (
                      <>
                        <input className={`${inputClass} bg-chip`} value={product.sku} readOnly />
                        <input type="hidden" name="sku" value={product.sku} />
                      </>
                    ) : (
                      <input className={`${inputClass} bg-chip`} disabled placeholder="Otomatis saat simpan" />
                    )}
                  </label>
                  <div className="inline-flex w-fit items-center gap-2">
                    <span className="text-sm font-medium">Status</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={active}
                      aria-label={active ? "Aktif" : "Nonaktif"}
                      onClick={() => setActive((value) => !value)}
                      className={`relative h-6 w-11 rounded-full ${active ? "bg-accent" : "bg-line"}`}
                    >
                      <span className={`absolute top-0.5 size-5 rounded-full bg-white ${active ? "left-5" : "left-0.5"}`} />
                    </button>
                    <span className="text-sm text-muted">{active ? "Aktif" : "Nonaktif"}</span>
                  </div>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Deskripsi</span>
                    <textarea
                      name="description"
                      rows={3}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
                <div className="rounded-2xl border border-line p-4">
                  <p className="mb-3 text-sm font-semibold">Harga & Stok</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="mb-1 block font-medium">Harga Jual</span>
                      <MoneyInput name="price" value={price} onValueChange={setPrice} />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block font-medium">Harga Modal</span>
                      <MoneyInput name="cost" defaultValue={product?.cost ?? 0} />
                    </label>
                    {showStock ? (
                      <>
                        <label className="block text-sm">
                          <span className="mb-1 block font-medium">Stok Saat Ini</span>
                          <IdNumberInput name="currentStock" defaultValue={product?.currentStock ?? "0"} />
                        </label>
                        <label className="block text-sm">
                          <span className="mb-1 block font-medium">Minimum Stok</span>
                          <IdNumberInput name="minimumStock" defaultValue={product?.minimumStock ?? "0"} />
                        </label>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-2xl border border-line p-4">
                  <p className="text-sm font-semibold">Pratinjau di POS</p>
                  <ProductImage kind="products" filename={product?.image} name={name || "Produk"} className="mt-3 h-24 w-full rounded-xl object-cover" />
                  <p className="mt-2 font-semibold">{name || "Nama produk"}</p>
                  <p className="line-clamp-2 text-xs text-muted">{description || "Deskripsi produk"}</p>
                  <p className="mt-2 font-semibold">{money(price)}</p>
                </div>
              </div>
            </div>

            <div className={tab === "settings" ? "grid gap-3 sm:grid-cols-2" : "hidden"}>
              {isRetail ? null : (
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Jenis</span>
                  <select
                    name="kind"
                    className={inputClass}
                    value={kind}
                    onChange={(event) => setKind(event.target.value as "goods" | "recipe")}
                  >
                    <option value="goods">Barang (stok SKU)</option>
                    <option value="recipe">Racikan (BOM)</option>
                  </select>
                </label>
              )}
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Urutan tampil</span>
                <input name="sortOrder" type="number" defaultValue={product?.sortOrder ?? 0} className={inputClass} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Status stok</span>
                <select name="stockStatus" defaultValue={product?.stockStatus ?? "available"} className={inputClass}>
                  <option value="available">Tersedia</option>
                  <option value="sold_out">Habis</option>
                </select>
              </label>
              <label className="flex items-center gap-2 self-end text-sm">
                <input type="checkbox" name="isFeatured" value="1" defaultChecked={product?.isFeatured} className="size-4" />
                Unggulan (tampil di atas kasir)
              </label>
              {showRecipeTabs || isRetail ? null : (
                <p className="text-sm text-muted sm:col-span-2">
                  {product
                    ? "Ubah jenis menjadi racikan dan simpan untuk mengatur varian, topping, dan resep."
                    : "Simpan dulu. Varian, topping, dan resep tersedia setelah produk racikan tersimpan."}
                </p>
              )}
            </div>
          </form>

          {showRecipeTabs && product && tab === "variants" ? (
            <div className="mt-4">
              <RecipeExtras
                productId={product.id}
                kind="recipe"
                section="variants"
                initialVariants={initialVariants}
                allAddons={allAddons}
                linkedAddonIds={linkedAddonIds}
              />
            </div>
          ) : null}
          {showRecipeTabs && product && tab === "addons" ? (
            <div className="mt-4">
              <RecipeExtras
                productId={product.id}
                kind="recipe"
                section="addons"
                initialVariants={initialVariants}
                allAddons={allAddons}
                linkedAddonIds={linkedAddonIds}
              />
            </div>
          ) : null}
          {showRecipeTabs && product && tab === "recipe" ? (
            <div className="mt-4 text-sm">
              {recipeLines.length === 0 ? <p className="text-muted">Belum ada bahan.</p> : null}
              <ul className="space-y-2">
                {recipeLines.map((line) => (
                  <li key={`${line.name}-${line.unit}`} className="flex items-center justify-between rounded-xl border border-line px-3 py-2">
                    <span>{line.name}</span>
                    <span className="text-muted">
                      {line.quantity} {line.unit}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href={`/recipes/${product.id}`} className="mt-3 inline-flex font-medium underline">
                Kelola resep
              </Link>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            {product ? (
              <form action={deleteProduct}>
                <input type="hidden" name="id" value={product.id} />
                <input type="hidden" name="next" value="desk" />
                <button type="submit" className="inline-flex h-11 items-center rounded-full border border-danger px-4 text-sm font-semibold text-danger">
                  Hapus Produk
                </button>
              </form>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Link href={cancelHref} className="inline-flex h-11 items-center rounded-full border border-line px-4 text-sm font-medium">
                Batal
              </Link>
              {tab === "info" || tab === "settings" ? (
                <button form={FORM_ID} type="submit" className="inline-flex h-11 items-center rounded-full bg-accent px-4 text-sm font-semibold text-white">
                  Simpan Perubahan
                </button>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
