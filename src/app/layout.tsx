import type { CSSProperties } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import { getSetting } from "@/lib/settings";
import { normalizeShopMode, parseAccentColor } from "@/lib/theme";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  title: "UMKM POS",
  description: "Kasir toko lokal",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  let shopMode = "fnb";
  let accent = "";
  try {
    shopMode = normalizeShopMode(await getSetting("shop_mode", "fnb"));
    accent = parseAccentColor(await getSetting("ui_accent_color", ""));
  } catch {
    shopMode = "fnb";
  }
  return (
    <html
      lang="id"
      className={`${jakarta.variable} h-full antialiased`}
      data-shop-mode={shopMode}
      data-accent={accent || undefined}
      style={accent ? ({ "--ui-accent": accent } as CSSProperties) : undefined}
      suppressHydrationWarning
    >
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
