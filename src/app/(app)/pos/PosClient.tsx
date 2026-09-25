"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Cake,
  Coffee,
  CupSoda,
  GlassWater,
  LayoutGrid,
  List,
  Minus,
  Pause,
  Plus,
  Search,
  ShoppingBag,
  StickyNote,
  Tag,
  Trash2,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from "lucide-react";
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
  useVariants?: boolean;
  useAddons?: boolean;
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

const WALK_AWAY_CUSTOMER = "in walk away customer";

function lineTotal(line: CartLine) {
  return line.unit * line.quantity;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function ChangeFigure({
  label,
  value,
  currency,
  tone,
}: {
  label: string;
  value: number;
  currency: string;
  tone: "ok" | "warn" | "neutral";
}) {
  const toneClass =
    tone === "ok" ? "bg-ok-soft text-ok" : tone === "warn" ? "bg-warn-soft text-warn" : "border border-line bg-chip text-ink";
  return (
    <div className={`rounded-2xl px-4 py-3 ${toneClass}`} aria-live="polite">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-3xl font-semibold tracking-tight">{money(value, currency)}</p>
    </div>
  );
}

function categoryIcon(name: string): LucideIcon {
  const label = name.toLowerCase();
  if (/(kopi|coffee|latte|espresso)/.test(label)) return Coffee;
  if (/(non-?coffee|teh|tea)/.test(label)) return CupSoda;
  if (/(makanan|food|sandwich)/.test(label)) return UtensilsCrossed;
  if (/(pastry|dessert|kue|roti)/.test(label)) return Cake;
  if (/(botol|minum|drink)/.test(label)) return GlassWater;
  if (/(merch|oleh)/.test(label)) return ShoppingBag;
  return Tag;
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
  const [stockOnly, setStockOnly] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [orderNote, setOrderNote] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [modal, setModal] = useState<CatalogProduct | null>(null);
  const [optionIds, setOptionIds] = useState<Record<string, string>>({});
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [orderType, setOrderType] = useState<"take_away" | "dine_in">(shopMode === "fnb" ? "dine_in" : "take_away");
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerKind, setCustomerKind] = useState<"walk" | "custom">("walk");
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ id: string; transactionNumber: string; total: number; changeAmount: number } | null>(null);
  const receiptTimer = useRef<number | null>(null);

  const showOrderType = shopMode !== "retail";
  const showTable = showOrderType && orderType === "dine_in";
  const showTakeaway = showOrderType && orderType === "take_away";
  const tableRequired = shopMode === "fnb" && orderType === "dine_in";
  const checkoutCustomerName = showTakeaway
    ? customerKind === "walk"
      ? WALK_AWAY_CUSTOMER
      : customerName.trim()
    : customerName;

  const catalogKey = products.map((p) => p.id).join(",");
  useEffect(() => {
    const ids = new Set(catalogKey.split(",").filter(Boolean));
    setCart((prev) => prev.filter((l) => ids.has(l.productId)));
    setCat("all");
    setOrderType(shopMode === "fnb" ? "dine_in" : "take_away");
  }, [shopMode, catalogKey]);

  useEffect(() => {
    if (!receipt) return;
    receiptTimer.current = window.setTimeout(() => setReceipt(null), 3000);
    return () => {
      if (receiptTimer.current != null) {
        window.clearTimeout(receiptTimer.current);
        receiptTimer.current = null;
      }
    };
  }, [receipt]);

  function dismissReceipt() {
    if (receiptTimer.current != null) {
      window.clearTimeout(receiptTimer.current);
      receiptTimer.current = null;
    }
    setReceipt(null);
  }

  const filtered = products.filter((p) => {
    if (stockOnly && p.stockStatus === "sold_out") return false;
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

  function openProduct(p: Product) {
    if (p.kind === "goods" && !p.useVariants && !p.useAddons) {
      addGoods(p);
      return;
    }
    const detail = catalog[p.id];
    if (!detail) {
      if (p.kind === "goods") addGoods(p);
      return;
    }
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
    for (const v of modal.useVariants ? modal.variants : []) {
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
    const addonExtra = (modal.useAddons ? modal.addons : []).filter((a) => addonIds.includes(a.id));
    extra += addonExtra.reduce((s, a) => s + num(a.price), 0);
    if (addonExtra.length) labels.push(addonExtra.map((a) => a.name).join(", "));
    setCart((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        productId: modal.id,
        name: modal.name,
        kind: modal.kind,
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
        customerName: checkoutCustomerName,
        discount: disc,
        note: orderNote.trim() || undefined,
        payment: { method, amount: method === "cash" ? amount || total : total },
      });
      setReceipt(result);
      setCart([]);
      setAmount(0);
      setDiscount(0);
      setOrderNote("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Checkout gagal");
    } finally {
      setBusy(false);
    }
  }

  async function hold() {
    const label = checkoutCustomerName || `Hold ${new Date().toLocaleTimeString("id-ID")}`;
    await holdOrderAction(label, cart);
    setCart([]);
  }

  function newOrder() {
    setCart([]);
    setDiscount(0);
    setOrderNote("");
    setTableNumber("");
    setCustomerName("");
    setCustomerKind("walk");
    setAmount(0);
    setMessage(null);
    setReceipt(null);
  }

  const heldCarts = useMemo(() => held, [held]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kasir</h1>
          <p className="mt-1 text-sm text-muted">Pilih produk untuk menambah ke keranjang.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative w-full max-w-xs">
            <span className="sr-only">Cari produk</span>
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari produk..."
              className={`${inputClass} pl-9`}
            />
          </label>
          <button
            type="button"
            aria-pressed={stockOnly}
            onClick={() => setStockOnly((value) => !value)}
            className={`btn inline-flex items-center gap-2 rounded-full border px-3 text-sm ${stockOnly ? "border-ok/30 bg-ok-soft text-ok" : "border-line bg-surface"}`}
          >
            <span className={`size-2 rounded-full ${stockOnly ? "bg-ok" : "bg-muted"}`} aria-hidden />
            Stok tersedia
          </button>
          <div className="inline-flex rounded-full border border-line bg-surface p-1">
            <button
              type="button"
              aria-label="Tampilan grid"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
              className={`inline-flex size-9 items-center justify-center rounded-full ${view === "grid" ? "bg-accent text-white" : "text-ink"}`}
            >
              <LayoutGrid size={16} aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Tampilan daftar"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={`inline-flex size-9 items-center justify-center rounded-full ${view === "list" ? "bg-accent text-white" : "text-ink"}`}
            >
              <List size={16} aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {!shiftOpen ? (
        <p className="mb-3 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          Shift belum dibuka. Buka shift dulu sebelum bayar.
        </p>
      ) : null}
      {message ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{message}</p> : null}
      {receipt ? (
        <div
          role="status"
          className="fixed top-4 right-4 z-[140] w-[min(100%-2rem,22rem)] rounded-2xl bg-ok-soft px-4 py-3 text-ok shadow-card"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Kembalian</p>
              <p className="text-3xl font-semibold tracking-tight">{money(receipt.changeAmount, currency)}</p>
            </div>
            <button
              type="button"
              aria-label="Tutup pemberitahuan"
              onClick={dismissReceipt}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
          <p className="mt-2 text-sm">
            Transaksi {receipt.transactionNumber} berhasil.{" "}
            <a className="underline" href={`/transactions/${receipt.id}`}>
              Lihat struk
            </a>
          </p>
        </div>
      ) : null}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div>
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCat("all")}
            className={`btn inline-flex shrink-0 items-center gap-2 rounded-full px-3 text-sm ${cat === "all" ? "bg-accent text-white" : "border border-line bg-surface"}`}
          >
            Semua
          </button>
          {categories.map((c) => {
            const Icon = categoryIcon(c.name);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                className={`btn inline-flex shrink-0 items-center gap-2 rounded-full px-3 text-sm ${cat === c.id ? "bg-accent text-white" : "border border-line bg-surface"}`}
              >
                <Icon size={16} aria-hidden />
                {c.name}
              </button>
            );
          })}
        </div>
        {filtered.length === 0 ? (
          <EmptyState title="Tidak ada produk" description="Ubah pencarian atau ganti mode toko di Pengaturan." />
        ) : (
          <div className={view === "grid" ? "grid grid-cols-2 gap-3 md:grid-cols-3" : "flex flex-col gap-2"}>
            {filtered.map((p) => {
              const sold = p.stockStatus === "sold_out";
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={sold}
                  aria-label={`Tambah ${p.name}`}
                  onClick={() => openProduct(p)}
                  className={`pressable overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-card disabled:opacity-40 ${
                    view === "list" ? "flex items-center gap-3 p-2" : "flex h-full flex-col"
                  }`}
                >
                  <div className={`relative overflow-hidden bg-accent-soft ${view === "list" ? "size-16 shrink-0 rounded-xl" : "aspect-[4/3]"}`}>
                    <ProductImage
                      kind="products"
                      filename={p.image}
                      name={p.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    {p.isFeatured ? (
                      <span className="absolute top-2 right-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-white">
                        Unggulan
                      </span>
                    ) : null}
                  </div>
                  <div className={view === "list" ? "min-w-0" : "p-3"}>
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-sm text-muted">{money(p.price, currency)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <aside className="rounded-2xl border border-line bg-surface p-4 shadow-card xl:sticky xl:top-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Pesanan</h2>
          <button type="button" onClick={newOrder} className="text-sm text-accent">
            Pesanan baru
          </button>
        </div>

        {showOrderType ? (
          <div className="mt-3 grid grid-cols-2 rounded-full bg-chip p-1" role="group" aria-label="Tipe pesanan">
            <button
              type="button"
              aria-pressed={orderType === "dine_in"}
              onClick={() => setOrderType("dine_in")}
              className={`min-h-11 rounded-full text-sm font-medium ${orderType === "dine_in" ? "bg-accent text-white" : "text-ink"}`}
            >
              Makan di tempat
            </button>
            <button
              type="button"
              aria-pressed={orderType === "take_away"}
              onClick={() => {
                setOrderType("take_away");
                setCustomerKind("walk");
              }}
              className={`min-h-11 rounded-full text-sm font-medium ${orderType === "take_away" ? "bg-accent text-white" : "text-ink"}`}
            >
              Bawa pulang
            </button>
          </div>
        ) : null}

        {showTable ? (
          <input
            className={`${inputClass} mt-3`}
            placeholder={tableRequired ? "Nomor meja wajib" : "Nomor meja"}
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            aria-label="Nomor meja"
          />
        ) : showTakeaway ? (
          <div className="mt-3 space-y-2">
            <label className="block text-sm">
              <span className="sr-only">Nama pelanggan</span>
              <select
                className={inputClass}
                value={customerKind}
                onChange={(event) => setCustomerKind(event.target.value as "walk" | "custom")}
              >
                <option value="walk">{WALK_AWAY_CUSTOMER}</option>
                <option value="custom">Kustom</option>
              </select>
            </label>
            {customerKind === "custom" ? (
              <input
                className={inputClass}
                placeholder="Nama pelanggan"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                aria-label="Nama pelanggan"
              />
            ) : null}
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

        <ul className="mt-3 max-h-72 space-y-0 overflow-auto">
          {cart.length === 0 ? <li className="py-6 text-center text-sm text-muted">Keranjang kosong</li> : null}
          {cart.map((line) => (
            <li key={line.key} className="flex gap-3 border-t border-line py-3">
              <ProductImage
                kind="products"
                filename={products.find((item) => item.id === line.productId)?.image}
                name={line.name}
                className="size-12 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{line.name}</p>
                    {line.optionLabel ? <p className="truncate text-xs text-muted">{line.optionLabel}</p> : null}
                  </div>
                  <button
                    type="button"
                    aria-label={`Hapus ${line.name}`}
                    className="text-muted hover:text-danger"
                    onClick={() => setCart((current) => current.filter((item) => item.key !== line.key))}
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="inline-flex items-center rounded-full border border-line">
                    <button
                      type="button"
                      className="inline-flex size-9 items-center justify-center"
                      aria-label="Kurangi"
                      onClick={() =>
                        setCart((current) =>
                          current.map((item) =>
                            item.key === line.key ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item,
                          ),
                        )
                      }
                    >
                      <Minus size={14} aria-hidden />
                    </button>
                    <span className="w-6 text-center text-sm">{line.quantity}</span>
                    <button
                      type="button"
                      className="inline-flex size-9 items-center justify-center"
                      aria-label="Tambah"
                      onClick={() =>
                        setCart((current) =>
                          current.map((item) => (item.key === line.key ? { ...item, quantity: item.quantity + 1 } : item)),
                        )
                      }
                    >
                      <Plus size={14} aria-hidden />
                    </button>
                  </div>
                  <span className="text-sm font-medium">{money(lineTotal(line), currency)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium">Diskon</span>
          <MoneyInput value={discount} onValueChange={setDiscount} />
        </label>
        <label className="mt-3 block text-sm">
          <span className="mb-1 flex items-center gap-2 font-medium">
            <StickyNote size={16} aria-hidden />
            Catatan
          </span>
          <input
            className={inputClass}
            placeholder="Tambah catatan..."
            value={orderNote}
            onChange={(event) => setOrderNote(event.target.value)}
          />
        </label>
        <div className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Subtotal</span>
            <span>{money(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Pajak{taxPercent ? ` (${taxPercent}%)` : ""}</span>
            <span>{money(tax, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Service{servicePercent ? ` (${servicePercent}%)` : ""}</span>
            <span>{money(service, currency)}</span>
          </div>
          <div className="flex justify-between pt-1 text-base font-semibold">
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
          <div className="mt-2 space-y-2">
            <MoneyInput placeholder="Uang diterima" value={amount} onValueChange={setAmount} />
            {amount <= 0 ? (
              <ChangeFigure label="Kembalian" value={0} currency={currency} tone="neutral" />
            ) : roundMoney(amount - total) < 0 ? (
              <ChangeFigure label="Kurang" value={Math.abs(roundMoney(amount - total))} currency={currency} tone="warn" />
            ) : (
              <ChangeFigure label="Kembalian" value={roundMoney(amount - total)} currency={currency} tone="ok" />
            )}
          </div>
        ) : null}
        <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-2">
          <button
            type="button"
            className="btn inline-flex items-center gap-2 rounded-xl border border-line px-3 text-sm disabled:opacity-50"
            onClick={hold}
            disabled={!cart.length}
          >
            <Pause size={16} aria-hidden />
            Tahan pesanan
          </button>
          <button
            type="button"
            onClick={pay}
            disabled={!cart.length || !shiftOpen || busy}
            className="btn inline-flex items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            Proses pembayaran
          </button>
        </div>
        {heldCarts.length ? (
          <div className="mt-4 border-t border-line pt-3">
            <p className="text-sm font-medium">Order tertahan</p>
            {heldCarts.map((h) => (
              <div key={h.id} className="mt-2 flex items-center justify-between gap-2 text-sm">
                <button
                  type="button"
                  className="min-w-0 truncate text-left underline"
                  onClick={() => {
                    setCart(h.cartJson as CartLine[]);
                    void deleteHeldAction(h.id);
                  }}
                >
                  {h.label}
                </button>
                <button type="button" className="shrink-0 text-danger" onClick={() => void deleteHeldAction(h.id)}>
                  Hapus
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </aside>
      </div>

      {modal && shopMode !== "retail" ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-card bg-surface p-4 shadow-card">
            <h3 className="text-lg font-semibold">{modal.name}</h3>
            {(modal.useVariants ? modal.variants : []).map((v) => (
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
            {modal.useAddons && modal.addons.length ? (
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
