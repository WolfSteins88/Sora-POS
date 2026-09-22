export type Role = "ADMIN" | "MANAGER" | "CASHIER";

export type ModuleKey =
  | "dashboard"
  | "pos"
  | "transactions"
  | "products"
  | "categories"
  | "inventory"
  | "recipes"
  | "reports"
  | "shifts"
  | "users"
  | "printer"
  | "settings";

export const ROLE_PERMISSIONS: Record<Role, ModuleKey[] | ["*"]> = {
  ADMIN: ["*"],
  MANAGER: [
    "dashboard",
    "pos",
    "transactions",
    "products",
    "categories",
    "inventory",
    "recipes",
    "reports",
    "shifts",
    "printer",
  ],
  CASHIER: ["pos", "transactions", "shifts", "printer"],
};

export function can(role: Role, module: ModuleKey) {
  const perms = ROLE_PERMISSIONS[role];
  if (perms.length === 1 && perms[0] === "*") return true;
  return (perms as ModuleKey[]).includes(module);
}

export const NAV_ITEMS: { href: string; label: string; module: ModuleKey }[] = [
  { href: "/dashboard", label: "Dashboard", module: "dashboard" },
  { href: "/pos", label: "POS", module: "pos" },
  { href: "/transactions", label: "Transaksi", module: "transactions" },
  { href: "/products", label: "Produk", module: "products" },
  { href: "/categories", label: "Kategori", module: "categories" },
  { href: "/inventory", label: "Inventori", module: "inventory" },
  { href: "/recipes", label: "Resep", module: "recipes" },
  { href: "/shifts", label: "Shift", module: "shifts" },
  { href: "/reports", label: "Laporan", module: "reports" },
  { href: "/users", label: "Pengguna", module: "users" },
  { href: "/printer", label: "Printer", module: "printer" },
  { href: "/settings", label: "Pengaturan", module: "settings" },
];
