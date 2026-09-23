"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { money, num } from "@/lib/format";

type Tab = "info" | "variants" | "addons" | "recipe";

export function ProductDetail({
  product,
  variants,
  addons,
  recipeLines,
  closeHref,
  editHref,
  currency,
}: {
  product: {
    id: string;
    name: string;
    sku: string;
    description: string | null;
    image: string | null;
    categoryName: string;
    price: string;
    status: string;
    kind: "goods" | "recipe";
    currentStock: string;
    minimumStock: string;
    stockStatus: string;
  };
  variants: { name: string; options: { name: string; priceAdjustment: string }[] }[];
  addons: { id: string; name: string; price: string }[];
  recipeLines: { name: string; quantity: number; unit: string }[];
  closeHref: string;
  editHref: string;
  currency: string;
}) {
  const recipe = product.kind === "recipe";
  const [tab, setTab] = useState<Tab>("info");
  const active = product.status === "active";
  const tabs: { id: Tab; label: string }[] = [
    { id: "info", label: "Informasi" },
    ...(recipe
      ? [
          { id: "variants" as const, label: `Varian (${variants.length})` },
          { id: "addons" as const, label: `Topping (${addons.length})` },
          { id: "recipe" as const, label: `Resep (${recipeLines.length})` },
        ]
      : []),
  ];

  return (
    <aside className="rounded-2xl border border-line bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div />
        <Link href={closeHref} aria-label="Tutup detail" className="rounded-full p-2 text-muted hover:bg-chip">
          <X size={16} />
        </Link>
      </div>
      <ProductImage kind="products" filename={product.image} name={product.name} className="h-44 w-full rounded-2xl object-cover" />
      <div className="mt-3 flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold">{product.name}</h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-ok-soft text-ok" : "bg-chip text-muted"}`}>
          {active ? "Aktif" : "Nonaktif"}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">SKU: {product.sku}</p>
      <p className="text-xs text-muted">Kategori: {product.categoryName}</p>
      {product.description ? <p className="mt-2 text-sm text-muted">{product.description}</p> : null}
      <p className="mt-3 text-xl font-semibold">{money(num(product.price), currency)}</p>
      <Link href={editHref} className="mt-3 inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium">
        <Pencil size={14} aria-hidden />
        Edit Produk
      </Link>

      <div className="mt-4 flex flex-wrap gap-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${tab === item.id ? "bg-accent text-white" : "bg-chip text-muted"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "info" ? (
        <div className="mt-4 grid gap-3">
          <Readout label="Nama Produk">{product.name}</Readout>
          <Readout label="Kategori">{product.categoryName}</Readout>
          <Readout label="Deskripsi">{product.description || "—"}</Readout>
          <div className="grid grid-cols-2 gap-3">
            <Readout label="Harga">{money(num(product.price), currency)}</Readout>
            <Readout label="SKU">{product.sku}</Readout>
          </div>
          <Readout label="Status">{active ? "Aktif" : "Nonaktif"}</Readout>
          {recipe ? (
            <Readout label="Stok">{product.stockStatus === "sold_out" ? "Habis" : "Tersedia"}</Readout>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Readout label="Stok">{num(product.currentStock)}</Readout>
              <Readout label="Minimum Stok">{num(product.minimumStock)}</Readout>
            </div>
          )}
        </div>
      ) : null}

      {tab === "variants" ? (
        <ul className="mt-4 space-y-3 text-sm">
          {variants.length === 0 ? <li className="text-muted">Belum ada varian.</li> : null}
          {variants.map((variant) => (
            <li key={variant.name} className="rounded-xl border border-line p-3">
              <p className="font-semibold">{variant.name}</p>
              <ul className="mt-1 text-muted">
                {variant.options.map((option) => (
                  <li key={option.name}>
                    {option.name}
                    {num(option.priceAdjustment) ? ` (+${money(num(option.priceAdjustment), currency)})` : ""}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "addons" ? (
        <ul className="mt-4 space-y-2 text-sm">
          {addons.length === 0 ? <li className="text-muted">Belum ada topping.</li> : null}
          {addons.map((addon) => (
            <li key={addon.id} className="flex items-center justify-between rounded-xl border border-line px-3 py-2">
              <span>{addon.name}</span>
              <span className="text-muted">{money(num(addon.price), currency)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "recipe" ? (
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
          <Link href={`/recipes/${product.id}`} className="mt-3 inline-flex text-sm font-medium underline">
            Kelola resep
          </Link>
        </div>
      ) : null}
    </aside>
  );
}

function Readout({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs text-muted">{label}</p>
      <div className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm">{children}</div>
    </div>
  );
}
