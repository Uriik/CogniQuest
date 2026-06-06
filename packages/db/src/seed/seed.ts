/**
 * Seed manual (MVP). Inserts the 7 subjects and a starter set of
 * multiple-choice questions. The content team expands buckets later.
 *
 * Run: pnpm db:seed   (needs DATABASE_URL)
 */
const SUBJECTS = [
  { slug: "math", name: "Matemática", icon: "assets/icon_math.svg" },
  { slug: "physics", name: "Física", icon: "assets/icon_physics.svg" },
  { slug: "biology", name: "Biologia", icon: "assets/icon_biology.svg" },
  { slug: "chemistry", name: "Química", icon: "assets/icon_chemistry.svg" },
  { slug: "portuguese", name: "Português", icon: "assets/icon_portuguese.svg" },
  { slug: "history", name: "História", icon: "assets/icon_history.svg" },
  { slug: "geography", name: "Geografia", icon: "assets/icon_geography.svg" },
];
import { getDb } from "../index.js";
import { questionOptions, questions, subjects } from "../schema/index.js";
import { seedQuestions } from "./questions.js";

async function main() {
  const db = getDb();

  console.log("Seeding subjects...");
  const insertedSubjects = await db
    .insert(subjects)
    .values(
      SUBJECTS.map((s) => ({ slug: s.slug, name: s.name, icon: s.icon })),
    )
    .onConflictDoNothing({ target: subjects.slug })
    .returning();

  // Map slug -> id (re-read to be safe if some already existed).
  const all = await db.select().from(subjects);
  const idBySlug = new Map(all.map((s) => [s.slug, s.id]));
  console.log(`Subjects ready: ${all.length} (new: ${insertedSubjects.length})`);

  console.log("Seeding questions...");
  let count = 0;
  for (const q of seedQuestions) {
    const subjectId = idBySlug.get(q.subjectSlug);
    if (!subjectId) {
      console.warn(`skip: unknown subject ${q.subjectSlug}`);
      continue;
    }
    const [row] = await db
      .insert(questions)
      .values({ subjectId, grade: q.grade, prompt: q.prompt })
      .returning();
    if (!row) continue;
    await db.insert(questionOptions).values(
      q.options.map((label, idx) => ({
        questionId: row.id,
        label,
        isCorrect: idx === q.answerIndex,
      })),
    );
    count++;
  }
  console.log(`Questions seeded: ${count}`);
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
