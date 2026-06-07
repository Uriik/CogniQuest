import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

export * from "./schema/index.js";

/** Lazily-built singleton DB client. */
let _client: ReturnType<typeof postgres> | null = null;

export function getDb(connectionUrl = process.env.DATABASE_URL) {
  if (!connectionUrl) throw new Error("DATABASE_URL is not set");
  const isProd = process.env.NODE_ENV === "production";
  // Capa o pool POR INSTÂNCIA. Sob autoscaling do Cloud Run, conexões = max × Nº
  // de instâncias; sem cap, o default (10) estoura o limite do Supabase rápido.
  // Ajustável por env (DB_POOL_MAX). Ver comentário no infra/main.tf (~5).
  const max = Number(process.env.DB_POOL_MAX) || 5;
  // prepare:false é OBRIGATÓRIO ao usar o pooler de transação do Supabase
  // (Supavisor/pgBouncer na porta 6543), que não suporta prepared statements.
  // É seguro também em conexão direta (apenas não usa prepared statements).
  _client ??= postgres(connectionUrl, { ssl: isProd ? "require" : false, max, prepare: false });
  return drizzle(_client, { schema });
}

export { schema };
export * from "./questions.js";
export * from "./redis.js";
export { eq, sql } from "drizzle-orm";
