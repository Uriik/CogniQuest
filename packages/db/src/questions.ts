import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "./index.js";
import { questions, questionOptions, subjects } from "./schema/index.js";

export interface PublicQuestionOption {
  id: string;
  questionId: string;
  label: string;
}

export interface PublicQuestion {
  id: string;
  prompt: string;
  options: PublicQuestionOption[];
}

export interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
}

export const cacheKey = (subjectSlug: string, ageBand: string) =>
  `qcache:${subjectSlug}:${ageBand}`;

/**
 * Fetches random questions, projecting ONLY public columns (no isCorrect).
 * Caches the batch in Redis (if store provided).
 */
export async function getRandomQuestions(
  subjectSlug: string,
  ageBand: string,
  limit: number = 50,
  store?: CacheStore
): Promise<PublicQuestion[]> {
  const db = getDb();

  const randomQ = await db
    .select({
      id: questions.id,
      prompt: questions.prompt,
    })
    .from(questions)
    .innerJoin(subjects, eq(questions.subjectId, subjects.id))
    .where(and(eq(subjects.slug, subjectSlug), eq(questions.ageBand, ageBand)))
    .orderBy(sql`RANDOM()`)
    .limit(limit);

  if (randomQ.length === 0) return [];

  const qIds = randomQ.map((q) => q.id);

  // Fetch only public option columns
  const options = await db
    .select({
      id: questionOptions.id,
      questionId: questionOptions.questionId,
      label: questionOptions.label,
    })
    .from(questionOptions)
    .where(inArray(questionOptions.questionId, qIds));

  const result: PublicQuestion[] = randomQ.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    options: options.filter((o) => o.questionId === q.id).sort(() => Math.random() - 0.5), // shuffle options
  }));

  return result;
}

export async function checkAnswer(questionId: string, optionId: string): Promise<boolean> {
  const db = getDb();
  const option = await db.query.questionOptions.findFirst({
    where: and(eq(questionOptions.id, optionId), eq(questionOptions.questionId, questionId))
  });
  return !!option?.isCorrect;
}

export async function getCorrectOptionId(questionId: string): Promise<string | undefined> {
  const db = getDb();
  const option = await db.query.questionOptions.findFirst({
    where: and(eq(questionOptions.questionId, questionId), eq(questionOptions.isCorrect, true))
  });
  return option?.id;
}
