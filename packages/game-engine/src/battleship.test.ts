import { describe, expect, it } from "vitest";
import { BOARD_SIZE, FLEET, TOTAL_SEGMENTS } from "@cogniquest/shared";
import {
  fleetSummary,
  isFleetDestroyed,
  placeFleetRandom,
  resolveAttack,
  type Rng,
} from "./battleship.js";

/** Deterministic LCG RNG for reproducible tests. */
function seeded(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("placeFleetRandom", () => {
  it("places every ship inside bounds with no overlap", () => {
    const board = placeFleetRandom(seeded(42));
    expect(board.ships).toHaveLength(FLEET.length);

    const occupied = new Set<string>();
    for (const ship of board.ships) {
      expect(ship.cells).toHaveLength(ship.length);
      for (const c of ship.cells) {
        expect(c.x).toBeGreaterThanOrEqual(0);
        expect(c.x).toBeLessThan(BOARD_SIZE);
        expect(c.y).toBeGreaterThanOrEqual(0);
        expect(c.y).toBeLessThan(BOARD_SIZE);
        const k = `${c.x},${c.y}`;
        expect(occupied.has(k)).toBe(false); // no overlap
        occupied.add(k);
      }
    }
    expect(occupied.size).toBe(TOTAL_SEGMENTS);
  });
});

describe("resolveAttack", () => {
  it("returns miss on empty water and is idempotent", () => {
    const board = placeFleetRandom(seeded(7));
    // find a cell with no ship
    const occupied = new Set(
      board.ships.flatMap((s) => s.cells.map((c) => `${c.x},${c.y}`)),
    );
    let target = { x: 0, y: 0 };
    outer: for (let x = 0; x < BOARD_SIZE; x++)
      for (let y = 0; y < BOARD_SIZE; y++)
        if (!occupied.has(`${x},${y}`)) {
          target = { x, y };
          break outer;
        }

    expect(resolveAttack(board, target.x, target.y).result).toBe("miss");
    // firing again returns same outcome, no double count
    expect(resolveAttack(board, target.x, target.y).result).toBe("miss");
  });

  it("hits, then sinks a ship when all its cells are hit", () => {
    const board = placeFleetRandom(seeded(7));
    const ship = board.ships[0]!;
    const last = ship.cells.length - 1;
    for (let i = 0; i < last; i++) {
      const c = ship.cells[i]!;
      expect(resolveAttack(board, c.x, c.y).result).toBe("hit");
    }
    const lastCell = ship.cells[last]!;
    const out = resolveAttack(board, lastCell.x, lastCell.y);
    expect(out.result).toBe("sunk");
    expect(out.sunk).toBe(ship.id);
  });
});

describe("isFleetDestroyed", () => {
  it("is true only after every segment is hit", () => {
    const board = placeFleetRandom(seeded(99));
    expect(isFleetDestroyed(board)).toBe(false);
    for (const ship of board.ships)
      for (const c of ship.cells) resolveAttack(board, c.x, c.y);
    expect(isFleetDestroyed(board)).toBe(true);
    expect(fleetSummary(board).ships.every((s) => s.sunk)).toBe(true);
  });
});
