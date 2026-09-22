"use client";

import { Coffee, ShoppingBag } from "lucide-react";

const MODES = [
  {
    value: "fnb",
    title: "F&B",
    icon: Coffee,
    text: "Katalog coffee shop, dine-in/bawa pulang, default dine-in, meja wajib. Resep dan inventori bahan tampil.",
  },
  {
    value: "retail",
    title: "Retail",
    icon: ShoppingBag,
    text: "Katalog sembako, tap Barang tanpa modal racikan. Meja disembunyikan. Resep dan inventori bahan disembunyikan.",
  },
] as const;

export function ModeCards({ current }: { current: string }) {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {MODES.map((mode) => {
        const Icon = mode.icon;
        return (
          <label
            key={mode.value}
            className="flex min-h-[160px] cursor-pointer flex-col rounded-card border border-line p-4 has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
          >
            <input type="radio" name="shop_mode" value={mode.value} defaultChecked={current === mode.value} className="sr-only" />
            <Icon size={20} className="text-accent" aria-hidden />
            <span className="mt-2 font-semibold">{mode.title}</span>
            <span className="mt-1 text-xs text-muted">{mode.text}</span>
          </label>
        );
      })}
    </div>
  );
}
