"use client";

import { RotateCcw } from "lucide-react";
import { cancelTransactionAction } from "@/app/actions/ops";

export function RefundButton({ id }: { id: string }) {
  return (
    <form
      action={cancelTransactionAction}
      className="flex-1"
      onSubmit={(event) => {
        if (!window.confirm("Refund mengembalikan stok dan menandai transaksi sebagai refund. Lanjutkan?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="btn inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line px-3 text-sm"
      >
        <RotateCcw size={16} aria-hidden />
        Refund
      </button>
    </form>
  );
}
