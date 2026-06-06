"use client";

import { FleetSummary, PublicGameState, AttackOutcome } from "@cogniquest/shared";
import { AnimatedShipIcon } from "./AnimatedShipIcons";

interface FleetStatusPanelProps {
  myFleet: FleetSummary | null;
  gameState?: PublicGameState | null;
  enemyRevealed?: { x: number; y: number; result: AttackOutcome }[];
  myAnswers?: number;
  onExit: () => void;
  onHint: () => void;
}

export function FleetStatusPanel({ myFleet, gameState, enemyRevealed, myAnswers = 0, onExit, onHint }: FleetStatusPanelProps) {
  
  // Calculate overall fleet health to represent "Mission Progress"
  const totalShips = myFleet?.ships.length || 0;
  const totalSize = myFleet?.ships.reduce((acc, s) => acc + s.length, 0) || 1;
  const totalHits = myFleet?.ships.reduce((acc, s) => acc + s.hits, 0) || 0;
  const healthPercent = Math.max(0, Math.floor(((totalSize - totalHits) / totalSize) * 100));

  const hits = enemyRevealed?.filter(o => o.result === 'hit' || o.result === 'sunk').length || 0;
  const misses = enemyRevealed?.filter(o => o.result === 'miss').length || 0;

  return (
    <aside className="game-side-panels">
      <div className="game-control-panel">
        <div className="panel-header-row">
          <h3 className="panel-headline">Missions</h3>
          <span className="panel-dot-menu">•••</span>
        </div>
        
        <div className="missions-content">
          <div className="mission-details">
            <div className="mission-info">
              <span className="mission-label">Current</span>
              <span className="mission-name">Defend Sector A</span>
            </div>
            <div className="mission-progress-ring">
              <span className="ring-percentage">{healthPercent}%</span>
            </div>
          </div>

          <div className="control-group">
            <label className="text-xs text-[var(--text-muted)] font-semibold uppercase mb-1 block">Progress</label>
            <div className="card-progress-bar"><div className="progress-fill" style={{ width: `${healthPercent}%` }}></div></div>
          </div>

          <div className="control-group">
            <label className="text-xs text-[var(--text-muted)] font-semibold uppercase mb-1 block">Estatísticas do Duelo</label>
            <div className="stats-grid">
              <div className="stat-row">
                <span>Questões Respondidas:</span>
                <span>{myAnswers}</span>
              </div>
              <div className="stat-row">
                <span>Acertos:</span>
                <span style={{ color: "var(--success)" }}>{hits}</span>
              </div>
              <div className="stat-row">
                <span>Erros:</span>
                <span style={{ color: "var(--error)" }}>{misses}</span>
              </div>
            </div>
          </div>

          <div className="mission-action-icons">
            <button className="action-circle-btn active-purple" title="Voltar ao Início" onClick={onExit}>
              <span>🏠</span>
            </button>
            <button className="action-circle-btn active-cyan" title="Dica Rápida" onClick={onHint}>
              <span>🧠</span>
            </button>
            <button className="action-circle-btn" title="Tutorial">
              <span>ℹ️</span>
            </button>
          </div>
        </div>
      </div>

      <div className="game-control-panel fleet-status-panel">
        <div className="panel-header-row">
          <h3 className="panel-headline">Fleet Status</h3>
          <span className="panel-dot-menu">•••</span>
        </div>

        <div className="fleet-list">
          {myFleet?.ships.map((ship, index) => {
            let status = "Ready";
            let statusClass = "status-ready";
            let ringClass = "ring-ready";
            let icon = "🚢";
            
            if (ship.hits > 0 && ship.hits < ship.length) {
              status = "Em Combate";
              statusClass = "status-active";
              ringClass = "ring-active";
            } else if (ship.hits >= ship.length) {
              status = "Destruído";
              statusClass = "status-deployed"; // Red color
              ringClass = "ring-deployed";
              icon = "💥";
            }

            let iconType: 'submarine' | 'destroyer' | 'cruiser' = 'submarine';
            if (ship.id.includes("destroyer")) iconType = 'destroyer';
            if (ship.id.includes("cruiser")) iconType = 'cruiser';

            let displayName = ship.id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
            if (ship.id.startsWith("sub")) displayName = ship.id.replace("sub", "Submarino").replace(/_/g, " ");

            return (
              <div key={index} className="fleet-item">
                <div className="fleet-icon w-16 h-8 flex items-center justify-center overflow-hidden">
                  <AnimatedShipIcon type={iconType} length={ship.length} isHorizontal={true} />
                </div>
                <div className="fleet-info">
                  <span className="fleet-name">{displayName}</span>
                  <span className={`fleet-status ${statusClass}`}>{status}</span>
                </div>
                <div className={`fleet-progress-ring ${ringClass}`}></div>
              </div>
            );
          })}
          {!myFleet && <div className="text-xs text-center text-gray-500">Waiting for fleet deployment...</div>}
        </div>
      </div>
    </aside>
  );
}
