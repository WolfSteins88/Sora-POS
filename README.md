# UMKM POS (Next.js + PostgreSQL)

Aplikasi kasir 1 toko, dijalankan di **satu PC**. Buka Chrome/Edge ke `http://localhost:3000`. Internet putus tidak menghentikan penjualan.

Folder PHP `POS-Coffeshop-main` tetap referensi domain, tidak diubah.

## Persiapan

1. PostgreSQL 18 sudah berjalan di Windows.
2. Salin `.env.example` ke `.env.local` lalu isi `DATABASE_URL` dengan password superuser PostgreSQL (bukan default `postgres` jika Anda memilih password lain saat instal), serta `SESSION_SECRET`.
3. Install dan seed:

```bash
cd umkm-pos
npm install
npm run db:setup
npm run dev
```

Akun seed: `admin` / `manager` / `cashier` — password `password123`.

## Alur go-live

1. Login kasir, buka shift.
2. Jual 1 **Barang** (stok SKU produk turun).
3. Jual 1 **Racikan** (stok bahan BOM turun).
4. Tahan order, panggil lagi, bayar.
5. Batalkan transaksi (stok kembali sesuai jenis).
6. Tutup shift.
7. Cabut internet, jual lagi.

## Mode toko

Pengaturan `shop_mode`: `mixed` (default), `fnb`, `retail`. Di retail, pilihan dine-in disembunyikan.

## Cadangan

Admin unduh JSON dari Pengaturan. Replica cloud Supabase adalah Phase 2.
