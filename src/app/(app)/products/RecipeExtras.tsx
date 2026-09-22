"use client";

import { useState } from "react";
import { saveProductAddons, saveVariants } from "@/app/actions/ops";
import { PrimaryButton, inputClass } from "@/components/ui";
import { formatIdNumber, parseIdNumber } from "@/lib/format";

type Variant = {
  name: string;
  isRequired: boolean;
  options: { name: string; priceAdjustment: number; isDefault: boolean }[];
};

export function RecipeExtras({
  productId,
  kind,
  initialVariants,
  allAddons,
  linkedAddonIds,
}: {
  productId: string;
  kind: "goods" | "recipe";
  initialVariants: Variant[];
  allAddons: { id: string; name: string }[];
  linkedAddonIds: string[];
}) {
  const [variants, setVariants] = useState<Variant[]>(
    initialVariants.length
      ? initialVariants
      : [{ name: "Ukuran", isRequired: true, options: [{ name: "Regular", priceAdjustment: 0, isDefault: true }] }],
  );
  const [addonIds, setAddonIds] = useState<string[]>(linkedAddonIds);
  if (kind !== "recipe") {
    return <p className="text-sm text-muted">Variant dan add-on hanya untuk racikan.</p>;
  }
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold">Variant</h3>
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
          <PrimaryButton type="submit">Simpan variant</PrimaryButton>
        </form>
      </div>
      <div>
        <h3 className="font-semibold">Add-on produk</h3>
        {allAddons.map((a) => (
          <label key={a.id} className="mt-1 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={addonIds.includes(a.id)}
              onChange={(e) =>
                setAddonIds((ids) => (e.target.checked ? [...ids, a.id] : ids.filter((id) => id !== a.id)))
              }
            />
            {a.name}
          </label>
        ))}
        <form
          className="mt-3"
          action={async () => {
            await saveProductAddons(productId, addonIds);
          }}
        >
          <PrimaryButton type="submit">Simpan add-on</PrimaryButton>
        </form>
      </div>
    </div>
  );
}
