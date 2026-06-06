/**
 * Drizzle schema — persistent data (PostgreSQL / Cloud SQL).
 *
 * SECURITY: `questionOptions.isCorrect` must NEVER be selected into any payload
 * sent to a client. Always project public columns explicitly.
 */
import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(), // Argon2id
  displayName: text("display_name").notNull(),
  ageBand: text("age_band"), // '6-8' | '9-11' | '12-14' | '15+'
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const subjects = pgTable("subjects", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(), // math | physics | ...
  name: text("name").notNull(),
  icon: text("icon").notNull(), // path to SVG in assets/
});

import { index } from "drizzle-orm/pg-core";

export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  subjectId: uuid("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  ageBand: text("age_band").notNull(), // '6-8' | '9-11' | '12-14' | '15+'
  prompt: text("prompt").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  subjectAgeIdx: index("questions_subject_age_idx").on(table.subjectId, table.ageBand),
}));

export const questionOptions = pgTable("question_options", {
  id: uuid("id").defaultRandom().primaryKey(),
  questionId: uuid("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  isCorrect: boolean("is_correct").notNull(), // server-only, never serialized to client
}, (table) => ({
  questionIdIdx: index("question_options_question_id_idx").on(table.questionId),
}));

export const matches = pgTable("matches", {
  id: uuid("id").defaultRandom().primaryKey(),
  gameType: text("game_type").notNull(), // 'battleship'
  hostId: uuid("host_id")
    .notNull()
    .references(() => users.id),
  guestId: uuid("guest_id").references(() => users.id),
  subjectId: uuid("subject_id")
    .notNull()
    .references(() => subjects.id),
  ageBand: text("age_band").notNull(),
  winnerId: uuid("winner_id").references(() => users.id),
  status: text("status").notNull(), // 'finished' | 'abandoned'
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
}, (table) => ({
  statusHostIdx: index("matches_status_host_idx").on(table.status, table.hostId),
}));

export type User = typeof users.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type QuestionOption = typeof questionOptions.$inferSelect;
export type Match = typeof matches.$inferSelect;
