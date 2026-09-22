import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { IMAGE_KINDS, IMAGE_MAX_BYTES, IMAGE_MIME, type ImageKind } from "./types";

function dirFor(kind: ImageKind) {
  return path.join(process.cwd(), "storage", "uploads", kind);
}

export async function saveUpload(file: File | null, kind: ImageKind, oldName?: string | null) {
  if (!file || file.size === 0) return oldName ?? null;
  if (!IMAGE_KINDS.includes(kind)) throw new Error("Jenis unggahan tidak valid.");
  if (file.size > IMAGE_MAX_BYTES) throw new Error("Gambar maksimal 2MB.");
  const ext = IMAGE_MIME[file.type];
  if (!ext) throw new Error("Gunakan JPG, PNG, atau WEBP.");
  const key = `${randomBytes(12).toString("hex")}.${ext}`;
  const dir = dirFor(kind);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, key), Buffer.from(await file.arrayBuffer()));
  if (oldName) await removeUpload(kind, oldName);
  return key;
}

export async function removeUpload(kind: ImageKind, filename: string | null | undefined) {
  if (!filename) return;
  const safe = path.basename(filename);
  if (safe !== filename) return;
  await unlink(path.join(dirFor(kind), safe)).catch(() => {});
}

export function uploadDir(kind: ImageKind) {
  return dirFor(kind);
}
