/**
 * Socket.io event contracts. Validated with Zod on BOTH sides.
 *
 * SECURITY RULE: payloads sent to the client NEVER contain the correct answer
 * (`isCorrect`) nor enemy ship positions. The server is the only authority.
 */
import { z } from "zod";
import { GRADES, BOARD_SIZE, SUBJECT_SLUGS } from "./constants";

/** A board coordinate (0-indexed). */
export const coordSchema = z.object({
  x: z.number().int().min(0).max(BOARD_SIZE - 1),
  y: z.number().int().min(0).max(BOARD_SIZE - 1),
});
export type Coord = z.infer<typeof coordSchema>;

export const gradeSchema = z.enum(GRADES);
export const subjectSlugSchema = z.enum(
  SUBJECT_SLUGS as [string, ...string[]],
);

/* ============================ CLIENT → SERVER ============================ */

export const gameModeSchema = z.enum(["solo", "duo"]);
export type GameMode = z.infer<typeof gameModeSchema>;

export const lobbyCreateSchema = z.object({
  subjectSlug: subjectSlugSchema,
  grade: gradeSchema,
  isPublic: z.boolean(),
  /** Nome amigável da sala (opcional). Default no servidor = "Sala de <host>". */
  name: z.string().min(1).max(40).optional(),
  /** Senha opcional para salas privadas (duo). Exigida no servidor quando isPublic=false. */
  password: z.string().min(4).max(64).optional(),
  /** "solo" = vs machine (machine never attacks); "duo" = PvP. Default duo. */
  mode: gameModeSchema.default("duo"),
});

export const lobbyRenameSchema = z.object({
  roomId: z.string().uuid(),
  name: z.string().min(1).max(40),
});

export const lobbyJoinSchema = z
  .object({
    inviteToken: z.string().min(10).optional(),
    code: z.string().length(6).regex(/^\d{6}$/).optional(),
    roomId: z.string().uuid().optional(),
    /** Senha para entrar em sala privada (quando não se usa código/convite). */
    password: z.string().max(64).optional(),
  })
  .refine((v) => v.inviteToken || v.code || v.roomId, {
    message: "one of inviteToken | code | roomId is required",
  });

export const shipPlacementSchema = z.object({
  id: z.string(),
  length: z.number().int(),
  hits: z.array(z.string()),
  cells: z.array(coordSchema),
});

export const playerBoardSchema = z.object({
  ships: z.array(shipPlacementSchema),
  shots: z.record(z.string(), z.enum(["hit", "miss", "sunk"])),
});

export const gameReadySchema = z.object({ 
  roomId: z.string().uuid(),
  board: playerBoardSchema.optional(),
});

export const gameAnswerSchema = z.object({
  roomId: z.string().uuid(),
  questionId: z.string().uuid(),
  optionId: z.string().uuid(),
});

export const gameAttackSchema = z.object({
  roomId: z.string().uuid(),
  x: coordSchema.shape.x,
  y: coordSchema.shape.y,
});

export const gameAttackIntentSchema = gameAttackSchema;

export const gameUseHintSchema = z.object({ roomId: z.string().uuid() });

export const lobbyGetInviteSchema = z.object({ roomId: z.string().uuid() });
export const lobbyLeaveSchema = z.object({ roomId: z.string().uuid() });

export interface ClientToServerEvents {
  "lobby:create": (p: z.infer<typeof lobbyCreateSchema>) => void;
  "lobby:join": (p: z.infer<typeof lobbyJoinSchema>) => void;
  "lobby:leave": (p: z.infer<typeof lobbyLeaveSchema>) => void;
  "game:ready": (p: z.infer<typeof gameReadySchema>) => void;
  "game:answer": (p: z.infer<typeof gameAnswerSchema>) => void;
  "game:attackIntent": (p: z.infer<typeof gameAttackIntentSchema>) => void;
  "game:attack": (p: z.infer<typeof gameAttackSchema>) => void;
  "game:useHint": (p: z.infer<typeof gameUseHintSchema>) => void;
  "lobby:getInvite": (p: z.infer<typeof lobbyGetInviteSchema>) => void;
  "lobby:list": () => void;
  "lobby:get": (p: z.infer<typeof lobbyGetInviteSchema>) => void;
  "lobby:rename": (p: z.infer<typeof lobbyRenameSchema>) => void;
  "lobby:subscribe": () => void;
  "lobby:unsubscribe": () => void;
}

