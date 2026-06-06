import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

export * from "./schema/index.js";

/** Lazily-built singleton DB client. */
let _client: ReturnType<typeof postgres> | null = null;

export function getDb(connectionUrl = process.env.DATABASE_URL) {
  if (!connectionUrl) throw new Error("DATABASE_URL is not set");
  const isProd = process.env.NODE_ENV === "production";
  _client ??= postgres(connectionUrl, { ssl: isProd ? "require" : false });
  return drizzle(_client, { schema });
}

export { schema };
export * from "./questions.js";
export * from "./redis.js";
export { eq, sql } from "drizzle-orm";
