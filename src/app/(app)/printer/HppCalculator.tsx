"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveHppCalculator } from "@/app/actions/ops";
import { MoneyInput } from "@/components/MoneyInput";
import {
  Card,
  Field,
  PrimaryButton,
  compactInputClass,
  dangerActionClass,
  ghostButtonClass,
  inputClass,
} from "@/components/ui";
import { formatIdDecimal, money, num, parseIdNumber } from "@/lib/format";
import type { RecipeHppRow } from "@/server/queries";

type InventoryOption = { id: string; name: string; sku: string; unit: string; cost: string };

type Line = {
  key: string;
  inventoryItemId: string;
  quantity: number;
  cost: number;
  draft?: { name: string; sku: string; unit: string };
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function linesFromProduct(row: RecipeHppRow | undefined): Line[] {
  if (!row?.lines.length) return [];
  return row.lines.map((line) => ({
    key: uid(),
    inventoryItemId: line.inventoryItemId,
    quantity: num(line.quantity),
    cost: num(line.cost),
  }));
}

function priceFromMargin(hpp: number, marginPct: number) {
  if (hpp <= 0 || marginPct < 0 || marginPct >= 100) return 0;
  return Math.round(hpp / (1 - marginPct / 100));
}

function marginFromPrice(hpp: number, price: number) {
  if (hpp <= 0 || price <= 0) return 0;
  return Math.round(((price - hpp) / price) * 1000) / 10;
}

export function HppCalculator({
  products,
  inventory,
}: {
  products: RecipeHppRow[];
  inventory: InventoryOption[];
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const selected = products.find((p) => p.id === productId);
  const [lines, setLines] = useState<Line[]>(() => linesFromProduct(products[0]));
  const [price, setPrice] = useState(() => num(products[0]?.price));
  const [marginPct, setMarginPct] = useState(() => {
    const row = products[0];
    return row ? marginFromPrice(num(row.hpp), num(row.price)) : 0;
  });
  const [marginText, setMarginText] = useState(() => {
    const row = products[0];
    const m = row ? marginFromPrice(num(row.hpp), num(row.price)) : 0;
    return m ? formatIdDecimal(m, 1) : "";
  });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [pending, setPending] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", sku: "", unit: "pcs", cost: 0, quantity: 1 });
  const router = useRouter();

  const hpp = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity * line.cost, 0),
    [lines],
  );
  const marginRp = price - hpp;

  function loadProduct(id: string) {
    const row = products.find((p) => p.id === id);
    setProductId(id);
    setLines(linesFromProduct(row));
    const nextPrice = num(row?.price);
    const nextHpp = num(row?.hpp);
    const nextMargin = marginFromPrice(nextHpp, nextPrice);
    setPrice(nextPrice);
    setMarginPct(nextMargin);
    setMarginText(nextMargin ? formatIdDecimal(nextMargin, 1) : "");
    setError("");
    setSaved("");
  }

  function commitLines(next: Line[]) {
    setLines(next);
    const nextHpp = next.reduce((sum, line) => sum + line.quantity * line.cost, 0);
    if (nextHpp <= 0) {
      setPrice(0);
      return;
    }
    if (marginPct >= 100) {
      setError("Margin harus di bawah 100%.");
      return;
    }
    setError("");
    setPrice(priceFromMargin(nextHpp, marginPct));
  }

  function patchLine(key: string, patch: Partial<Line>) {
    commitLines(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function onPickIngredient(key: string, inventoryItemId: string) {
    const item = inventory.find((inv) => inv.id === inventoryItemId);
    patchLine(key, {
      inventoryItemId,
      cost: item ? num(item.cost) : 0,
      draft: undefined,
    });
  }

  function onMarginChange(raw: string) {
    const cleaned = raw.replaceAll(/[^\d,]/g, "");
    setMarginText(cleaned);
    const m = parseIdNumber(cleaned);
    if (m >= 100) {
      setError("Margin harus di bawah 100%.");
      return;
    }
    setError("");
    setMarginPct(m);
    if (hpp > 0) setPrice(priceFromMargin(hpp, m));
  }

  function onPriceChange(n: number) {
    setPrice(n);
    const m = marginFromPrice(hpp, n);
    setMarginPct(m);
    setMarginText(m ? formatIdDecimal(m, 1) : "");
    setError("");
  }

  function addInventoryLine() {
    const first = inventory[0];
    const line: Line = first
      ? { key: uid(), inventoryItemId: first.id, quantity: 1, cost: num(first.cost) }
      : { key: uid(), inventoryItemId: "", quantity: 1, cost: 0, draft: { name: "", sku: "", unit: "pcs" } };
    commitLines([...lines, line]);
  }

  function addNewIngredient() {
    if (!newItem.name.trim()) {
      setError("Nama bahan baru wajib.");
      return;
    }
    const line: Line = {
      key: uid(),
      inventoryItemId: "",
      quantity: newItem.quantity || 1,
      cost: newItem.cost,
      draft: { name: newItem.name.trim(), sku: newItem.sku.trim(), unit: newItem.unit },
    };
    commitLines([...lines, line]);
    setNewItem({ name: "", sku: "", unit: "pcs", cost: 0, quantity: 1 });
    setError("");
  }

  function removeLine(key: string) {
    commitLines(lines.filter((line) => line.key !== key));
  }

  async function save() {
    if (!productId) return;
    if (marginPct >= 100) {
      setError("Margin harus di bawah 100%.");
      return;
    }
    setPending(true);
    setError("");
    setSaved("");
    try {
      await saveHppCalculator({
        productId,
        price,
        lines: lines
          .filter((line) => line.quantity > 0 && (line.inventoryItemId || line.draft?.name))
          .map((line) => ({
            inventoryItemId: line.inventoryItemId || undefined,
            quantity: line.quantity,
            cost: line.cost,
            name: line.draft?.name,
            sku: line.draft?.sku,
            unit: line.draft?.unit,
          })),
      });
      setSaved("HPP tersimpan ke resep dan produk.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan HPP.");
    } finally {
      setPending(false);
    }
  }

  if (products.length === 0) {
    return (
      <Card className="flex h-full flex-col p-5">
        <h2 className="text-lg font-semibold">Kalkulator HPP</h2>
        <p className="mt-6 text-sm text-muted">Belum ada produk racikan F&B.</p>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col p-5">
      <h2 className="text-lg font-semibold">Kalkulator HPP</h2>
      <p className="mt-1 text-sm text-muted">Isi bahan, tentukan margin %, lalu simpan modal dan harga jual.</p>

      <div className="mt-4">
        <Field label="Produk racikan">
          <select className={inputClass} value={productId} onChange={(e) => loadProduct(e.target.value)}>
            {products.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} ({row.sku})
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="pb-2 pr-2 font-medium">Bahan</th>
              <th className="pb-2 pr-2 font-medium">Qty</th>
              <th className="pb-2 pr-2 font-medium">Satuan</th>
              <th className="pb-2 pr-2 font-medium">Harga modal</th>
              <th className="pb-2 pr-2 font-medium">Subtotal</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const inv = inventory.find((item) => item.id === line.inventoryItemId);
              const unit = line.draft?.unit ?? inv?.unit ?? "";
              return (
                <tr key={line.key} className="border-t border-line align-top">
                  <td className="py-2 pr-2">
                    {line.draft ? (
                      <p className="text-sm font-medium">
                        {line.draft.name}{" "}
                        <span className="text-xs font-normal text-muted">
                          {line.draft.sku ? `(baru · ${line.draft.sku})` : "(baru)"}
                        </span>
                      </p>
                    ) : (
                      <select
                        className={compactInputClass}
                        aria-label="Bahan"
                        value={line.inventoryItemId}
                        onChange={(e) => onPickIngredient(line.key, e.target.value)}
                      >
                        {inventory.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      className={`${compactInputClass} w-24`}
                      inputMode="decimal"
                      aria-label="Jumlah"
                      value={line.quantity ? formatIdDecimal(line.quantity) : ""}
                      onChange={(e) => patchLine(line.key, { quantity: parseIdNumber(e.target.value) })}
                    />
                  </td>
                  <td className="py-2 pr-2 pt-3 text-muted">{unit}</td>
                  <td className="py-2 pr-2">
                    <MoneyInput
                      key={`${line.key}-cost`}
                      value={line.cost}
                      onValueChange={(n) => patchLine(line.key, { cost: n })}
                      className={compactInputClass}
                    />
                  </td>
                  <td className="whitespace-nowrap py-2 pr-2 pt-3">{money(line.quantity * line.cost)}</td>
                  <td className="py-2">
                    <button type="button" className={dangerActionClass} onClick={() => removeLine(line.key)}>
                      Hapus
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button type="button" className={`${ghostButtonClass} mt-3`} onClick={addInventoryLine}>
        Tambah baris
      </button>

      <div className="mt-5 rounded-xl border border-line p-4">
        <p className="text-sm font-semibold">Bahan baru</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Nama">
            <input className={compactInputClass} value={newItem.name} onChange={(e) => setNewItem((s) => ({ ...s, name: e.target.value }))} />
          </Field>
          <Field label="SKU" hint="Kosongkan untuk otomatis">
            <input className={compactInputClass} value={newItem.sku} onChange={(e) => setNewItem((s) => ({ ...s, sku: e.target.value }))} placeholder="Otomatis" />
          </Field>
          <Field label="Satuan">
            <select className={compactInputClass} value={newItem.unit} onChange={(e) => setNewItem((s) => ({ ...s, unit: e.target.value }))}>
              <option value="pcs">pcs</option>
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="ml">ml</option>
              <option value="liter">liter</option>
            </select>
          </Field>
          <Field label="Harga modal">
            <MoneyInput
              key={`${productId}-new-cost`}
              value={newItem.cost}
              onValueChange={(n) => setNewItem((s) => ({ ...s, cost: n }))}
              className={compactInputClass}
            />
          </Field>
          <Field label="Qty di resep">
            <input
              className={compactInputClass}
              inputMode="decimal"
              value={newItem.quantity ? formatIdDecimal(newItem.quantity) : ""}
              onChange={(e) => setNewItem((s) => ({ ...s, quantity: parseIdNumber(e.target.value) }))}
            />
          </Field>
        </div>
        <button type="button" className={`${ghostButtonClass} mt-3`} onClick={addNewIngredient}>
          Pasang ke resep
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-chip px-4 py-3">
          <p className="text-xs text-muted">HPP</p>
          <p className="mt-1 text-xl font-semibold">{hpp > 0 ? money(hpp) : "Isi bahan dulu"}</p>
        </div>
        <div className="rounded-xl bg-chip px-4 py-3">
          <p className="text-xs text-muted">Margin Rp</p>
          <p className="mt-1 text-xl font-semibold">{hpp > 0 && price > 0 ? money(marginRp) : "—"}</p>
        </div>
        <Field label="Margin %">
          <input
            className={inputClass}
            inputMode="decimal"
            value={marginText}
            onChange={(e) => onMarginChange(e.target.value)}
            onBlur={() => setMarginText(marginPct ? formatIdDecimal(marginPct, 1) : "")}
            aria-label="Margin persen"
          />
        </Field>
        <Field label="Harga jual">
          <MoneyInput key={`${productId}-price`} value={price} onValueChange={onPriceChange} />
        </Field>
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      {saved ? <p className="mt-3 text-sm text-ok">{saved}</p> : null}

      <div className="mt-4">
        <PrimaryButton type="button" disabled={pending || !hpp} onClick={() => void save()}>
          {pending ? "Menyimpan…" : "Simpan HPP"}
        </PrimaryButton>
      </div>
    </Card>
  );
}