/* ============================ SERVER → CLIENT ============================ */

/** A question WITHOUT the correct answer. Options carry only id + label. */
export interface PublicQuestion {
  questionId: string;
  prompt: string;
  options: { id: string; label: string }[];
}

export type AttackOutcome = "hit" | "miss" | "sunk";

export interface ServerToClientEvents {
  "lobby:created": (p: { roomId: string; code: string; inviteToken: string }) => void;
  "lobby:invite": (p: { roomId: string; code: string; inviteToken: string }) => void;
  "lobby:updated": (state: PublicRoomState) => void;
  "lobby:listed": (rooms: PublicRoomState[]) => void;
  "game:start": (p: { yourFleetSummary: FleetSummary; turn: string }) => void;
  "game:question": (q: PublicQuestion) => void;
  "game:answerResult": (p: {
    correct: boolean;
    canAttack: boolean;
    hintsAvailable: number;
    correctOptionId?: string;
    selectedOptionId?: string;
  }) => void;
  "game:attackResult": (p: {
    x: number;
    y: number;
    result: AttackOutcome;
    sunk?: string;
  }) => void;
  "game:hintResult": (p: { hint: HintPayload; hintsAvailable: number }) => void;
  "game:state": (state: PublicGameState) => void;
  "game:botAiming": (p: { x: number; y: number }) => void;
  "game:playerAiming": (p: { x: number; y: number }) => void;
  "game:over": (p: { winnerId: string; reason?: string }) => void;
  error: (p: { code: string; message: string }) => void;
}

/* ============================ PUBLIC STATE (no secrets) ============================ */

export interface PublicRoomState {
  roomId: string;
  name: string;
  hostId: string;
  hostName: string;
  guestId: string | null;
  guestName: string | null;
  subjectSlug?: string;
  grade?: string;
  status: "open" | "ready" | "in_game" | "finished" | "abandoned";
  isPublic: boolean;
  mode: "solo" | "duo";
}

/**
 * Mapeia o hash do Redis (tudo string) para PublicRoomState, removendo segredos
 * como passwordHash. Use SEMPRE antes de emitir estado de sala ao cliente.
 */
export function toPublicRoomState(
  r: Record<string, string | undefined>,
): PublicRoomState {
  return {
    roomId: r.roomId ?? "",
    name: r.name && r.name !== "" ? r.name : `Sala #${(r.roomId ?? "").substring(0, 6)}`,
    hostId: r.hostId ?? "",
    hostName: r.hostName || "Jogador",
    guestId: r.guestId && r.guestId !== "" ? r.guestId : null,
    guestName: r.guestName && r.guestName !== "" ? r.guestName : null,
    subjectSlug: r.subjectSlug ?? "",
    grade: r.grade ?? "",
    status: (r.status as PublicRoomState["status"]) || "open",
    isPublic: r.isPublic === "true",
    mode: (r.mode as PublicRoomState["mode"]) || "duo",
  };
}

export interface FleetSummary {
  ships: { id: string; length: number; hits: number; sunk: boolean; cells?: { x: number; y: number }[] }[];
}

/** Only revealed cells (hit/miss) of the enemy board. Ship positions stay server-side. */
export interface PublicGameState {
  roomId: string;
  hostId: string;
  guestId: string | null;
  hostName: string;
  guestName: string | null;
  turn: string;
  hostFleet: FleetSummary;
  guestFleet: FleetSummary;
  hostRevealed: { x: number; y: number; result: AttackOutcome }[];
  guestRevealed: { x: number; y: number; result: AttackOutcome }[];
  enemyRevealed?: { x: number; y: number; result: AttackOutcome }[];
  hostAnswers: number;
  guestAnswers: number;
}

/** A hint is computed server-side; it reveals a partial clue, never the full board. */
export interface HintPayload {
  kind: "row-has-ship" | "col-has-ship" | "near-cell";
  value: number | { x: number; y: number };
}
