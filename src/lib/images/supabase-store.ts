/**
 * Optional Supabase Storage driver (not used while IMAGE_DRIVER=local).
 * Database remains PostgreSQL. This only stores image blobs in a bucket.
 *
 * Env when enabling:
 *   NEXT_PUBLIC_IMAGE_DRIVER=supabase
 *   NEXT_PUBLIC_SUPABASE_URL=
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=
 *
 * Bucket: pos-images  path: {kind}/{key}
 *
 * Example (do not call from checkout):
 *   const { createClient } = await import("@supabase/supabase-js");
 *   const sb = createClient(url, key);
 *   await sb.storage.from("pos-images").upload(`${kind}/${key}`, blob, { upsert: true });
 */
export const SUPABASE_IMAGE_BUCKET = "pos-images";

export function supabaseObjectPath(kind: string, key: string) {
  return `${kind}/${key}`;
}
