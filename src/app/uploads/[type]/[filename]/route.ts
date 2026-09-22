import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { IMAGE_KINDS, type ImageKind } from "@/lib/images/types";
import { uploadDir } from "@/lib/images/save-local";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_req: Request, ctx: { params: Promise<{ type: string; filename: string }> }) {
  const { type, filename } = await ctx.params;
  if (!IMAGE_KINDS.includes(type as ImageKind)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const safe = path.basename(filename);
  if (safe !== filename || safe.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }
  const ext = safe.split(".").pop()?.toLowerCase() ?? "";
  const mime = MIME[ext];
  if (!mime) return new NextResponse("Not found", { status: 404 });
  try {
    const buf = await readFile(path.join(uploadDir(type as ImageKind), safe));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=604800",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
