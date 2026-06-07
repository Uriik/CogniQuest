/**
 * Content moderation module — server-side text validation.
 *
 * Normalises input (lowercase, strip accents, undo leetspeak, remove separators)
 * then matches against a PT-BR blocklist. Rejects (does NOT mask) — the caller
 * should ask the user to pick another name.
 *
 * Used by: register route (displayName), lobby gateway (room name).
 */

// ─── Blocklist PT-BR ────────────────────────────────────────────────────────
// Covers slurs, profanity, sexual terms, racial/homophobic slurs.
// Kept as normalised forms (lowercase, no accents, no separators).
const BLOCKLIST: readonly string[] = [
  // Palavrões comuns
  "porra", "caralho", "merda", "foda", "fodase", "fodasse", "puta",
  "putaria", "putinha", "arrombado", "arrombada", "cuzao", "cuzão",
  "buceta", "boceta", "piroca", "rola", "cacete", "desgraca", "desgraça",
  "filhodaputa", "filhadaputa", "fdp", "pqp", "vsf", "tnc", "krl",
  "vtnc", "pnc", "lixo humano", "vagabundo", "vagabunda",
  // Termos sexuais
  "punheta", "punheteiro", "safado", "safada", "gozar", "gozada",
  "piranha", "prostituta", "gigolo", "tarado", "tarada",
  "chupameurola", "chuparola",
  // Racial
  "macaco", "macaca", "negrodmerda", "pretoimundo", "pretaimunda",
  "crioulo", "crioula", "negro de merda",
  // Homofóbicos
  "viado", "bicha", "sapatao", "sapata", "traveco", "boiola",
  "baitola", "bixa", "veado",
  // Genéricos ofensivos
  "retardado", "retardada", "mongolao", "mongoloide", "idiota",
  "imbecil", "otario", "otaria", "corno", "corna",
  "babaca", "trouxa", "energumeno",
  // Variações com espaços/separadores removidos — capturadas pela normalização
] as const;

// ─── Leetspeak map ──────────────────────────────────────────────────────────
const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  "$": "s",
  "!": "i",
  "+": "t",
};

// ─── Zero-width & invisible chars ───────────────────────────────────────────
const INVISIBLE_RE =
  /[\u200B-\u200F\u2028-\u202F\u2060-\u2069\uFEFF\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E]/g;

// ─── URL pattern ────────────────────────────────────────────────────────────
const URL_RE =
  /(?:https?:\/\/|www\.)[\w.-]+(?:\.[\w]{2,})|[\w.-]+\.(?:com|net|org|io|gg|me|br|xyz|dev|app|info|biz|co)/i;

// ─── Excessive symbols ─────────────────────────────────────────────────────
const EXCESSIVE_SYMBOLS_RE = /[^a-zA-Z0-9\s\u00C0-\u024F]{4,}/;

/**
 * Normalise text for blocklist matching:
 * 1. Remove invisible/zero-width chars
 * 2. Lowercase
 * 3. Strip accents (NFD + combining marks)
 * 4. Undo leetspeak
 * 5. Remove separators (spaces, dots, underscores, hyphens, etc.)
 */
function normalise(text: string): string {
  let s = text
    .replace(INVISIBLE_RE, "")
    .toLowerCase()
    // NFD decompose → strip combining marks (accents)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Undo leetspeak
  s = s
    .split("")
    .map((ch) => LEET_MAP[ch] ?? ch)
    .join("");

  // Strip separators
  s = s.replace(/[\s._\-~*|\\\/]+/g, "");

  return s;
}

export interface ModerationResult {
  ok: boolean;
  reason?: string;
}

export interface CheckTextOptions {
  /** Minimum length (default 2). */
  minLength?: number;
  /** Maximum length (default 40). */
  maxLength?: number;
  /** Label for error messages (e.g. "Nome de exibição", "Nome da sala"). */
  fieldLabel?: string;
}

/**
 * Check whether user-generated text is acceptable.
 *
 * Returns `{ ok: true }` if the text passes, or `{ ok: false, reason }` with
 * a user-facing message in PT-BR explaining why it was rejected.
 *
 * **Always call on the server.** Never trust client-side validation alone.
 */
export function checkText(
  text: string,
  opts: CheckTextOptions = {},
): ModerationResult {
  const {
    minLength = 2,
    maxLength = 40,
    fieldLabel = "Texto",
  } = opts;

  // Length checks (on raw input)
  const trimmed = text.trim();
  if (trimmed.length < minLength) {
    return { ok: false, reason: `${fieldLabel} precisa ter no mínimo ${minLength} caracteres.` };
  }
  if (trimmed.length > maxLength) {
    return { ok: false, reason: `${fieldLabel} pode ter no máximo ${maxLength} caracteres.` };
  }

  // URL check (on raw input, before normalisation)
  if (URL_RE.test(trimmed)) {
    return { ok: false, reason: `${fieldLabel} não pode conter URLs.` };
  }

  // Excessive symbols (on raw input)
  if (EXCESSIVE_SYMBOLS_RE.test(trimmed)) {
    return { ok: false, reason: `${fieldLabel} contém símbolos excessivos.` };
  }

  // Blocklist check (on normalised input)
  const norm = normalise(trimmed);
  for (const term of BLOCKLIST) {
    const normTerm = normalise(term);
    if (norm.includes(normTerm)) {
      return {
        ok: false,
        reason: `${fieldLabel} contém linguagem inadequada. Por favor, escolha outro.`,
      };
    }
  }

  return { ok: true };
}
