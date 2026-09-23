export const IMAGE_KINDS = ["products", "categories", "inventory", "users", "logo"] as const;
export type ImageKind = (typeof IMAGE_KINDS)[number];

export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const IMAGE_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function imageUrl(kind: ImageKind, filename: string | null | undefined) {
  if (!filename) return null;
  const driver = process.env.NEXT_PUBLIC_IMAGE_DRIVER || "local";
  if (driver === "supabase") {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base) return null;
    return `${base.replace(/\/$/, "")}/storage/v1/object/public/pos-images/${kind}/${filename}`;
  }
  return `/uploads/${kind}/${filename}`;
}
