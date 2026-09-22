"use client";

import { useState } from "react";
import { saveProduct } from "@/app/actions/ops";
import { Field, PrimaryButton, inputClass } from "@/components/ui";
import { MoneyInput } from "@/components/MoneyInput";
import { IdNumberInput } from "@/components/IdNumberInput";
import { ImageField } from "@/components/ImageField";

type Category = { id: string; name: string; catalogPack?: "fnb" | "retail" };

export function ProductForm({
  categories,
  pack,
  product,
}: {
  categories: Category[];
  pack: "fnb" | "retail";
  product?: {
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
}) {
  const lockedPack = product?.catalogPack ?? pack;
  const isRetail = lockedPack === "retail";
  const [kind, setKind] = useState<"goods" | "recipe">(isRetail ? "goods" : (product?.kind ?? "goods"));
  const showStock = isRetail || kind === "goods";

  return (
    <form action={saveProduct} className="grid gap-6 lg:grid-cols-12">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <input type="hidden" name="catalogPack" value={lockedPack} />
      {isRetail ? <input type="hidden" name="kind" value="goods" /> : null}

      <div className="space-y-3 lg:col-span-6">
        <Field label="Foto" hint="JPG, PNG, atau WEBP. Maksimal 2MB.">
          <ImageField kind="products" filename={product?.image} name={product?.name || "Produk"} />
        </Field>
        <Field label="Nama">
          <input name="name" required defaultValue={product?.name} className={inputClass} />
        </Field>
        <Field label="SKU" hint={product ? undefined : "Otomatis saat simpan"}>
          {product ? (
            <>
              <input className={`${inputClass} bg-chip`} value={product.sku} readOnly />
              <input type="hidden" name="sku" value={product.sku} />
            </>
          ) : (
            <input className={`${inputClass} bg-chip`} disabled placeholder="Otomatis saat simpan" />
          )}
        </Field>
        <Field label="Kategori">
          <select name="categoryId" required defaultValue={product?.categoryId} className={inputClass}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        {isRetail ? null : (
          <Field label="Jenis">
            <select
              name="kind"
              className={inputClass}
              value={kind}
              onChange={(e) => setKind(e.target.value as "goods" | "recipe")}
            >
              <option value="goods">Barang (stok SKU)</option>
              <option value="recipe">Racikan (BOM)</option>
            </select>
          </Field>
        )}
        <Field label="Deskripsi">
          <input name="description" defaultValue={product?.description ?? ""} className={inputClass} />
        </Field>
      </div>

      <div className="space-y-3 lg:col-span-6">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Harga jual">
            <MoneyInput name="price" defaultValue={product?.price ?? 0} />
          </Field>
          <Field label="HPP">
            <MoneyInput name="cost" defaultValue={product?.cost ?? 0} />
          </Field>
        </div>
        {showStock ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stok saat ini" hint="Boleh koma, contoh 15,5">
              <IdNumberInput name="currentStock" defaultValue={product?.currentStock ?? "0"} />
            </Field>
            <Field label="Stok minimum">
              <IdNumberInput name="minimumStock" defaultValue={product?.minimumStock ?? "0"} />
            </Field>
          </div>
        ) : null}
        <Field label="Status stok">
          <select name="stockStatus" defaultValue={product?.stockStatus ?? "available"} className={inputClass}>
            <option value="available">Tersedia</option>
            <option value="sold_out">Habis</option>
          </select>
        </Field>
        <Field label="Urutan tampil">
          <input name="sortOrder" type="number" defaultValue={product?.sortOrder ?? 0} className={inputClass} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isFeatured" value="1" defaultChecked={product?.isFeatured} className="size-4" />
          Unggulan (tampil di atas kasir)
        </label>
        <Field label="Status">
          <select name="status" defaultValue={product?.status ?? "active"} className={inputClass}>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </Field>
        <PrimaryButton type="submit">Simpan</PrimaryButton>
      </div>
    </form>
  );
}
