import { getDb } from "./packages/db/src/index.js";
import { questions, subjects } from "./packages/db/src/schema/index.js";
import { eq, and } from "drizzle-orm";
import * as dotenv from "dotenv";
dotenv.config();

async function check() {
  const db = getDb();
  const q = await db.select({ prompt: questions.prompt })
    .from(questions)
    .innerJoin(subjects, eq(questions.subjectId, subjects.id))
    .where(and(eq(subjects.slug, 'math'), eq(questions.grade, '9-ano')));
  
  console.log("=== PERGUNTAS NO BANCO DE DADOS SUPABASE PARA MATH 9-11 ===");
  console.log(`TOTAL: ${q.length}`);
  q.forEach((row, i) => console.log(`${i + 1}. ${row.prompt}`));
  process.exit(0);
}
check();
