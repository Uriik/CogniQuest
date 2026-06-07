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

export const cacheKey = (subjectSlug: string, grade: string) =>
  `qcache:${subjectSlug}:${grade}`;

/**
 * Fetches random questions, projecting ONLY public columns (no isCorrect).
 * Caches the batch in Redis (if store provided).
 */
export async function getRandomQuestions(
  subjectSlug: string,
  grade: string,
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
    .where(and(eq(subjects.slug, subjectSlug), eq(questions.grade, grade)))
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

/**
 * Pool de perguntas por matéria/série, com cache no Redis.
 *
 * - `questions`: projeção PÚBLICA (sem `isCorrect`) — pode ir ao cliente.
 * - `answers`: mapa questionId -> correctOptionId. SERVER-ONLY. NUNCA serializado
 *   a um cliente; usado apenas para validar respostas no servidor sem ir ao banco.
 *
 * O `ORDER BY RANDOM()` (caro) só roda em cache MISS — uma vez a cada `POOL_TTL`
 * por matéria/série — em vez de a cada partida. As partidas amostram em memória.
 * O mapa de respostas é construído de graça (a query de opções já é necessária).
 */
export interface QuestionPool {
  questions: PublicQuestion[];
  answers: Record<string, string>;
}

const POOL_SIZE = 150;
const POOL_TTL = 600; // 10 min

export async function getQuestionPool(
  subjectSlug: string,
  grade: string,
  store?: CacheStore
): Promise<QuestionPool> {
  const key = cacheKey(subjectSlug, grade);

  if (store) {
    const cached = await store.get(key);
    if (cached) {
      try {
        return JSON.parse(cached) as QuestionPool;
      } catch {
        // cache corrompido: cai para o banco
      }
    }
  }

  const db = getDb();

  const rows = await db
    .select({ id: questions.id, prompt: questions.prompt })
    .from(questions)
    .innerJoin(subjects, eq(questions.subjectId, subjects.id))
    .where(and(eq(subjects.slug, subjectSlug), eq(questions.grade, grade)))
    .orderBy(sql`RANDOM()`)
    .limit(POOL_SIZE);

  if (rows.length === 0) return { questions: [], answers: {} };

  const qIds = rows.map((q) => q.id);

  // Inclui `isCorrect` AQUI (server-only) para montar o mapa de respostas sem
  // uma query extra. A projeção pública abaixo descarta esse campo.
  const opts = await db
    .select({
      id: questionOptions.id,
      questionId: questionOptions.questionId,
      label: questionOptions.label,
      isCorrect: questionOptions.isCorrect,
    })
    .from(questionOptions)
    .where(inArray(questionOptions.questionId, qIds));

  const answers: Record<string, string> = {};
  for (const o of opts) {
    if (o.isCorrect) answers[o.questionId] = o.id;
  }

  const publicQuestions: PublicQuestion[] = rows.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    options: opts
      .filter((o) => o.questionId === q.id)
      .map((o) => ({ id: o.id, questionId: o.questionId, label: o.label })), // sem isCorrect
  }));

  const pool: QuestionPool = { questions: publicQuestions, answers };

  if (store) {
    await store.set(key, JSON.stringify(pool), POOL_TTL);
  }

  return pool;
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
