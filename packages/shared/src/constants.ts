/**
 * Domain constants shared across web, game-server and db.
 * Single source of truth for age bands, subjects, fleet and board.
 */

/** Difficulty by age band. */
export const AGE_BANDS = ["6-8", "9-11", "12-14", "15+"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

/** Subjects (slugs map to SVG icons in assets/). */
export const SUBJECTS = [
  { slug: "math", name: "Matemática", icon: "assets/icon_math.svg" },
  { slug: "physics", name: "Física", icon: "assets/icon_physics.svg" },
  { slug: "biology", name: "Biologia", icon: "assets/icon_biology.svg" },
  { slug: "chemistry", name: "Química", icon: "assets/icon_chemistry.svg" },
  { slug: "portuguese", name: "Português", icon: "assets/icon_portuguese.svg" },
  { slug: "history", name: "História", icon: "assets/icon_history.svg" },
  { slug: "geography", name: "Geografia", icon: "assets/icon_geography.svg" },
] as const;

export type SubjectSlug = (typeof SUBJECTS)[number]["slug"];
export const SUBJECT_SLUGS = SUBJECTS.map((s) => s.slug) as SubjectSlug[];

/** Battleship board is square 10x10. */
export const BOARD_SIZE = 10;

/** Fleet composition (inherited from the mock). Each ship has a length in segments. */
export const FLEET = [
  { id: "sub_1", name: "Submarino", length: 1 },
  { id: "sub_2", name: "Submarino", length: 1 },
  { id: "sub_3", name: "Submarino", length: 1 },
  { id: "destroyer_1", name: "Destroyer", length: 3 },
  { id: "destroyer_2", name: "Destroyer", length: 3 },
  { id: "cruiser_1", name: "Cruiser", length: 5 },
] as const;

export type ShipId = (typeof FLEET)[number]["id"];

/** Total hittable segments across the whole fleet. */
export const TOTAL_SEGMENTS = FLEET.reduce((sum, s) => sum + s.length, 0);

/** A hint is granted every N correct answers. */
export const HINT_EVERY_CORRECT = 3;

/** Number of multiple-choice options per question. */
export const OPTIONS_PER_QUESTION = 4;
