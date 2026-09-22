"use client";

import { useState } from "react";
import { saveRecipe } from "@/app/actions/ops";
import { Field, GhostButton, PrimaryButton, inputClass } from "@/components/ui";
import { formatIdDecimal, parseIdNumber } from "@/lib/format";

type Item = { inventoryItemId: string; quantity: number };

export function RecipeEditor({
  productId,
  note,
  items,
  inventory,
}: {
  productId: string;
  note: string;
  items: Item[];
  inventory: { id: string; name: string; unit: string }[];
}) {
  const [rows, setRows] = useState<Item[]>(items.length ? items : [{ inventoryItemId: inventory[0]?.id ?? "", quantity: 1 }]);
  const [n, setN] = useState(note);
  return (
    <form
      className="space-y-3"
      action={async () => {
        await saveRecipe(productId, rows, n);
      }}
    >
      <Field label="Catatan">
        <input className={inputClass} value={n} onChange={(e) => setN(e.target.value)} />
      </Field>
      <div className="space-y-2">
        <div className="hidden grid-cols-[minmax(0,1fr)_8rem] gap-2 text-xs font-semibold tracking-wide text-muted uppercase sm:grid">
          <span>Bahan</span>
          <span>Jumlah</span>
        </div>
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_8rem] gap-2">
            <select
              className={inputClass}
              aria-label="Bahan"
              value={row.inventoryItemId}
              onChange={(e) =>
                setRows((list) => list.map((r, idx) => (idx === i ? { ...r, inventoryItemId: e.target.value } : r)))
              }
            >
              {inventory.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.name} ({inv.unit})
                </option>
              ))}
            </select>
            <input
              inputMode="decimal"
              aria-label="Jumlah"
              className={inputClass}
              value={row.quantity ? formatIdDecimal(row.quantity) : ""}
              onChange={(e) =>
                setRows((list) => list.map((r, idx) => (idx === i ? { ...r, quantity: parseIdNumber(e.target.value) } : r)))
              }
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <GhostButton
          type="button"
          onClick={() => setRows((list) => [...list, { inventoryItemId: inventory[0]?.id ?? "", quantity: 1 }])}
        >
          Tambah bahan
        </GhostButton>
        <PrimaryButton type="submit">Simpan resep</PrimaryButton>
      </div>
    </form>
  );
}
