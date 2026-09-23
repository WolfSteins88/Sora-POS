import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";

export async function GET() {
  const session = await getSession();
  if (!session || !can(session.role, "settings")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const file = path.join(process.cwd(), "seeds", "retail-demo.json");
  try {
    const body = await readFile(file, "utf8");
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="sora-pos-retail-demo-2026-09.json"',
      },
    });
  } catch {
    return new NextResponse("Seed retail belum tersedia.", { status: 404 });
  }
}
