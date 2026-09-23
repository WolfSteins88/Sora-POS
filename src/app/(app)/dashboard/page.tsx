import { getSession } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { normalizeShopMode } from "@/lib/theme";
import { fnbDashboard, retailDashboard } from "@/server/queries";
import { FnbDashboard } from "./FnbDashboard";
import { RetailDashboard } from "./RetailDashboard";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;
  const shopMode = normalizeShopMode(await getSetting("shop_mode", "fnb"));
  if (shopMode === "retail") {
    return <RetailDashboard data={await retailDashboard()} userName={session.name} />;
  }
  const data = await fnbDashboard();
  return <FnbDashboard data={data} userName={session.name} />;
}
