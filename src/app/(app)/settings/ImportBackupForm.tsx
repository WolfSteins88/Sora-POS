"use client";

import { useState } from "react";
import { PrimaryButton, ghostButtonClass } from "@/components/ui";

export function ImportBackupForm({ formId = "import-backup" }: { formId?: string }) {
  const [fileName, setFileName] = useState("");

  return (
    <div className="mt-4 min-w-0 space-y-3">
      <div className="flex h-11 items-center gap-3">
        <label className={`${ghostButtonClass} h-11 shrink-0 cursor-pointer`}>
          Pilih file
          <input
            form={formId}
            name="file"
            type="file"
            accept="application/json,.json"
            required
            className="sr-only"
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
          />
        </label>
        <span className="min-w-0 flex-1 truncate text-sm text-muted">{fileName || "Tidak ada file yang dipilih"}</span>
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input form={formId} type="checkbox" name="confirm" value="1" required className="size-4 shrink-0" />
        <span className="min-w-0 leading-5">
          Saya paham bahwa data yang diimpor akan menimpa katalog, stok, shift, dan transaksi. Akun login tidak diubah.
        </span>
      </label>
      <PrimaryButton type="submit" form={formId} className="h-11 w-full">
        Impor JSON
      </PrimaryButton>
    </div>
  );
}
