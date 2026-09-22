export function skuPrefixForProduct(pack: "fnb" | "retail") {
  return pack === "retail" ? "RT" : "FB";
}

export function nextSku(existing: string[], prefix: string) {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${escaped}-(\\d+)$`, "i");
  let max = 0;
  for (const sku of existing) {
    const match = sku.trim().match(re);
    if (match) max = Math.max(max, Number.parseInt(match[1], 10) || 0);
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}
