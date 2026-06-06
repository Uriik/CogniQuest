"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { initSocket, GameSocket, disconnectSocket } from "../lib/socket";
import { PublicRoomState, FleetSummary, PublicGameState, PublicQuestion, HintPayload, AttackOutcome } from "@cogniquest/shared";

export function useGameSocket() {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<GameSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomState, setRoomState] = useState<PublicRoomState | null>(null);
  const [gameState, setGameState] = useState<PublicGameState | null>(null);
  const [myFleet, setMyFleet] = useState<FleetSummary | null>(null);
  const [enemyFleet, setEnemyFleet] = useState<FleetSummary | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<PublicQuestion | null>(null);
  const [hintsAvailable, setHintsAvailable] = useState(0);
  const [error, setError] = useState<{code: string, message: string} | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<{code: string, inviteToken: string} | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState<{ correctOptionId?: string, selectedOptionId?: string, correct: boolean } | null>(null);
  const [enemyRevealed, setEnemyRevealed] = useState<{ x: number; y: number; result: AttackOutcome }[]>([]);
  const [myRevealed, setMyRevealed] = useState<{ x: number; y: number; result: AttackOutcome }[]>([]);
  const [myAnswers, setMyAnswers] = useState(0);
  const [botAiming, setBotAiming] = useState<{x: number, y: number} | null>(null);
  const [publicRooms, setPublicRooms] = useState<PublicRoomState[]>([]);

  useEffect(() => {
    const token = (session as any)?.accessToken;
    if (!token) return;

    let cancelled = false;

    (async () => {
      const s = await initSocket(token);
      if (cancelled) return;
      setSocket(s);

      s.on("connect", () => setIsConnected(true));
      s.on("disconnect", () => setIsConnected(false));
      s.on("connect_error", (err) => {
        setError({ code: 'CONNECT_ERROR', message: err.message });
        if (err.message.includes('Invalid token') || err.message.includes('Missing token')) {
          signOut({ callbackUrl: '/login' });
        }
      });
      
      s.on("lobby:updated", (state) => setRoomState(state));
      s.on("lobby:listed", (rooms) => setPublicRooms(rooms));
      s.on("lobby:invite", (info) => setInviteInfo(info));
      s.on("game:start", ({ turn }) => {
        setGameState(prev => prev ? { ...prev, turn } : null);
      });
      s.on("game:question", (q) => setCurrentQuestion(q));
      s.on("game:answerResult", ({ correct, hintsAvailable, correctOptionId, selectedOptionId }) => {
        setHintsAvailable(hintsAvailable);
        setAnswerFeedback({ correct, correctOptionId, selectedOptionId });
        
        setTimeout(() => {
          setAnswerFeedback(null);
          setCurrentQuestion(null);
        }, 400);
      });
      s.on("game:attackResult", (outcome) => {
        // Ignore incremental attackResult updates since `game:state` handles full sync now
      });
      
      s.on("game:botAiming", (coords) => {
        setBotAiming(coords);
        setTimeout(() => setBotAiming(null), 1500);
      });

      s.on("game:state", (state: any) => {
        const isHost = session?.user?.id === state.hostId;
        const myF = isHost ? state.hostFleet : state.guestFleet;
        const enemyF = isHost ? state.guestFleet : state.hostFleet;
        const enemyRev = isHost ? state.guestRevealed : state.hostRevealed;
        const myRev = isHost ? state.hostRevealed : state.guestRevealed;
        const myAns = isHost ? state.hostAnswers : state.guestAnswers;
        
        setMyFleet(myF);
        setEnemyFleet(enemyF);
        setEnemyRevealed(enemyRev || []);
        setMyRevealed(myRev || []);
        setMyAnswers(myAns || 0);
        setGameState(state);
      });
      s.on("game:over", ({ winnerId }) => setWinnerId(winnerId));
      s.on("error", (err) => setError(err));

      s.connect();
    })();

    return () => {
      cancelled = true;
      s.off("connect");
      s.off("disconnect");
      s.off("connect_error");
      s.off("lobby:updated");
      s.off("lobby:listed");
      s.off("lobby:invite");
      s.off("game:start");
      s.off("game:question");
      s.off("game:answerResult");
      s.off("game:attackResult");
      s.off("game:hintResult");
      s.off("game:state");
      s.off("game:over");
      s.off("error");
    };
  }, [(session as any)?.accessToken]);

  const isMyTurn = Boolean(gameState?.turn && session?.user?.id && gameState.turn === session.user.id);

  // Pede ao servidor a lista de salas públicas abertas.
  const refreshRooms = useCallback(() => {
    socket?.emit("lobby:list");
  }, [socket]);

  return {
    socket,
    isConnected,
    roomState,
    publicRooms,
    refreshRooms,
    gameState,
    myFleet,
    enemyFleet,
    currentQuestion,
    hintsAvailable,
    isMyTurn,
    error,
    winnerId,
    inviteInfo,
    answerFeedback,
    enemyRevealed,
    myRevealed,
    botAiming,
    myAnswers,
  };
}
