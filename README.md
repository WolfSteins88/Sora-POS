# Sora POS

Sora POS adalah aplikasi kasir untuk **satu toko**: coffee shop (F&B) atau toko ritel. Aplikasi dijalankan di satu PC. Buka Chrome atau Edge ke `http://localhost:3000`. Penjualan tetap berjalan jika internet terputus.

Mode toko: **F&B** atau **Retail**. Nilai lama `mixed` di database dibaca sebagai F&B.

## Teknologi

| Bagian | Teknologi |
| --- | --- |
| UI | Next.js 16 (App Router), React 19, TypeScript |
| Gaya | Tailwind CSS 4, ikon Lucide |
| Data | PostgreSQL, Drizzle ORM, postgres.js |
| Auth | Cookie sesi HMAC, password bcryptjs |
| Validasi | Zod |
| Foto | Unggahan ke disk lokal (opsional driver Supabase) |
| Migrasi | SQL di `supabase/migrations/` |

Skrip setup: `npm run db:setup` (buat database, terapkan migrasi, seed akun dan data demo).

## Peran

| Peran | Akses |
| --- | --- |
| **ADMIN** | Semua menu |
| **MANAGER** | Semua kecuali Pengguna dan Pengaturan |
| **CASHIER** | POS, Transaksi, Shift, Printer (tanpa kalkulator HPP) |

## Fitur

### Dashboard

- Mode F&B: tampilan kaca, KPI harian, shift terbuka, stok menipis.
- Mode retail: omset, kartu metrik, dan ringkasan analitik terpisah dari F&B.

### Kasir (POS)

- Katalog mengikuti mode toko (F&B atau retail).
- Cari produk, saring kategori, tandai unggulan.
- Varian (opsi harga) dan addon.
- F&B: dine-in atau bawa pulang, nomor meja, nama pelanggan. Retail: alur bawa pulang.
- Pajak, service charge, dan diskon.
- Tahan order lalu panggil lagi.
- Pembayaran: tunai, QRIS, debit, kredit, e-wallet.
- Checkout menolak penjualan jika shift belum terbuka.
- Barang: stok SKU produk turun. Racikan: stok bahan BOM turun.
- Opsi izinkan stok negatif di Pengaturan.

### Transaksi

- Riwayat penjualan.
- Detail, cetak struk.
- Batalkan transaksi: stok barang atau bahan kembali.

### Produk dan kategori

- Katalog **terpisah** F&B dan retail.
- SKU otomatis: `FB-` (F&B), `RT-` (retail).
- Jenis produk: barang atau racikan (retail hanya barang).
- Foto, harga, HPP, stok, stok minimum, unggulan, status.
- Kategori per paket katalog, urutan, gambar.

### Inventori dan resep (F&B)

- Bahan baku, SKU otomatis `ING-`, satuan (g, kg, ml, liter, pcs), harga pokok, mutasi stok.
- Stok saat ini dan stok minimum bisa diubah dari form. Angka diketik dengan pemisah ribuan (`1.000`). Perubahan stok tercatat sebagai mutasi penyesuaian.
- Resep (BOM) per racikan; HPP bisa dikunci agar tidak tertimpa hitungan otomatis.
- Menu Resep dan Inventori disembunyikan di mode retail.

### Printer dan HPP

- Pengaturan printer thermal: kertas 58 mm atau 80 mm.
- Koneksi Web Bluetooth atau bridge lokal `127.0.0.1:9100`.
- Mode F&B (bukan kasir): kalkulator HPP CRUD, banyak bahan, margin %, simpan ke produk.

### Shift

- Buka shift (modal awal), tutup shift (kas aktual, selisih, catatan).
- Format rupiah Indonesia: `500.000` = lima ratus ribu.
- **Admin saja:** ubah modal awal dan kas tutup (selisih dihitung ulang), hapus shift kosong. Hapus ditolak jika masih ada transaksi.

### Laporan

Tab: Ringkasan, Penjualan, Produk, Kasir, Pembayaran, Pajak & Biaya, Shift, Stok. Filter tanggal (hari ini, kemarin, minggu ini, bulan ini, rentang kustom), kasir, dan metode bayar.

Penjualan, Produk, Pajak & Biaya, Shift, dan Stok menampilkan 10 baris per halaman (Sebelumnya / Berikutnya). Ganti tab atau filter kembali ke halaman 1. Ekspor tetap mengunduh seluruh periode, bukan hanya halaman yang terbuka.

### Pengguna dan pengaturan

- Pengguna: nama, username, email, peran, status, reset password.
- Identitas toko: nama, logo, alamat, telepon, email, footer struk, mata uang.
- Pajak %, service %, ukuran kertas struk, stok negatif. Persen memakai format angka Indonesia.
- Mode toko F&B / retail (katalog kasir dan menu berubah, data tidak dihapus).
- Warna aksen: Cokelat, Krem, Hijau, Biru, Ungu. Default F&B cokelat, retail biru.
- Cadangan: unduh dump JSON tabel toko, atau unduh contoh demo F&B dan retail.
- Impor JSON menimpa katalog, stok, shift, dan transaksi. Akun login tidak diubah. Impor minta centang konfirmasi.
- Hapus data: pilih grup dengan centang, lalu hapus permanen. Kotak mulai kosong. Pengaturan toko, logo, dan mode tidak ikut. Grup: transaksi (pembayaran, pesanan ditahan, nomor struk), shift, produk (varian dan add-on), kategori, bahan baku (riwayat stok), resep, pengguna lain (akun yang sedang login tetap), printer.
- Hapus ditolak, tanpa menghapus data lain, jika urutannya salah: produk butuh transaksi dan resep kosong dulu, kategori butuh produk kosong dulu, bahan baku butuh resep kosong dulu, shift butuh transaksi kosong dulu, pengguna lain butuh transaksi dan shift kosong dulu.

### Lainnya

- Format angka dan uang Indonesia (titik ribuan, koma desimal).
- Menu desktop pill + drawer hamburger. Keluar akun minta konfirmasi.
- Satu toko, tanpa multi-cabang.
- Contoh data demo dibuat ulang dengan `npm run seed:fnb-json` dan `npm run seed:retail-json` (berkas di `seeds/`). Database yang sudah jalan tidak berubah sampai berkas itu diimpor dari Pengaturan.

## Cara menjalankan

1. PostgreSQL berjalan di Windows.
2. Salin `.env.example` menjadi `.env.local`. Isi `DATABASE_URL` (password superuser PostgreSQL) dan `SESSION_SECRET`.
3. Install, seed, dan jalankan:

```bash
npm install
npm run db:setup
npm run dev
```

4. Buka `http://localhost:3000`.

Akun seed (password `password123`):

| Username | Peran |
| --- | --- |
| `admin` | Admin |
| `manager` | Manajer |
| `cashier` | Kasir |

Variabel lingkungan ada di `.env.example`. Jangan commit `.env.local`.

## Alur uji penjualan

1. Login kasir, buka shift.
2. Jual 1 **barang** (stok SKU turun).
3. Di F&B, jual 1 **racikan** (stok bahan turun).
4. Tahan order, panggil, bayar.
5. Batalkan transaksi (stok kembali).
6. Tutup shift.
7. Cabut internet, jual lagi.

## Lisensi

Proyek privat toko. Semua hak dilindungi kecuali dinyatakan lain.
