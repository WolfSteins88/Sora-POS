export const RECEIPT_TOGGLES = [
  ["receipt_show_logo", "Logo"],
  ["receipt_show_name", "Nama usaha"],
  ["receipt_show_address", "Alamat"],
  ["receipt_show_number", "Nomor transaksi"],
  ["receipt_show_time", "Waktu"],
  ["receipt_show_cashier", "Kasir"],
  ["receipt_show_items", "Daftar item"],
  ["receipt_show_note", "Catatan"],
  ["receipt_show_total", "Total"],
  ["receipt_show_method", "Metode bayar"],
  ["receipt_show_footer", "Pesan akhir"],
] as const;

export function receiptSectionOn(settings: Record<string, string>, key: string) {
  return settings[key] !== "0";
}
