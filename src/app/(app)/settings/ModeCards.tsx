"use client";

import { Check, ShoppingBag, ShoppingCart } from "lucide-react";

const MODES = [
  {
    value: "fnb",
    title: "F&B",
    icon: ShoppingBag,
    text: "Kelola menu, resep, dan layanan makanan dan minuman dengan lengkap.",
  },
  {
    value: "retail",
    title: "Retail",
    icon: ShoppingCart,
    text: "Kelola produk tanpa resep dengan fitur inventori standar.",
  },
] as const;

export function ModeCards({ current }: { current: string }) {
  return (
    <div className="mt-4 grid items-stretch gap-3 sm:grid-cols-2">
      {MODES.map((mode) => {
        const Icon = mode.icon;
        return (
          <label
            key={mode.value}
            className="group relative flex h-full min-h-36 cursor-pointer flex-col rounded-2xl border border-line p-4 pr-8 has-[:checked]:border-accent has-[:checked]:bg-accent-soft/40"
          >
            <input type="radio" name="shop_mode" value={mode.value} defaultChecked={current === mode.value} className="sr-only" />
            <span className="absolute right-3 top-3 hidden size-5 items-center justify-center rounded-full bg-accent text-white group-has-[:checked]:inline-flex">
              <Check size={12} aria-hidden />
            </span>
            <Icon size={20} className="text-accent" aria-hidden />
            <span className="mt-3 font-semibold">{mode.title}</span>
            <span className="mt-1 text-xs leading-5 text-muted">{mode.text}</span>
          </label>
        );
      })}
    </div>
  );
}
