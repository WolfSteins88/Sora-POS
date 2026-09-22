"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Menu,
  X,
  Store,
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  FolderTree,
  Boxes,
  ChefHat,
  Clock3,
  BarChart3,
  Users,
  Printer,
  Settings,
} from "lucide-react";
import { NAV_ITEMS, can, type Role } from "@/lib/rbac";
import { logoutAction } from "@/app/actions/auth";
import { Badge } from "@/components/ui";

const ICONS: Record<string, typeof LayoutDashboard> = {
  "/dashboard": LayoutDashboard,
  "/pos": ShoppingCart,
  "/transactions": Receipt,
  "/products": Package,
  "/categories": FolderTree,
  "/inventory": Boxes,
  "/recipes": ChefHat,
  "/shifts": Clock3,
  "/reports": BarChart3,
  "/users": Users,
  "/printer": Printer,
  "/settings": Settings,
};

const PRIMARY_HREFS = ["/dashboard", "/pos", "/transactions", "/products", "/shifts", "/reports"];

const MODE_LABEL: Record<string, string> = {
  fnb: "F&B",
  retail: "Retail",
};

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  MANAGER: "Manajer",
  CASHIER: "Kasir",
};

type Props = {
  user: { name: string; username: string; role: Role };
  shopName: string;
  shopMode: string;
  children: React.ReactNode;
};

export function AppShell({ user, shopName, shopMode, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items = NAV_ITEMS.filter((item) => can(user.role, item.module)).filter((item) => {
    if (shopMode === "retail" && (item.module === "recipes" || item.module === "inventory")) return false;
    return true;
  });
  const named = items.filter((item) => PRIMARY_HREFS.includes(item.href));
  const iconOnly = items.filter((item) => !PRIMARY_HREFS.includes(item.href));
  const initial = user.name.trim().slice(0, 1).toUpperCase() || "?";

  function closeNav() {
    window.setTimeout(() => setOpen(false), 0);
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="app-header no-print sticky top-0 z-[110] grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-line/60 bg-white/70 px-3 backdrop-blur-md lg:gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            id="menuToggleBtn"
            type="button"
            className="icon-btn inline-flex items-center justify-center rounded-full border border-line"
            aria-label={open ? "Tutup menu" : "Buka menu"}
            aria-expanded={open}
            aria-controls="appDrawer"
            onClick={() => setOpen((v) => !v)}
            suppressHydrationWarning
          >
            <Menu size={20} aria-hidden />
          </button>
          <Store size={20} className="shrink-0 text-accent" aria-hidden />
          <p className="flex min-w-0 items-center gap-2">
            <span className="max-w-[8rem] truncate text-sm font-semibold sm:max-w-[12rem]">{shopName}</span>
            <Badge tone="accent">{MODE_LABEL[shopMode] ?? "F&B"}</Badge>
          </p>
        </div>

        <nav className="nav-pill justify-self-center" aria-label="Menu utama">
          {named.map((item) => (
            <Link
              key={`pill-${item.href}`}
              href={item.href}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm transition duration-ui ${
                isActive(item.href) ? "bg-accent font-semibold text-white" : "font-medium text-ink hover:bg-accent-soft"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex min-w-0 items-center justify-end gap-1 lg:gap-2">
          <nav className="nav-icons" aria-label="Menu lain">
            {iconOnly.map((item) => {
              const Icon = ICONS[item.href] ?? Store;
              const active = isActive(item.href);
              return (
                <Link
                  key={`icon-${item.href}`}
                  href={item.href}
                  aria-label={item.label}
                  title={item.label}
                  className={`icon-btn inline-flex items-center justify-center rounded-full border transition duration-ui ${
                    active ? "border-accent bg-accent text-white" : "border-line bg-white/80 text-ink hover:bg-accent-soft"
                  }`}
                >
                  <Icon size={18} aria-hidden />
                </Link>
              );
            })}
          </nav>
          <div className="flex min-w-0 items-center gap-2 rounded-full border border-line bg-white/80 py-1 pr-3 pl-1">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
              {initial}
            </span>
            <span className="min-w-0">
              <span className="block max-w-[6rem] truncate text-sm font-medium sm:max-w-[9rem]">{user.name}</span>
              <span className="block text-xs text-muted">{ROLE_LABEL[user.role]}</span>
            </span>
          </div>
        </div>
      </header>

      <div
        className={`drawer-overlay no-print ${open ? "open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      <aside id="appDrawer" className={`app-drawer no-print ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="flex items-center justify-between gap-2 border-b border-white/15 px-4 py-3">
          <p className="truncate text-base font-semibold">{shopName}</p>
          <button
            type="button"
            className="icon-btn inline-flex items-center justify-center rounded-full border border-white/20"
            aria-label="Tutup menu"
            onClick={() => setOpen(false)}
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-3" aria-label="Semua menu">
          {items.map((item) => {
            const Icon = ICONS[item.href] ?? Store;
            const active = isActive(item.href);
            return (
              <Link
                key={`side-${item.href}`}
                href={item.href}
                onClick={closeNav}
                className={`flex min-h-12 items-center gap-3 rounded-2xl px-3.5 text-base transition duration-ui ${
                  active ? "bg-white/20 font-semibold text-white" : "text-[color:var(--sidebar-muted)] hover:bg-white/10"
                }`}
              >
                <Icon size={20} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action={logoutAction} className="border-t border-white/15 p-3 pb-5">
          <button type="submit" className="btn w-full rounded-2xl border border-white/25 text-base text-white">
            Keluar
          </button>
        </form>
      </aside>

      <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
    </div>
  );
}
