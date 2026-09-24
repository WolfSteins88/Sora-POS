"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
import { purgeShopData } from "@/app/actions/ops";
import { ghostButtonClass } from "@/components/ui";

const CHOICES = [
  ["transactions", "Transaksi, pembayaran, pesanan ditahan, dan nomor struk"],
  ["shifts", "Shift"],
  ["products", "Produk, varian, dan add-on"],
  ["categories", "Kategori"],
  ["inventory", "Bahan baku dan riwayat stok"],
  ["recipes", "Resep"],
  ["users", "Pengguna lain (akun yang sedang login tetap)"],
  ["printers", "Printer"],
] as const;

export function DeleteDataButton() {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  function close() {
    setOpen(false);
    setPicked([]);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn pressable mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-danger px-4 text-sm font-medium text-danger"
      >
        <Trash2 size={16} aria-hidden />
        Hapus data
      </button>
      {open
        ? createPortal(
        <div className="dialog-overlay fixed inset-0 z-[1400] flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-labelledby="purge-title">
          <form action={purgeShopData} className="dialog-pop w-full max-w-md rounded-2xl bg-white p-5 shadow-card">
            <h2 id="purge-title" className="text-base font-semibold">
              Hapus data
            </h2>
            <p className="mt-1 text-sm text-muted">Centang data yang akan dihapus permanen. Pengaturan toko tidak ikut.</p>
            <fieldset className="mt-4 space-y-2">
              <legend className="sr-only">Data yang dihapus</legend>
              {CHOICES.map(([key, label]) => (
                <label key={key} className="flex min-h-11 items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name={key}
                    value="on"
                    checked={picked.includes(key)}
                    onChange={(event) => {
                      setPicked((current) =>
                        event.target.checked ? [...current, key] : current.filter((item) => item !== key),
                      );
                    }}
                    className="mt-0.5 size-4 shrink-0"
                  />
                  <span className="leading-5">{label}</span>
                </label>
              ))}
            </fieldset>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" className={`${ghostButtonClass} h-11 w-full`} onClick={close}>
                Batal
              </button>
              <button
                type="submit"
                disabled={picked.length === 0}
                className="btn inline-flex h-11 w-full items-center justify-center rounded-xl bg-danger px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                Hapus
              </button>
            </div>
          </form>
        </div>,
        document.body,
      )
        : null}
    </>
  );
}
