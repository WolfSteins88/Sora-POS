"use client";

import { importBackup } from "@/app/actions/ops";
import { PrimaryButton } from "@/components/ui";

export function ImportBackupForm() {
  return (
    <form action={importBackup} className="mt-4 min-w-0 space-y-3">
      <input
        name="file"
        type="file"
        accept="application/json,.json"
        required
        className="block w-full min-w-0 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-2 file:text-sm file:font-medium file:text-accent"
      />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="confirm" value="1" required className="mt-1 size-4 shrink-0" />
        <span className="min-w-0 leading-5">Saya paham katalog, stok, shift, dan transaksi akan diganti. Akun login tidak diubah.</span>
      </label>
      <PrimaryButton type="submit">Impor JSON</PrimaryButton>
    </form>
  );
}
