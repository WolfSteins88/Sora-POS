"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteCategory, saveCategory } from "@/app/actions/ops";
import { ImageField } from "@/components/ImageField";
import { inputClass, PrimaryButton } from "@/components/ui";

export function CategoryForm({
  category,
  pack,
}: {
  category: {
    id: string;
    name: string;
    description: string | null;
    image: string | null;
    sortOrder: number;
    status: "active" | "inactive";
  } | null;
  pack: "fnb" | "retail";
}) {
  const [active, setActive] = useState(category?.status !== "inactive");
  return (
    <form action={saveCategory} className="flex flex-col gap-4" key={category?.id ?? "new"}>
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <input type="hidden" name="catalogPack" value={pack} />
      <input type="hidden" name="status" value={active ? "active" : "inactive"} />
      <div>
        <ImageField kind="categories" filename={category?.image} name={category?.name || "Kategori"} variant="card" pickLabel="Ubah Foto" />
        <p className="mt-2 text-xs text-muted">Rekomendasi ukuran 400 x 400 px.</p>
      </div>
      <label className="block text-sm">
        <span className="font-medium">Nama Kategori</span>
        <input name="name" required defaultValue={category?.name ?? ""} className={`${inputClass} mt-1.5`} />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Deskripsi</span>
        <textarea name="description" rows={3} defaultValue={category?.description ?? ""} className={`${inputClass} mt-1.5`} />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Urutan (Di menu POS)</span>
        <input name="sortOrder" type="number" min={0} required defaultValue={category?.sortOrder ?? 0} className={`${inputClass} mt-1.5`} />
        <span className="mt-1 block text-xs text-muted">Kategori dengan angka kecil lebih dulu ditampilkan di menu POS.</span>
      </label>
      <div>
        <p className="text-sm font-medium">Status</p>
        <div className="mt-2 inline-flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={active}
            aria-label={active ? "Nonaktifkan kategori" : "Aktifkan kategori"}
            onClick={() => setActive((value) => !value)}
            className={`relative h-6 w-11 rounded-full transition ${active ? "bg-accent" : "bg-line"}`}
          >
            <span className={`absolute top-0.5 size-5 rounded-full bg-white ${active ? "left-5" : "left-0.5"}`} />
          </button>
          <span className="text-sm">{active ? "Aktif" : "Nonaktif"}</span>
        </div>
        <p className="mt-1 text-xs text-muted">Kategori akan muncul di menu POS.</p>
      </div>
      <div className="flex items-center justify-between gap-2 pt-2">
        {category ? (
          <button
            type="submit"
            formAction={deleteCategory}
            formNoValidate
            className="inline-flex h-11 items-center gap-2 rounded-full bg-danger/10 px-4 text-sm font-medium text-danger"
          >
            <Trash2 size={15} aria-hidden />
            Hapus Kategori
          </button>
        ) : (
          <span />
        )}
        <PrimaryButton type="submit" className="rounded-full">
          Simpan Perubahan
        </PrimaryButton>
      </div>
    </form>
  );
}
