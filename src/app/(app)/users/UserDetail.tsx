"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ImagePlus, Trash2, X } from "lucide-react";
import { deleteUser, saveUser } from "@/app/actions/ops";
import { ProductImage } from "@/components/ProductImage";
import { inputClass, PrimaryButton } from "@/components/ui";
import { can, type ModuleKey, type Role } from "@/lib/rbac";

const ACCESS: { module: ModuleKey; label: string }[] = [
  { module: "dashboard", label: "Dashboard" },
  { module: "pos", label: "POS" },
  { module: "transactions", label: "Transaksi" },
  { module: "products", label: "Produk" },
  { module: "shifts", label: "Shift" },
  { module: "reports", label: "Laporan" },
  { module: "users", label: "Pengguna" },
  { module: "settings", label: "Pengaturan" },
];

const ROLE_LABEL = { ADMIN: "Admin", MANAGER: "Manajer", CASHIER: "Kasir" } as const;

export function UserDetail({
  user,
  cancelHref,
}: {
  user: {
    id: string;
    name: string;
    username: string;
    email: string | null;
    phone: string | null;
    role: Role;
    active: boolean;
    image: string | null;
  } | null;
  cancelHref: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "CASHIER");
  const [active, setActive] = useState(user?.active !== false);
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{user ? "Detail Pengguna" : "Tambah Pengguna"}</h2>
        <Link href={cancelHref} aria-label="Tutup detail" className="inline-flex size-8 items-center justify-center rounded-full hover:bg-chip">
          <X size={16} />
        </Link>
      </div>
      <form action={saveUser} className="mt-4 space-y-4">
        {user ? <input type="hidden" name="id" value={user.id} /> : null}
        <input type="hidden" name="isActive" value={active ? "1" : "0"} />
        <div className="flex items-center gap-3">
          {preview ? (
            <img src={preview} alt="" className="size-16 shrink-0 rounded-full object-cover" />
          ) : (
            <ProductImage kind="users" filename={user?.image} name={name || "Pengguna"} className="size-16 shrink-0 rounded-full object-cover text-lg" />
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold">{name || "Nama pengguna"}</p>
            <span className="mt-1 inline-flex h-6 items-center rounded-full bg-white px-2.5 text-xs font-semibold ring-1 ring-line">{ROLE_LABEL[role]}</span>
          </div>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()} className="btn inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-line text-sm font-medium">
          <ImagePlus size={15} aria-hidden />
          Ubah Foto
        </button>
        <input
          ref={inputRef}
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => setPreview(event.target.files?.[0] ? URL.createObjectURL(event.target.files[0]) : null)}
        />
        <label className="block text-sm">
          <span className="font-medium">Nama Lengkap</span>
          <input name="name" required value={name} onChange={(event) => setName(event.target.value)} className={`${inputClass} mt-1.5`} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Username</span>
          <input name="username" required defaultValue={user?.username ?? ""} className={`${inputClass} mt-1.5`} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Email</span>
          <input name="email" type="email" defaultValue={user?.email ?? ""} className={`${inputClass} mt-1.5`} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Nomor Telepon</span>
          <input name="phone" defaultValue={user?.phone ?? ""} className={`${inputClass} mt-1.5`} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Peran</span>
          <select name="role" value={role} onChange={(event) => setRole(event.target.value as Role)} className={`${inputClass} mt-1.5`}>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manajer</option>
            <option value="CASHIER">Kasir</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Status</span>
          <select value={active ? "1" : "0"} onChange={(event) => setActive(event.target.value === "1")} className={`${inputClass} mt-1.5`}>
            <option value="1">Aktif</option>
            <option value="0">Nonaktif</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Kata Sandi</span>
          <input name="password" type="password" required={!user} autoComplete="new-password" placeholder={user ? "Kosongkan jika tidak diganti" : ""} className={`${inputClass} mt-1.5`} />
        </label>
        <div>
          <h3 className="font-semibold">Hak Akses</h3>
          <p className="mt-1 text-sm text-muted">Mengikuti peran yang dipilih dan tidak disimpan terpisah.</p>
          <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            {ACCESS.map((item) => (
              <li key={item.module} className="flex h-8 items-center gap-2">
                <input type="checkbox" checked={can(role, item.module)} disabled aria-label={item.label} />
                <span className="truncate">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {user ? (
            <button type="submit" formAction={deleteUser} formNoValidate className="btn inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-danger/10 text-sm font-medium text-danger">
              <Trash2 size={15} aria-hidden />
              Hapus
            </button>
          ) : (
            <Link href={cancelHref} className="btn inline-flex h-11 w-full items-center justify-center rounded-full border border-line text-sm font-medium">
              Batal
            </Link>
          )}
          <PrimaryButton type="submit" className="h-11 w-full rounded-full">
            {user ? "Simpan Perubahan" : "Simpan"}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
