"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { checkoutAction, deleteHeldAction, holdOrderAction } from "@/app/actions/ops";
import { money, num } from "@/lib/format";
import { EmptyState, PrimaryButton, inputClass } from "@/components/ui";
import { MoneyInput } from "@/components/MoneyInput";
import { ProductImage } from "@/components/ProductImage";

type Product = {
  id: string;
  name: string;
  sku: string;
  kind: "goods" | "recipe";
  price: string;
  stockStatus: "available" | "sold_out";
  currentStock: string;
  categoryId: string;
  image?: string | null;
  isFeatured?: boolean;
};

type Variant = {
  id: string;
  name: string;
  isRequired: boolean;
  options: { id: string; name: string; priceAdjustment: string; isDefault: boolean }[];
};

type CatalogProduct = Product & {
  variants: Variant[];
  addons: { id: string; name: string; price: string }[];
};

type CartLine = {
  key: string;
  productId: string;
  name: string;
  kind: "goods" | "recipe";
  quantity: number;
  optionIds: string[];
  addonIds: string[];
  optionLabel: string;
  unit: number;
  note: string;
};

type Held = { id: string; label: string; cartJson: unknown };

function lineTotal(line: CartLine) {
  return line.unit * line.quantity;
}

export function PosClient({
  shopMode,
  taxPercent,
  servicePercent,
  currency,
  categories,
  products,
  catalog,
  held,
  shiftOpen,
}: {
  shopMode: string;
  taxPercent: number;
  servicePercent: number;
  currency: string;
  categories: { id: string; name: string }[];
  products: Product[];
  catalog: Record<string, CatalogProduct>;
  held: Held[];
  shiftOpen: boolean;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [modal, setModal] = useState<CatalogProduct | null>(null);
  const [optionIds, setOptionIds] = useState<Record<string, string>>({});
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [orderType, setOrderType] = useState<"take_away" | "dine_in">(shopMode === "fnb" ? "dine_in" : "take_away");
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ id: string; transactionNumber: string; total: number; changeAmount: number } | null>(null);

  const showOrderType = shopMode !== "retail";
  const showTable = showOrderType && orderType === "dine_in";
  const tableRequired = shopMode === "fnb" && orderType === "dine_in";

  const catalogKey = products.map((p) => p.id).join(",");
  useEffect(() => {
    const ids = new Set(catalogKey.split(",").filter(Boolean));
    setCart((prev) => prev.filter((l) => ids.has(l.productId)));
    setCat("all");
    setOrderType(shopMode === "fnb" ? "dine_in" : "take_away");
  }, [shopMode, catalogKey]);

  const filtered = products.filter((p) => {
    if (cat !== "all" && p.categoryId !== cat) return false;
    if (q && !`${p.name} ${p.sku}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const subtotal = cart.reduce((s, l) => s + lineTotal(l), 0);
  const disc = Math.min(discount, subtotal);
  const taxable = subtotal - disc;
  const tax = Math.round((taxable * taxPercent) / 100 * 100) / 100;
  const service = Math.round((taxable * servicePercent) / 100 * 100) / 100;
  const total = taxable + tax + service;

  function addGoods(p: Product) {
    if (p.stockStatus === "sold_out") return;
    setCart((prev) => {
      const found = prev.find((l) => l.productId === p.id && l.kind === "goods");
      if (found) {
        return prev.map((l) => (l.key === found.key ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          key: crypto.randomUUID(),
          productId: p.id,
          name: p.name,
          kind: "goods",
          quantity: 1,
          optionIds: [],
          addonIds: [],
          optionLabel: "",
          unit: num(p.price),
          note: "",
        },
      ];
    });
  }

  function openRecipe(p: Product) {
    const detail = catalog[p.id];
    if (!detail) return;
    const defaults: Record<string, string> = {};
    for (const v of detail.variants) {
      const def = v.options.find((o) => o.isDefault) ?? v.options[0];
      if (def) defaults[v.id] = def.id;
    }
    setOptionIds(defaults);
    setAddonIds([]);
    setNote("");
    setModal(detail);
  }

  function confirmRecipe() {
    if (!modal) return;
    let extra = 0;
    const labels: string[] = [];
    const selected: string[] = [];
    for (const v of modal.variants) {
      const oid = optionIds[v.id];
      if (v.isRequired && !oid) {
        setMessage(`Pilih ${v.name}`);
        return;
      }
      const opt = v.options.find((o) => o.id === oid);
      if (opt) {
        extra += num(opt.priceAdjustment);
        labels.push(`${v.name}: ${opt.name}`);
        selected.push(opt.id);
      }
    }
    const addonExtra = modal.addons.filter((a) => addonIds.includes(a.id));
    extra += addonExtra.reduce((s, a) => s + num(a.price), 0);
    if (addonExtra.length) labels.push(addonExtra.map((a) => a.name).join(", "));
    setCart((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        productId: modal.id,
        name: modal.name,
        kind: "recipe",
        quantity: 1,
        optionIds: selected,
        addonIds: addonExtra.map((a) => a.id),
        optionLabel: labels.join(" · "),
        unit: num(modal.price) + extra,
        note,
      },
    ]);
    setModal(null);
  }

  async function pay() {
    if (tableRequired && !tableNumber.trim()) {
      setMessage("Nomor meja wajib untuk dine-in.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const result = await checkoutAction({
        items: cart.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          optionIds: l.optionIds,
          addonIds: l.addonIds,
          note: l.note,
        })),
        orderType: showOrderType ? orderType : "take_away",
        tableNumber: showTable ? tableNumber : undefined,
        customerName,
        discount: disc,
        payment: { method, amount: method === "cash" ? amount || total : total },
      });
      setReceipt(result);
      setCart([]);
      setAmount(0);
      setDiscount(0);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Checkout gagal");
    } finally {
      setBusy(false);
    }
  }

  async function hold() {
    const label = customerName || `Hold ${new Date().toLocaleTimeString("id-ID")}`;
    await holdOrderAction(label, cart);
    setCart([]);
  }

  const heldCarts = useMemo(() => held, [held]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div>
        {!shiftOpen ? (
          <p className="mb-3 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
            Shift belum dibuka. Buka shift dulu sebelum bayar.
          </p>
        ) : null}
        {message ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{message}</p> : null}
        {receipt ? (
          <p className="mb-3 rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok">
            Transaksi {receipt.transactionNumber} berhasil. Kembalian {money(receipt.changeAmount, currency)}.{" "}
            <a className="underline" href={`/transactions/${receipt.id}`}>
              Lihat struk
            </a>
          </p>
        ) : null}
        <div className="mb-3 flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari produk"
            className={`${inputClass} max-w-xs`}
            aria-label="Cari produk"
          />
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCat("all")}
            className={`btn rounded-full px-3 text-sm transition-all duration-200 hover:shadow-md active:scale-95 ${cat === "all" ? "bg-accent text-white" : "border border-line bg-surface"}`}
          >
            Semua
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              className={`btn rounded-full px-3 text-sm transition-all duration-200 hover:shadow-md active:scale-95 ${cat === c.id ? "bg-accent text-white" : "border border-line bg-surface"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <EmptyState title="Tidak ada produk" description="Ubah pencarian atau ganti mode toko di Pengaturan." />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
            {filtered.map((p) => {
              const sold = p.stockStatus === "sold_out";
              return (
                <article
                  key={p.id}
                  className={`flex h-full flex-col rounded-2xl border border-line bg-surface p-4 shadow-card md:p-5 ${sold ? "opacity-40" : ""}`}
                >
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-accent-soft">
                    <ProductImage
                      kind="products"
                      filename={p.image}
                      name={p.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                  <p className="mt-3 line-clamp-2 min-h-11 text-sm font-semibold">{p.name}</p>
                  <div className="mt-auto flex flex-col justify-end gap-2 pt-3">
                    <span className="text-sm font-semibold text-accent">{money(p.price, currency)}</span>
                    <button
                      type="button"
                      disabled={sold}
                      onClick={() => (p.kind === "goods" ? addGoods(p) : openRecipe(p))}
                      className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-xl bg-accent px-3 text-xs font-semibold text-white transition-all duration-200 hover:shadow-md active:scale-95 disabled:opacity-50"
                    >
                      <Plus size={14} aria-hidden />
                      Tambah
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <aside className="rounded-card border border-line bg-surface p-4 shadow-card">
        <h2 className="font-semibold">Keranjang</h2>
        <ul className="mt-3 max-h-64 space-y-2 overflow-auto text-sm">
          {cart.length === 0 ? <li className="text-muted">Kosong</li> : null}
          {cart.map((l) => (
            <li key={l.key} className="rounded-lg border border-line p-2">
              <div className="flex justify-between gap-2">
                <span className="font-medium">{l.name}</span>
                <button type="button" className="text-danger" onClick={() => setCart((c) => c.filter((x) => x.key !== l.key))}>
                  Hapus
                </button>
              </div>
              {l.optionLabel ? <p className="text-xs text-muted">{l.optionLabel}</p> : null}
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  className="btn h-9 w-9 rounded border border-line"
                  aria-label="Kurangi"
                  onClick={() =>
                    setCart((c) =>
                      c.map((x) => (x.key === l.key ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x)),
                    )
                  }
                >
                  -
                </button>
                <span>{l.quantity}</span>
                <button
                  type="button"
                  className="btn h-9 w-9 rounded border border-line"
                  aria-label="Tambah"
                  onClick={() => setCart((c) => c.map((x) => (x.key === l.key ? { ...x, quantity: x.quantity + 1 } : x)))}
                >
                  +
                </button>
                <span className="ml-auto">{money(lineTotal(l), currency)}</span>
              </div>
            </li>
          ))}
        </ul>

        {showOrderType ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <select
              className={inputClass}
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as "take_away" | "dine_in")}
              aria-label="Tipe pesanan"
            >
              <option value="take_away">Bawa pulang</option>
              <option value="dine_in">Makan di tempat</option>
            </select>
            {showTable ? (
              <input
                className={inputClass}
                placeholder={tableRequired ? "Nomor meja wajib" : "Nomor meja"}
                required={tableRequired}
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                aria-label="Nomor meja"
              />
            ) : (
              <input
                className={inputClass}
                placeholder="Nama pelanggan"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                aria-label="Nama pelanggan"
              />
            )}
          </div>
        ) : (
          <input
            className={`${inputClass} mt-3`}
            placeholder="Nama pelanggan"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            aria-label="Nama pelanggan"
          />
        )}

        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium">Diskon</span>
          <MoneyInput value={discount} onValueChange={setDiscount} />
        </label>
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{money(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span>Pajak</span>
            <span>{money(tax, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span>Service</span>
            <span>{money(service, currency)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{money(total, currency)}</span>
          </div>
        </div>
        <select className={`${inputClass} mt-3`} value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Metode bayar">
          <option value="cash">Tunai</option>
          <option value="qris">QRIS</option>
          <option value="debit">Debit</option>
          <option value="credit">Kredit</option>
          <option value="ewallet">E-wallet</option>
        </select>
        {method === "cash" ? (
          <div className="mt-2">
            <MoneyInput placeholder="Uang diterima" value={amount} onValueChange={setAmount} />
          </div>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className="btn rounded-lg border border-line text-sm" onClick={hold} disabled={!cart.length}>
            Tahan
          </button>
          <button
            type="button"
            onClick={pay}
            disabled={!cart.length || !shiftOpen || busy}
            className="btn inline-flex items-center justify-center rounded-lg bg-cta px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            Bayar
          </button>
        </div>
        {heldCarts.length ? (
          <div className="mt-4">
            <p className="text-sm font-medium">Order tertahan</p>
            {heldCarts.map((h) => (
              <div key={h.id} className="mt-2 flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    setCart(h.cartJson as CartLine[]);
                    void deleteHeldAction(h.id);
                  }}
                >
                  {h.label}
                </button>
                <button type="button" onClick={() => void deleteHeldAction(h.id)}>
                  Hapus
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </aside>

      {modal && shopMode !== "retail" ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-card bg-surface p-4 shadow-card">
            <h3 className="text-lg font-semibold">{modal.name}</h3>
            {modal.variants.map((v) => (
              <fieldset key={v.id} className="mt-3">
                <legend className="text-sm font-medium">{v.name}</legend>
                <div className="mt-1 flex flex-wrap gap-2">
                  {v.options.map((o) => (
                    <button
                      type="button"
                      key={o.id}
                      onClick={() => setOptionIds((s) => ({ ...s, [v.id]: o.id }))}
                      className={`min-h-11 rounded-lg border px-3 py-2 text-sm ${
                        optionIds[v.id] === o.id ? "border-accent bg-accent-soft" : "border-line"
                      }`}
                    >
                      {o.name}
                      {num(o.priceAdjustment) ? ` +${money(num(o.priceAdjustment), currency)}` : ""}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
            {modal.addons.length ? (
              <fieldset className="mt-3">
                <legend className="text-sm font-medium">Add-on</legend>
                {modal.addons.map((a) => (
                  <label key={a.id} className="mt-1 flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={addonIds.includes(a.id)}
                      onChange={(e) =>
                        setAddonIds((ids) =>
                          e.target.checked ? [...ids, a.id] : ids.filter((id) => id !== a.id),
                        )
                      }
                    />
                    {a.name} ({money(num(a.price), currency)})
                  </label>
                ))}
              </fieldset>
            ) : null}
            <input
              className={`${inputClass} mt-3`}
              placeholder="Catatan"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn rounded-lg border border-line px-4" onClick={() => setModal(null)}>
                Batal
              </button>
              <PrimaryButton type="button" onClick={confirmRecipe}>
                Tambah
              </PrimaryButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
