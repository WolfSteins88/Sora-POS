import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL belum diset. Salin .env.example ke .env.local.");
  }
  return url;
}

const globalForSql = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

export function getSql() {
  if (!globalForSql.sql) {
    globalForSql.sql = postgres(databaseUrl(), {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return globalForSql.sql;
}

export function getDb() {
  return drizzle(getSql(), { schema });
}
