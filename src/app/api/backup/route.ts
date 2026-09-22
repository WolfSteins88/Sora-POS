import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { exportBackupDump } from "@/lib/backup";

export async function GET() {
  const session = await getSession();
  if (!session || !can(session.role, "settings")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const dump = await exportBackupDump();
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(dump, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="sora-pos-backup-${day}.json"`,
    },
  });
}
