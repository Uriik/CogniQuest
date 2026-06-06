import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

async function main() {
  const connectionUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/cogniquest";
  const client = postgres(connectionUrl);
  const db = drizzle(client);

  console.log("Dropping all tables...");
  await client`DROP SCHEMA public CASCADE;`;
  await client`CREATE SCHEMA public;`;
  console.log("Done.");
  process.exit(0);
}

main().catch(console.error);
