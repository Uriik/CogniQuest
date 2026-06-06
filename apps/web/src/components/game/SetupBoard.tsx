"use client";

import { useState, useEffect, useRef } from "react";
import { placeFleetRandom } from "@cogniquest/game-engine";
import { AnimatedShipIcon } from "./AnimatedShipIcons";
import { motion } from "framer-motion";

interface SetupBoardProps {
  onReady: (board: any) => void;
}

export function SetupBoard({ onReady }: SetupBoardProps) {
  const [board, setBoard] = useState<any>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  // true assim que um arraste real começa (framer-motion só dispara onDragStart
  // após cruzar o limiar de movimento). Clique puro nunca marca como arraste.
  const wasDragged = useRef(false);

  useEffect(() => {
    setBoard(placeFleetRandom());
  }, []);

  const handleShuffle = () => {
    setBoard(placeFleetRandom());
  };

  const handleReady = () => {
    if (board) {
      onReady(board);
    }
  };

  const validateFleet = (ships: any[]) => {
    const occupied = new Set<string>();
    for (const ship of ships) {
      for (const cell of ship.cells) {
        if (cell.x < 0 || cell.x > 9 || cell.y < 0 || cell.y > 9) return false;
        const key = `${cell.x},${cell.y}`;
        if (occupied.has(key)) return false;
        occupied.add(key);
      }
    }
    return true;
  };

  const handleDragEnd = (ship: any, event: any, info: any) => {
    if (!boardRef.current) return;
    const boardRect = boardRef.current.getBoundingClientRect();
    const cellSize = boardRect.width / 10;
    
    const deltaX = Math.round(info.offset.x / cellSize);
    const deltaY = Math.round(info.offset.y / cellSize);
    
    // Process move
    setBoard((prev: any) => {
      const newShips = prev.ships.map((s: any) => {
        if (s.id === ship.id) {
          const newCells = s.cells.map((c: any) => ({ x: c.x + deltaX, y: c.y + deltaY }));
          return { ...s, cells: newCells };
        }
        return s;
      });
      if (validateFleet(newShips)) return { ...prev, ships: newShips };
      return prev; // Revert to previous valid board (key change will reset visual position)
    });
  };

  const handleRotate = (ship: any) => {
    setBoard((prev: any) => {
      const newShips = prev.ships.map((s: any) => {
        if (s.id === ship.id && s.cells.length > 1) {
          const startX = s.cells[0].x;
          const startY = s.cells[0].y;
          const isHorizontal = s.cells[0].y === s.cells[1].y;
          
          const newCells = s.cells.map((_: any, i: number) => ({
             x: isHorizontal ? startX : startX + i,
             y: isHorizontal ? startY + i : startY
          }));
          return { ...s, cells: newCells };
        }
        return s;
      });
      if (validateFleet(newShips)) return { ...prev, ships: newShips };
      return prev;
    });
  };

  if (!board) return <div className="text-center p-10">Preparando frota...</div>;

  const cols = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

  return (
    <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-2xl mx-auto mt-8">
      <div className="text-center">
        <h2 className="text-3xl font-black text-white tracking-widest uppercase mb-2" style={{ textShadow: "0 0 10px rgba(0,255,255,0.8)" }}>
          Posicione Sua Frota
        </h2>
        <p className="text-gray-400">Verifique a posição dos seus navios antes do combate iniciar.</p>
      </div>

      <div className="game-board-panel relative w-full max-w-md p-4">
        <div className="battleship-board-container" style={{ position: 'relative' }}>
          <div className="cols-header-row">
            {cols.map((c) => (
              <div key={c} className="col-header-cell">{c}</div>
            ))}
          </div>

          <div className="board-middle-row">
            <div className="rows-header-column">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => (
                <div key={r} className="row-header-cell">{r}</div>
              ))}
            </div>

            <div 
              ref={boardRef}
              className="board-cells-box relative aspect-square bg-[#0a192f] border-2 border-cyan-500 rounded-sm"
            >
              <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 pointer-events-none">
                {Array.from({ length: 100 }).map((_, i) => (
                  <div key={i} className="border border-cyan-900/30" />
                ))}
              </div>

              {/* Navios da Frota */}
              {board.ships.map((ship: any) => {
                const cells = ship.cells;
                if (!cells || cells.length === 0) return null;
                const isHorizontal = cells.length > 1 && cells[0]!.y === cells[1]!.y;
                
                const startX = Math.min(...cells.map((c: any) => c.x));
                const startY = Math.min(...cells.map((c: any) => c.y));
                
                const top = `${startY * 10}%`;
                const left = `${startX * 10}%`;
                const width = isHorizontal ? `${ship.length * 10}%` : `10%`;
                const height = isHorizontal ? `10%` : `${ship.length * 10}%`;

                let iconType: 'submarine' | 'destroyer' | 'cruiser' = 'submarine';
                if (ship.id.includes("destroyer")) iconType = 'destroyer';
                if (ship.id.includes("cruiser")) iconType = 'cruiser';

                const uniqueKey = `setup-${ship.id}-${startX}-${startY}-${isHorizontal ? 'h' : 'v'}`;

                return (
                  <motion.div
                    key={uniqueKey}
                    drag
                    dragMomentum={false}
                    dragSnapToOrigin
                    onPointerDown={() => { wasDragged.current = false; }}
                    onDragStart={() => { wasDragged.current = true; }}
                    onDragEnd={(e, info) => handleDragEnd(ship, e, info)}
                    onClick={() => {
                      // Só roda no clique puro; se houve arraste, ignora.
                      if (!wasDragged.current) handleRotate(ship);
                    }}
                    whileHover={{ scale: 1.05, filter: "brightness(1.2)" }}
                    whileDrag={{ scale: 1.1, zIndex: 50, opacity: 0.8 }}
                    className="absolute flex items-center justify-center cursor-grab active:cursor-grabbing"
                    style={{ top, left, width, height, zIndex: 20 }}
                  >
                    <div className={`w-full h-full flex ${isHorizontal ? 'flex-row' : 'flex-col'} items-center justify-center pointer-events-none`}>
                      <AnimatedShipIcon type={iconType} length={ship.length} isHorizontal={isHorizontal} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex space-x-6 w-full max-w-md">
        <button 
          onClick={handleShuffle}
          className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg border border-gray-600 transition-all uppercase tracking-widest text-sm"
        >
          Embaralhar
        </button>
        <button 
          onClick={handleReady}
          className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-lg border border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.4)] transition-all uppercase tracking-widest text-sm"
        >
          Jogar
        </button>
      </div>
    </div>
  );
}
