import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { users } from "./schema";
import type { Role } from "./rbac";
import { COOKIE, decodeSession, encodeSession, type SessionUser } from "./session";

export type { SessionUser };

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  return decodeSession(jar.get(COOKIE)?.value);
}

export async function requireSession(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}

export async function login(username: string, password: string): Promise<SessionUser | null> {
  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!row || !row.isActive) return null;
  const ok = await bcrypt.compare(password, row.passwordHash);
  if (!ok) return null;
  const session: SessionUser = {
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.role as Role,
  };
  const jar = await cookies();
  jar.set(COOKIE, await encodeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  return session;
}

export async function logout() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
