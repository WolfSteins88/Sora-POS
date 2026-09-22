import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/session";

const PUBLIC = ["/login"];

const MODULE_BY_PATH: Record<string, string> = {
  "/dashboard": "dashboard",
  "/pos": "pos",
  "/transactions": "transactions",
  "/products": "products",
  "/categories": "categories",
  "/inventory": "inventory",
  "/recipes": "recipes",
  "/reports": "reports",
  "/shifts": "shifts",
  "/users": "users",
  "/printer": "printer",
  "/settings": "settings",
};

const PERMS: Record<string, string[]> = {
  ADMIN: ["*"],
  MANAGER: [
    "dashboard",
    "pos",
    "transactions",
    "products",
    "categories",
    "inventory",
    "recipes",
    "reports",
    "shifts",
    "printer",
  ],
  CASHIER: ["pos", "transactions", "shifts", "printer"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }
  if (PUBLIC.includes(pathname)) {
    return NextResponse.next();
  }

  const session = await decodeSession(req.cookies.get("umkm_pos_session")?.value);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const moduleKey = Object.entries(MODULE_BY_PATH).find(
    ([p]) => pathname === p || pathname.startsWith(`${p}/`),
  )?.[1];
  if (moduleKey) {
    const allowed = PERMS[session.role] ?? [];
    if (!allowed.includes("*") && !allowed.includes(moduleKey)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
