import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { AppShell } from "@/components/AppShell";
import { normalizeShopMode } from "@/lib/theme";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const shopName = await getSetting("shop_name", "Toko");
  const shopMode = normalizeShopMode(await getSetting("shop_mode", "fnb"));
  return (
    <AppShell user={session} shopName={shopName} shopMode={shopMode}>
      {children}
    </AppShell>
  );
}
