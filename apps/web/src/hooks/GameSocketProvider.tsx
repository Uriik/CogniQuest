"use client";

import { createContext, useContext } from "react";
import { useGameSocketState } from "./useGameSocket";

type GameSocketValue = ReturnType<typeof useGameSocketState>;

const GameSocketContext = createContext<GameSocketValue | null>(null);

/**
 * Mantém UMA instância do socket (e dos listeners/estado do jogo) viva enquanto
 * o usuário permanece na área protegida. Como vive no layout, NÃO é desmontado a
 * cada navegação entre páginas — o socket sobrevive ao ir de /lobby -> /lobby/create
 * -> /game/:id, eliminando a janela "sem socket" que derrubava salas recém-criadas
 * e o churn de reconexão a cada troca de tela.
 */
export function GameSocketProvider({ children }: { children: React.ReactNode }) {
  const value = useGameSocketState();
  return (
    <GameSocketContext.Provider value={value}>
      {children}
    </GameSocketContext.Provider>
  );
}

/** Consome a instância compartilhada do socket. Use dentro do GameSocketProvider. */
export function useGameSocket(): GameSocketValue {
  const ctx = useContext(GameSocketContext);
  if (!ctx) {
    throw new Error("useGameSocket precisa estar dentro de <GameSocketProvider>");
  }
  return ctx;
}
