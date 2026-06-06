"use client";

import { useState } from "react";
import { PublicGameState, AttackOutcome, FleetSummary } from "@cogniquest/shared";
import { AnimatedShipIcon } from "./AnimatedShipIcons";

interface RadarPanelProps {
  gameState: PublicGameState | null;
  revealed: { x: number; y: number; result: AttackOutcome }[];
  fleet?: FleetSummary | null;
  botAiming?: { x: number; y: number } | null;
  onAttack: (x: number, y: number) => void;
  isMyTurn: boolean;
}

export function RadarPanel({ gameState, revealed, fleet, botAiming, onAttack, isMyTurn }: RadarPanelProps) {
  const [hoveredCell, setHoveredCell] = useState<{x: number, y: number} | null>(null);

  const getCellState = (x: number, y: number) => {
    if (!gameState) return null;
    return revealed.find(o => o.x === x && o.y === y);
  };

  const renderCells = () => {
    const cells = [];
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const outcome = getCellState(x, y);
        let cellClass = "grid-cell";
        
        if (outcome) {
          if (outcome.result === "hit" || outcome.result === "sunk") {
            cellClass += " hit";
          } else {
            cellClass += " miss";
          }
        }

        cells.push(
          <div 
            key={`${x}-${y}`} 
            className={cellClass}
            onClick={() => {
              if (isMyTurn && !outcome) {
                onAttack(x, y);
              }
            }}
            onMouseEnter={() => setHoveredCell({ x, y })}
            onMouseLeave={() => setHoveredCell(null)}
          >
            {outcome?.result === "hit" && (
              <div className="flex items-center justify-center w-full h-full animate-pulse">
                <span style={{ fontSize: '1.5rem', textShadow: '0 0 10px #f00, 0 0 20px #f00' }}>💥</span>
              </div>
            )}
            {outcome?.result === "sunk" && (
              <div className="flex items-center justify-center w-full h-full animate-pulse">
                <span style={{ fontSize: '1.5rem', textShadow: '0 0 10px #f00, 0 0 20px #f00' }}>💥</span>
              </div>
            )}
            {outcome?.result === "miss" && (
              <div className="flex items-center justify-center w-full h-full opacity-60">
                <span style={{ fontSize: '1.5rem', textShadow: '0 0 10px #0ff, 0 0 20px #0ff' }}>🌊</span>
              </div>
            )}
          </div>
        );
      }
    }
    return cells;
  };

  const cols = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

  return (
    <div className="game-board-panel">
      <div className="board-header">
        <div>
          <h2 className="board-title">{isMyTurn ? "RADAR DE ATAQUE" : "SUA BASE NAVAL"}</h2>
          <div className="telemetry-row">
            <span className="telemetry-item">{isMyTurn ? "Sector 7G" : "Defesa Ativa"}</span>
            <span className="telemetry-divider">|</span>
            {gameState ? (
              <>
                <span className="telemetry-item active-telemetry">
                  [1] {gameState.hostName}: <span className="font-bold text-[var(--accent)]">{gameState.guestFleet?.ships.reduce((acc: any, s: any) => acc + s.hits, 0) || 0} pts</span>
                </span>
                <span className="telemetry-divider">|</span>
                <span className="telemetry-item active-telemetry">
                  [2] {gameState.guestName || "Aguardando"}: <span className="font-bold text-red-400">{gameState.hostFleet?.ships.reduce((acc: any, s: any) => acc + s.hits, 0) || 0} pts</span>
                </span>
              </>
            ) : (
              <span className="telemetry-item active-telemetry">Iniciando Varredura...</span>
            )}
          </div>
        </div>
        <div className="status-indicator">
          {isMyTurn ? "Seu Turno - Selecione o Alvo" : "Turno do Inimigo - Preparar Impacto"}
        </div>
      </div>

      <div className="battleship-board-container">
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

          <div className={`board-cells-box relative ${botAiming ? 'board-shake' : ''}`}>
            <div className="floating-ship-bg" style={{ backgroundImage: "url('/naval_cover.png')" }}></div>
            <div className="radar-sweep"></div>
            <div className="board-grid-area">
              {renderCells()}
            </div>
            {/* Navios Neon em Overlay */}
            {fleet?.ships?.map((ship) => {
              if (!ship.cells || ship.cells.length === 0) return null;
              const cells = ship.cells;
              // Determina orientation
              const isHorizontal = cells.length > 1 && cells[0]!.y === cells[1]!.y;
              
              const startX = Math.min(...cells.map(c => c.x));
              const startY = Math.min(...cells.map(c => c.y));
              
              // Calcula porcentagem do grid (cada cell é 10%)
              const top = `${startY * 10}%`;
              const left = `${startX * 10}%`;
              const width = isHorizontal ? `${ship.length * 10}%` : `10%`;
              const height = isHorizontal ? `10%` : `${ship.length * 10}%`;
              
              // Opacidade baseada na porcentagem de hits (Se não for meu turno, os navios ficam sempre visíveis pois é a minha base)
              const hitRatio = ship.hits / ship.length;
              let opacity = hitRatio > 0 ? 0.3 + (hitRatio * 0.7) : 0;
              if (!isMyTurn) opacity = 1; // Na minha base eu sempre vejo meus navios
              if (opacity === 0) return null; // invisível ainda

              let iconType: 'submarine' | 'destroyer' | 'cruiser' = 'submarine';
              if (ship.id.includes("destroyer")) iconType = 'destroyer';
              if (ship.id.includes("cruiser")) iconType = 'cruiser';

              return (
                <div 
                  key={`overlay-${ship.id}`}
                  className="absolute pointer-events-none flex items-center justify-center"
                  style={{
                    top, left, width, height,
                    opacity,
                    transition: 'opacity 1s ease-in-out',
                    zIndex: 20
                  }}
                >
                  <div className={`w-full h-full flex ${isHorizontal ? 'flex-row' : 'flex-col'} items-center justify-center`}>
                    <AnimatedShipIcon type={iconType} length={ship.length} isHorizontal={isHorizontal} />
                  </div>
                </div>
              );
            })}

            {/* Ataque do Oponente: míssil voa de fora até a célula, trava a mira e explode */}
            {botAiming && (
              <div
                key={`atk-${botAiming.x}-${botAiming.y}`}
                className="bot-attack-layer"
                style={{
                  top: `${botAiming.y * 10}%`,
                  left: `${botAiming.x * 10}%`,
                }}
              >
                {/* Impacto: onda de choque + flash (disparam após o míssil chegar) */}
                <div className="bot-shockwave" />
                <div className="bot-impact-flash" />

                {/* Mira (crosshair) que trava no alvo */}
                <svg className="bot-crosshair" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="10 15" />
                  <line x1="50" y1="2" x2="50" y2="98" stroke="currentColor" strokeWidth="2" />
                  <line x1="2" y1="50" x2="98" y2="50" stroke="currentColor" strokeWidth="2" />
                  <circle cx="50" cy="50" r="5" fill="currentColor" />
                </svg>

                {/* Míssil que chega de fora do tabuleiro */}
                <div className="bot-missile" />
              </div>
            )}
          </div>
        </div>

        <div className="cols-header-row bottom-row-labels">
          {cols.map((c) => (
            <div key={c} className="col-header-cell">{c}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
