"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameSocket } from "../../../../hooks/useGameSocket";
import { RadarPanel } from "../../../../components/game/RadarPanel";
import { FleetStatusPanel } from "../../../../components/game/FleetStatusPanel";
import { QuestionModal } from "../../../../components/game/QuestionModal";
import { SetupBoard } from "../../../../components/game/SetupBoard";

export default function GamePage({ params }: { params: { roomId: string } }) {
  const router = useRouter();
  const { 
    socket, 
    roomState,
    gameState, 
    myFleet, 
    currentQuestion, 
    isMyTurn, 
    winnerId,
    error,
    inviteInfo,
    answerFeedback,
    enemyRevealed,
    myRevealed,
    activeAttack,
    surrendered,
    myAnswers,
    enemyFleet
  } = useGameSocket();

  const [isSetupDone, setIsSetupDone] = useState(false);
  const [turnAnnouncement, setTurnAnnouncement] = useState<string | null>(null);

  // Removido o auto game:ready. O SetupBoard agora emite o game:ready.
  useEffect(() => {
    if (roomState?.status === 'in_game') {
      setIsSetupDone(true);
    }
  }, [roomState?.status]);

  useEffect(() => {
    if (roomState?.status === 'in_game' && gameState) {
      setTurnAnnouncement(isMyTurn ? "SUA VEZ" : "TURNO DO INIMIGO");
      const t = setTimeout(() => setTurnAnnouncement(null), 2000);
      return () => clearTimeout(t);
    }
  }, [isMyTurn, roomState?.status, gameState?.turn]);

  // Sincroniza o estado da sala ao montar (o socket é singleton e o
  // lobby:updated inicial já foi consumido na página anterior). Sem isso, o
  // host caía direto no setup antes do oponente entrar.
  useEffect(() => {
    if (!socket) return;
    const sync = () => socket.emit("lobby:get", { roomId: params.roomId });
    if (socket.connected) sync();
    socket.on("connect", sync);
    return () => {
      socket.off("connect", sync);
    };
  }, [socket, params.roomId]);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const handleGetInvite = () => {
    if (socket) {
      socket.emit("lobby:getInvite", { roomId: params.roomId });
    }
  };

  const startEditName = () => {
    setNameDraft(roomState?.name || "");
    setEditingName(true);
  };

  const handleRename = () => {
    const name = nameDraft.trim();
    if (socket && name) {
      socket.emit("lobby:rename", { roomId: params.roomId, name });
    }
    setEditingName(false);
  };

  const copyInvite = () => {
    if (inviteInfo) {
      const inviteUrl = `${window.location.origin}/lobby/join?token=${inviteInfo.inviteToken}`;
      navigator.clipboard.writeText(inviteUrl);
      alert("Convite copiado para a área de transferência!");
    }
  };

  const handleAttackIntent = (x: number, y: number) => {
    if (socket && isMyTurn) {
      socket.emit("game:attackIntent", { roomId: params.roomId, x, y });
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    if (socket) {
      socket.emit("game:answer", { roomId: params.roomId, questionId, optionId: answer });
    }
  };

  const handleExit = () => {
    if (socket) {
      socket.emit("lobby:leave", { roomId: params.roomId });
    }
    router.push("/dashboard");
  };

  const handleHint = () => {
    // Need backend support for game:hint
    console.log("Hint requested");
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
        <h2 className="text-2xl text-error font-bold">Erro de Conexão</h2>
        <p className="text-[var(--text-muted)]">{error.message}</p>
        <button className="start-match-btn max-w-xs" onClick={handleExit}>Voltar ao Início</button>
      </div>
    );
  }

  if (winnerId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
        <h2 className="text-4xl text-[var(--primary)] font-bold mb-4">Partida Finalizada</h2>
        <p className="text-xl">Vencedor: {winnerId === gameState?.roomId ? "Máquina" : winnerId}</p>
        <button className="start-match-btn max-w-xs mt-8" onClick={handleExit}>Voltar ao Início</button>
      </div>
    );
  }

  if (surrendered) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
        <h2 className="text-4xl text-[var(--primary)] font-bold mb-4">Vitória por Desistência!</h2>
        <p className="text-xl">Oponente se rendeu, deixou a partida.</p>
        <button className="start-match-btn max-w-xs mt-8" onClick={handleExit}>Voltar ao Início</button>
      </div>
    );
  }

  if (!gameState && roomState?.mode === 'duo' && !roomState.guestId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
        <div className="hud-blip-ring" style={{ width: 64, height: 64, position: 'relative', margin: '0 auto' }}></div>
        <h2 className="text-3xl text-[var(--primary)] font-bold">Aguardando Oponente...</h2>

        {/* Nome da sala (editável pelo host) */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Sala</span>
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameDraft}
                maxLength={40}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setEditingName(false); }}
                className="bg-[rgba(0,10,30,0.5)] border border-[rgba(0,255,255,0.3)] rounded px-3 py-1 text-white text-center text-lg"
              />
              <button className="start-match-btn !w-auto !py-1 !px-4 text-sm" onClick={handleRename}>Salvar</button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-white">{roomState?.name}</span>
              <button
                className="text-sm text-[var(--primary)] underline hover:opacity-80"
                onClick={startEditName}
              >
                editar
              </button>
            </div>
          )}
        </div>

        <p className="text-[var(--text-muted)] max-w-md">
          A sua frota já está a postos. Aguarde a conexão de outro jogador para iniciar a partida.
          Passe o nome da sala ou o código abaixo para o seu colega.
        </p>

        <div className="mt-8 p-6 bg-[rgba(0,10,30,0.5)] border border-[rgba(0,255,255,0.2)] rounded-lg flex flex-col gap-4 items-center">
          <h3 className="text-xl">Convide um amigo</h3>
          {!inviteInfo ? (
            <button className="start-match-btn text-sm" onClick={handleGetInvite}>
              Gerar Link de Convite
            </button>
          ) : (
            <div className="flex flex-col gap-3 items-center">
              <div className="bg-[rgba(0,0,0,0.5)] px-4 py-2 rounded text-2xl tracking-[0.2em] font-mono text-[var(--primary)]">
                {inviteInfo.code}
              </div>
              <p className="text-sm text-[var(--text-muted)]">Ou copie o link direto:</p>
              <button className="start-match-btn text-sm w-full" onClick={copyInvite}>
                Copiar Link
              </button>
            </div>
          )}
        </div>
        
        <button className="setup-age-btn mt-4" onClick={handleExit}>Sair da Sala</button>
      </div>
    );
  }

  // Renderiza a fase de Setup antes do jogo começar
  if (!isSetupDone && roomState?.status !== 'in_game') {
    return (
      <div className="min-h-screen bg-[#020813] pt-20">
        <SetupBoard onReady={(board) => {
          if (socket) {
            socket.emit("game:ready", { roomId: params.roomId, board });
            setIsSetupDone(true);
          }
        }} />
      </div>
    );
  }

  // Renderiza tela de aguardando oponente após dar Ready
  if (isSetupDone && roomState?.status !== 'in_game') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] w-full text-center p-4">
        <h2 className="text-3xl font-black text-white tracking-widest uppercase mb-4 animate-pulse">
          Aguardando Oponente...
        </h2>
        <p className="text-[var(--text-muted)]">Sua frota está a postos. Esperando o inimigo concluir o posicionamento.</p>
      </div>
    );
  }

  return (
    <div className="game-layout-grid relative">
      {turnAnnouncement && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/30 backdrop-blur-sm animate-pulse transition-opacity duration-500">
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-[0.2em] uppercase drop-shadow-[0_0_30px_rgba(0,255,255,1)]">
            {turnAnnouncement}
          </h1>
        </div>
      )}
      <RadarPanel 
        gameState={gameState} 
        revealed={isMyTurn ? enemyRevealed : myRevealed}
        fleet={isMyTurn ? enemyFleet : myFleet}
        onAttack={handleAttackIntent} 
        isMyTurn={isMyTurn} 
        activeAttack={activeAttack}
      />
      <FleetStatusPanel 
        myFleet={myFleet} 
        gameState={gameState}
        enemyRevealed={enemyRevealed}
        myAnswers={myAnswers}
        onExit={handleExit} 
        onHint={handleHint} 
      />
      <QuestionModal 
        question={currentQuestion} 
        onAnswer={handleAnswer} 
        answerFeedback={answerFeedback}
      />
    </div>
  );
}
