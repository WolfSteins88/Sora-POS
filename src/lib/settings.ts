import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { settings } from "./schema";

export async function getSettingsMap() {
  const db = getDb();
  const rows = await db.select().from(settings);
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.settingKey] = row.settingValue ?? "";
  }
  return map;
}

export async function getSetting(key: string, fallback = "") {
  const db = getDb();
  const [row] = await db.select().from(settings).where(eq(settings.settingKey, key)).limit(1);
  return row?.settingValue ?? fallback;
}
