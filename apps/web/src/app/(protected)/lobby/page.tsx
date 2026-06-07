"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PublicRoomState, gradeSchema, GRADE_LABELS } from "@cogniquest/shared";
import { useGameSocket } from "../../../hooks/GameSocketProvider";

export default function LobbyPage() {
  const router = useRouter();
  const { socket, publicRooms, subscribeLobby, unsubscribeLobby, isConnected, error, resetGameState } = useGameSocket();
  const [inviteCode, setInviteCode] = useState("");
  // Senha digitada inline por sala privada (chave = roomId).
  const [passwords, setPasswords] = useState<Record<string, string>>({});

  // Socket compartilhado: limpa estado/erro de uma partida anterior ao voltar ao
  // lobby (senão um erro antigo apareceria aqui).
  useEffect(() => {
    resetGameState();
  }, [resetGameState]);

  // Assina para receber as atualizações das salas em tempo real
  useEffect(() => {
    if (!isConnected) return;
    subscribeLobby();
    
    return () => unsubscribeLobby();
  }, [isConnected, subscribeLobby, unsubscribeLobby]);

  const handleCreateRoom = () => {
    router.push("/lobby/create");
  };

  const handleJoinRoom = (room: PublicRoomState) => {
    if (!socket) return;

    // Sala privada: usa a senha digitada inline no card.
    const password = room.isPublic ? undefined : (passwords[room.roomId] || "").trim();
    if (!room.isPublic && !password) return; // sem senha, não envia

    socket.once("lobby:updated", (state) => {
      router.push(`/game/${state.roomId}`);
    });
    socket.emit("lobby:join", { roomId: room.roomId, password });
  };

  const handleJoinWithCode = () => {
    if (!socket || !inviteCode) return;
    socket.once("lobby:updated", (state) => {
      router.push(`/game/${state.roomId}`);
    });
    socket.emit("lobby:join", { code: inviteCode });
  };

  return (
    <>
      <div className="lobby-header-row">
        <div>
          <h1 className="page-title">Salas de Espera Ativas</h1>
          <p className="page-subtitle">Entre em uma sala aberta ou crie uma nova partida multijogador</p>
          {!isConnected && <p className="text-error text-xs mt-2 animate-pulse">Conectando ao servidor...</p>}
        </div>
        <button className="create-room-btn-main" onClick={handleCreateRoom}>
          Criar Nova Sala
        </button>
      </div>

      <div className="flex gap-4 mb-8">
        <input 
          type="text" 
          placeholder="Código de 6 dígitos" 
          className="bg-[rgba(0,10,30,0.5)] border border-[rgba(0,255,255,0.2)] rounded px-4 py-2 text-white placeholder-slate-500 flex-1 max-w-xs"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          maxLength={6}
        />
        <button 
          className="start-match-btn !w-auto !py-2 !px-6"
          onClick={handleJoinWithCode}
          disabled={inviteCode.length < 6}
        >
          Entrar com Código
        </button>
      </div>
      
      {error && <div className="text-error mb-4">{error.message}</div>}

      <div className="rooms-grid">
        {publicRooms.length > 0 ? (
          publicRooms.map((room) => (
            <div className="room-card" key={room.roomId}>
              <div className="room-card-header">
                <span className="room-id">{room.name}</span>
                <span className="room-players">{room.guestId ? 2 : 1} / 2 Jogadores</span>
              </div>
              <div className="room-card-body">
                <div className="room-settings-badge mt-4">
                  <span className="setting-tag">{room.subjectSlug}</span>
                  <span className="setting-tag">{room.grade && (GRADE_LABELS as Record<string,string>)[room.grade] ? (GRADE_LABELS as Record<string,string>)[room.grade] : room.grade}</span>
                  {!room.isPublic && <span className="setting-tag">🔒 Privada</span>}
                </div>
              </div>
              <div className="room-card-footer">
                {room.isPublic ? (
                  <button className="join-room-btn" onClick={() => handleJoinRoom(room)}>
                    Entrar na Sala
                  </button>
                ) : (
                  <div className="flex flex-col gap-2 w-full">
                    <input
                      type="password"
                      placeholder="🔒 Senha da sala"
                      value={passwords[room.roomId] || ""}
                      onChange={(e) =>
                        setPasswords((prev) => ({ ...prev, [room.roomId]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleJoinRoom(room);
                      }}
                      className="bg-[rgba(0,10,30,0.5)] border border-[rgba(0,255,255,0.2)] rounded px-3 py-2 text-white placeholder-slate-500 w-full text-sm"
                    />
                    <button
                      className="join-room-btn"
                      onClick={() => handleJoinRoom(room)}
                      disabled={!(passwords[room.roomId] || "").trim()}
                    >
                      Entrar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-slate-400 col-span-full text-center py-12 border border-dashed border-slate-700 rounded-xl">
            Nenhuma sala ativa no momento. Crie a sua!
          </div>
        )}
      </div>
    </>
  );
}
