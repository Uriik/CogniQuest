/**
 * Pure Battleship engine (PvP, server-authoritative).
 *
 * No I/O. Deterministic given an injected RNG, so it is fully testable.
 * Ship positions live here on the server only — they are NEVER serialized to a
 * client. The web client only ever sees revealed hit/miss cells.
 */
import {
  BOARD_SIZE,
  FLEET,
  TOTAL_SEGMENTS,
  type AttackOutcome,
  type HintPayload,
  type ShipId,
} from "@cogniquest/shared";

export type Orientation = "h" | "v";

export interface PlacedShip {
  id: ShipId;
  length: number;
  cells: { x: number; y: number }[];
  hits: string[]; // "x,y"
}

export interface PlayerBoard {
  ships: PlacedShip[];
  /** Cells already fired upon by the opponent (key "x,y"). */
  shots: Record<string, AttackOutcome>;
}

const key = (x: number, y: number) => `${x},${y}`;

/** RNG contract — inject a seeded RNG in tests, Math.random in production. */
export type Rng = () => number;

const randInt = (rng: Rng, maxExclusive: number) =>
  Math.floor(rng() * maxExclusive);

/**
 * Randomly place the full fleet on an empty board, with no overlaps and inside
 * bounds. Throws only if it cannot place after many attempts (should not happen
 * on a 10x10 with this fleet).
 */
export function placeFleetRandom(rng: Rng = Math.random): PlayerBoard {
  const occupied = new Set<string>();
  const ships: PlacedShip[] = [];

  for (const ship of FLEET) {
    let placed = false;
    for (let attempt = 0; attempt < 1000 && !placed; attempt++) {
      const orientation: Orientation = rng() < 0.5 ? "h" : "v";
      const maxX =
        orientation === "h" ? BOARD_SIZE - ship.length : BOARD_SIZE - 1;
      const maxY =
        orientation === "v" ? BOARD_SIZE - ship.length : BOARD_SIZE - 1;
      const x0 = randInt(rng, maxX + 1);
      const y0 = randInt(rng, maxY + 1);

      const cells: { x: number; y: number }[] = [];
      for (let i = 0; i < ship.length; i++) {
        const x = orientation === "h" ? x0 + i : x0;
        const y = orientation === "v" ? y0 + i : y0;
        cells.push({ x, y });
      }
      if (cells.some((c) => occupied.has(key(c.x, c.y)))) continue;

      cells.forEach((c) => occupied.add(key(c.x, c.y)));
      ships.push({
        id: ship.id,
        length: ship.length,
        cells,
        hits: [],
      });
      placed = true;
    }
    if (!placed) throw new Error(`could not place ship ${ship.id}`);
  }

  return { ships, shots: {} };
}

/**
 * Resolve an attack on `board` at (x,y). Mutates the board's shot/hit state.
 * Returns the outcome and the sunk ship id when a ship is fully destroyed.
 * Re-firing the same cell returns the previously recorded outcome.
 */
export function resolveAttack(
  board: PlayerBoard,
  x: number,
  y: number,
): { result: AttackOutcome; sunk?: ShipId } {
  const k = key(x, y);
  const prev = board.shots[k];
  if (prev) return { result: prev };

  const ship = board.ships.find((s) =>
    s.cells.some((c) => c.x === x && c.y === y),
  );

  if (!ship) {
    board.shots[k] = "miss";
    return { result: "miss" };
  }

  if (!ship.hits.includes(k)) ship.hits.push(k);
  const sunk = ship.hits.length === ship.length;
  const result: AttackOutcome = sunk ? "sunk" : "hit";
  board.shots[k] = result;
  return sunk ? { result, sunk: ship.id } : { result };
}

/** A board is defeated when every segment of every ship has been hit. */
export function isFleetDestroyed(board: PlayerBoard): boolean {
  const hits = board.ships.reduce((n, s) => n + s.hits.length, 0);
  return hits === TOTAL_SEGMENTS;
}

export interface FleetSummary {
  ships: { id: string; length: number; hits: number; sunk: boolean }[];
}

export function fleetSummary(board: PlayerBoard): FleetSummary {
  return {
    ships: board.ships.map((s) => ({
      id: s.id,
      length: s.length,
      hits: s.hits.length,
      sunk: s.hits.length === s.length,
      cells: s.cells
    })),
  };
}

/**
 * Compute a server-side hint over the ENEMY board. Reveals only a partial clue
 * (a row/column that contains an unsunk ship cell, or a cell near an existing
 * hit) — never the full layout. Returns null if nothing useful to reveal.
 */
export function computeHint(enemyBoard: PlayerBoard, rng: Rng = Math.random): HintPayload | null {
  const liveCells: { x: number; y: number }[] = [];
  for (const s of enemyBoard.ships) {
    for (const c of s.cells) {
      if (!s.hits.includes(key(c.x, c.y))) liveCells.push(c);
    }
  }
  if (liveCells.length === 0) return null;

  const pick = liveCells[randInt(rng, liveCells.length)]!;
  const kind = rng() < 0.5 ? "row-has-ship" : "col-has-ship";
  return {
    kind,
    value: kind === "row-has-ship" ? pick.y : pick.x,
  };
}
