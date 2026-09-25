"use client";

import { useState } from "react";
import { saveProductToppings, saveVariants } from "@/app/actions/ops";
import { PrimaryButton, inputClass } from "@/components/ui";
import { formatIdNumber, parseIdNumber } from "@/lib/format";

type Variant = {
  name: string;
  isRequired: boolean;
  options: { name: string; priceAdjustment: number; isDefault: boolean }[];
};

type ToppingRow = { key: string; id?: string; name: string; price: number; linked: boolean };

export function RecipeExtras({
  productId,
  initialVariants,
  allAddons,
  linkedAddonIds,
  section = "all",
}: {
  productId: string;
  initialVariants: Variant[];
  allAddons: { id: string; name: string; price?: string }[];
  linkedAddonIds: string[];
  section?: "all" | "variants" | "addons";
}) {
  const [variants, setVariants] = useState<Variant[]>(
    initialVariants.length
      ? initialVariants
      : [{ name: "Ukuran", isRequired: true, options: [{ name: "Regular", priceAdjustment: 0, isDefault: true }] }],
  );
  const [toppings, setToppings] = useState<ToppingRow[]>(() =>
    allAddons.map((addon) => ({
      key: addon.id,
      id: addon.id,
      name: addon.name,
      price: Number(addon.price) || 0,
      linked: linkedAddonIds.includes(addon.id),
    })),
  );
  const showVariants = section === "all" || section === "variants";
  const showAddons = section === "all" || section === "addons";
  return (
    <div className="space-y-6">
      {showVariants ? (
      <div>
        <h3 className="font-semibold">Varian</h3>
        {variants.map((v, i) => (
          <div key={i} className="mt-3 rounded-xl border border-line p-3">
            <input
              className={inputClass}
              value={v.name}
              onChange={(e) =>
                setVariants((rows) => rows.map((r, idx) => (idx === i ? { ...r, name: e.target.value } : r)))
              }
            />
            {v.options.map((o, j) => (
              <div key={j} className="mt-2 grid grid-cols-[1fr_120px] gap-2">
                <input
                  className={inputClass}
                  value={o.name}
                  onChange={(e) =>
                    setVariants((rows) =>
                      rows.map((r, idx) =>
                        idx === i
                          ? {
                              ...r,
                              options: r.options.map((opt, k) =>
                                k === j ? { ...opt, name: e.target.value } : opt,
                              ),
                            }
                          : r,
                      ),
                    )
                  }
                />
                <input
                  inputMode="numeric"
                  className={inputClass}
                  value={o.priceAdjustment ? formatIdNumber(o.priceAdjustment) : ""}
                  onChange={(e) =>
                    setVariants((rows) =>
                      rows.map((r, idx) =>
                        idx === i
                          ? {
                              ...r,
                              options: r.options.map((opt, k) =>
                                k === j ? { ...opt, priceAdjustment: parseIdNumber(e.target.value) } : opt,
                              ),
                            }
                          : r,
                      ),
                    )
                  }
                />
              </div>
            ))}
            <button
              type="button"
              className="mt-2 text-sm underline"
              onClick={() =>
                setVariants((rows) =>
                  rows.map((r, idx) =>
                    idx === i
                      ? { ...r, options: [...r.options, { name: "", priceAdjustment: 0, isDefault: false }] }
                      : r,
                  ),
                )
              }
            >
              Tambah opsi
            </button>
          </div>
        ))}
        <button
          type="button"
          className="mt-2 text-sm underline"
          onClick={() =>
            setVariants((rows) => [...rows, { name: "", isRequired: false, options: [{ name: "", priceAdjustment: 0, isDefault: true }] }])
          }
        >
          Tambah variant
        </button>
        <form
          className="mt-3"
          action={async () => {
            await saveVariants(productId, JSON.stringify(variants));
          }}
        >
          <PrimaryButton type="submit">Simpan varian</PrimaryButton>
        </form>
      </div>
      ) : null}
      {showAddons ? (
      <div>
        <h3 className="font-semibold">Topping</h3>
        <p className="mt-1 text-sm text-muted">Centang topping yang dipakai produk ini. Nama dan harga berlaku untuk semua produk.</p>
        {toppings.map((row, index) => (
          <div key={row.key} className="mt-2 grid grid-cols-[auto_1fr_8rem] items-center gap-2">
            <input
              type="checkbox"
              aria-label={`Pakai ${row.name || "topping"}`}
              checked={row.linked}
              onChange={(event) =>
                setToppings((items) =>
                  items.map((item, i) => (i === index ? { ...item, linked: event.target.checked } : item)),
                )
              }
            />
            <input
              className={inputClass}
              placeholder="Nama topping"
              value={row.name}
              onChange={(event) =>
                setToppings((items) =>
                  items.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)),
                )
              }
            />
            <input
              inputMode="numeric"
              className={inputClass}
              placeholder="Harga"
              aria-label="Harga topping"
              value={row.price ? formatIdNumber(row.price) : ""}
              onChange={(event) =>
                setToppings((items) =>
                  items.map((item, i) =>
                    i === index ? { ...item, price: parseIdNumber(event.target.value) } : item,
                  ),
                )
              }
            />
          </div>
        ))}
        <button
          type="button"
          className="mt-2 text-sm underline"
          onClick={() =>
            setToppings((items) => [
              ...items,
              { key: crypto.randomUUID(), name: "", price: 0, linked: true },
            ])
          }
        >
          Tambah topping
        </button>
        <form
          className="mt-3"
          action={async () => {
            const saved = await saveProductToppings(
              productId,
              toppings.map((row) => ({ id: row.id, name: row.name, price: row.price, linked: row.linked })),
            );
            setToppings(
              saved.map((row) => ({
                key: row.id,
                id: row.id,
                name: row.name,
                price: row.price,
                linked: row.linked,
              })),
            );
          }}
        >
          <PrimaryButton type="submit">Simpan topping</PrimaryButton>
        </form>
      </div>
      ) : null}
    </div>
  );
}
