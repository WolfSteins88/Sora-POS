export type ShopMode = "fnb" | "retail";

export function normalizeShopMode(raw: string | null | undefined): ShopMode {
  return raw === "retail" ? "retail" : "fnb";
}

export function defaultAccent(mode: string) {
  return normalizeShopMode(mode) === "retail" ? "#0ea5e9" : "#4a3525";
}

export function catalogPackFromQuery(raw: string | null | undefined, shopMode: string | null | undefined): ShopMode {
  if (raw === "retail" || raw === "fnb") return raw;
  return normalizeShopMode(shopMode);
}

export function parseAccentColor(raw: string | null | undefined) {
  const value = String(raw ?? "").trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(value)) return value;
  return "";
}
