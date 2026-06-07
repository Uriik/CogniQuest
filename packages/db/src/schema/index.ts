/**
 * Drizzle schema — persistent data (PostgreSQL / Cloud SQL).
 *
 * SECURITY: `questionOptions.isCorrect` must NEVER be selected into any payload
 * sent to a client. Always project public columns explicitly.
 */
import {
  boolean,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// ─── Users ──────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(), // Argon2id
  displayName: text("display_name").notNull(),
  grade: text("grade"), // '6-ano' | '7-ano' | ... | '3-em'
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  // ── LGPD additions ──
  birthdate: date("birthdate"),
  guardianEmail: text("guardian_email"),
  status: text("status").notNull().default("active"), // 'pending_parental' | 'active' | 'suspended'
  anonymizedAt: timestamp("anonymized_at", { withTimezone: true }),
});

// ─── Subjects ───────────────────────────────────────────────────────────────

export const subjects = pgTable("subjects", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(), // math | physics | ...
  name: text("name").notNull(),
  icon: text("icon").notNull(), // path to SVG in assets/
});

// ─── Questions ──────────────────────────────────────────────────────────────

export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  subjectId: uuid("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  grade: text("grade").notNull(), // '6-ano' | '7-ano' | ... | '3-em'
  prompt: text("prompt").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  subjectGradeIdx: index("questions_subject_grade_idx").on(table.subjectId, table.grade),
}));

// ─── Question Options ───────────────────────────────────────────────────────

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

// ─── Matches ────────────────────────────────────────────────────────────────

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
  grade: text("grade").notNull(),
  winnerId: uuid("winner_id").references(() => users.id),
  status: text("status").notNull(), // 'finished' | 'abandoned'
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
}, (table) => ({
  statusHostIdx: index("matches_status_host_idx").on(table.status, table.hostId),
}));

// ─── Consents (LGPD) ───────────────────────────────────────────────────────

export const consents = pgTable("consents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'privacy_policy' | 'terms' | 'data_processing' | 'parental'
  policyVersion: text("policy_version").notNull(), // e.g. 'v1.0'
  grantedAt: timestamp("granted_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  ip: text("ip"),
  method: text("method"), // 'registration_form' | 'parental_email' | 're-consent'
}, (table) => ({
  userIdx: index("consents_user_id_idx").on(table.userId),
}));

// ─── Data Requests / DSAR (LGPD Art. 18) ────────────────────────────────────

export const dataRequests = pgTable("data_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'access' | 'deletion' | 'rectification' | 'portability'
  status: text("status").notNull().default("pending"), // 'pending' | 'processing' | 'completed' | 'rejected'
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
}, (table) => ({
  userIdx: index("data_requests_user_id_idx").on(table.userId),
}));

// ─── Audit Log ──────────────────────────────────────────────────────────────

export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: text("actor_id"), // userId or 'system'
  action: text("action").notNull(), // 'consent_granted' | 'account_deleted' | 'data_exported' | ...
  target: text("target"), // e.g. 'user:<id>' or 'room:<id>'
  metadata: text("metadata"), // JSON string with extra context
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  actorIdx: index("audit_log_actor_id_idx").on(table.actorId),
  actionIdx: index("audit_log_action_idx").on(table.action),
}));

// ─── Reports (Moderation) ───────────────────────────────────────────────────

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  reporterId: uuid("reporter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull(), // 'room' | 'user'
  targetId: text("target_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'reviewed' | 'dismissed'
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  reporterIdx: index("reports_reporter_id_idx").on(table.reporterId),
  statusIdx: index("reports_status_idx").on(table.status),
}));

// ─── Type exports ───────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type QuestionOption = typeof questionOptions.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Consent = typeof consents.$inferSelect;
export type DataRequest = typeof dataRequests.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type Report = typeof reports.$inferSelect;
