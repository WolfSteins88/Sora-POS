import { redirect } from "next/navigation";
import { BarChart3, Boxes, Coffee, ShoppingBag, ShoppingCart } from "lucide-react";
import { loginAction } from "@/app/actions/auth";
import { Field } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { getSettingsMap } from "@/lib/settings";
import { normalizeShopMode } from "@/lib/theme";

const COPY = {
  fnb: {
    headline: "Kelola coffee shop Anda dengan lebih tenang.",
    sub: "Kasir, stok racikan, shift, dan laporan dalam satu layar yang ringkas untuk coffee shop harian.",
    brand: Coffee,
    features: [
      { icon: ShoppingCart, title: "Kasir", text: "Dine-in atau bawa pulang, meja, dan struk cepat." },
      { icon: Boxes, title: "Stok & Resep", text: "Bahan baku terpotong otomatis saat racikan terjual." },
      { icon: BarChart3, title: "Laporan", text: "Omzet harian dan shift tanpa spreadsheet terpisah." },
    ],
  },
  retail: {
    headline: "Kelola toko ritel Anda dengan lebih tenang.",
    sub: "Kasir barang, stok SKU, shift, dan laporan untuk warung atau toko harian.",
    brand: ShoppingBag,
    features: [
      { icon: ShoppingCart, title: "Kasir", text: "Tap barang masuk keranjang, bayar tunai atau non-tunai." },
      { icon: Boxes, title: "Stok barang", text: "SKU dan stok minimum terlihat sebelum habis." },
      { icon: BarChart3, title: "Laporan", text: "Omzet harian dan shift tanpa spreadsheet terpisah." },
    ],
  },
} as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) {
    redirect(session.role === "CASHIER" ? "/pos" : "/dashboard");
  }
  const params = await searchParams;
  let shopName = "Toko";
  let mode: keyof typeof COPY = "fnb";
  try {
    const s = await getSettingsMap();
    shopName = s.shop_name || "Toko";
    mode = normalizeShopMode(s.shop_mode);
  } catch {
    shopName = "Toko";
  }
  const copy = COPY[mode];
  const BrandIcon = copy.brand;
  const year = new Date().getFullYear();
  return (
    <div className="grid min-h-full md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <aside className="login-hero relative hidden flex-col justify-between p-10 text-white md:flex">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm">
            <BrandIcon size={16} aria-hidden />
            {shopName}
          </span>
          <h1 className="mt-10 max-w-md text-4xl font-semibold tracking-tight lg:text-[2.6rem] lg:leading-tight">
            {copy.headline}
          </h1>
          <p className="mt-4 max-w-md text-sm text-white/80">{copy.sub}</p>
          <ul className="mt-10 space-y-5">
            {copy.features.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="flex gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <Icon size={18} aria-hidden />
                  </span>
                  <span>
                    <span className="block font-semibold">{item.title}</span>
                    <span className="block text-sm text-white/75">{item.text}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="text-xs text-white/60">© {year} {shopName}</p>
      </aside>

      <section className="login-form-panel flex flex-col justify-center px-5 py-8 sm:px-10">
        <div className="mb-8 flex items-center gap-2 md:hidden">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent text-white">
            <BrandIcon size={18} aria-hidden />
          </span>
          <span className="font-semibold">{shopName}</span>
        </div>
        <form action={loginAction} className="mx-auto w-full max-w-[380px]">
          <span className="mb-5 hidden size-12 items-center justify-center rounded-2xl bg-accent text-white md:inline-flex">
            <BrandIcon size={22} aria-hidden />
          </span>
          <h2 className="text-2xl font-semibold tracking-tight">Masuk ke akun Anda</h2>
          <p className="mt-1 mb-6 text-sm text-muted">Gunakan akun toko di perangkat ini.</p>
          <div className="space-y-4">
            <Field label="Username">
              <input name="username" autoComplete="username" required className="login-input" />
            </Field>
            <Field
              label="Password"
              error={params.error ? "Username atau password salah." : undefined}
            >
              <input name="password" type="password" autoComplete="current-password" required className="login-input" />
            </Field>
            <button
              type="submit"
              className="btn mt-1 w-full rounded-xl bg-accent text-sm font-semibold text-white"
            >
              Masuk
            </button>
          </div>
          <p className="mt-5 text-xs text-muted">admin / manager / cashier · password123</p>
        </form>
      </section>
    </div>
  );
}
