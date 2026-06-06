"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PublicRoomState } from "@cogniquest/shared";
import { useGameSocket } from "../../../hooks/useGameSocket";

export default function LobbyPage() {
  const router = useRouter();
  const { socket, publicRooms, refreshRooms, isConnected, error } = useGameSocket();
  const [inviteCode, setInviteCode] = useState("");

  // Busca a lista de salas públicas ao conectar e atualiza a cada 4s.
  useEffect(() => {
    if (!isConnected) return;
    refreshRooms();
    const id = setInterval(refreshRooms, 4000);
    return () => clearInterval(id);
  }, [isConnected, refreshRooms]);

  const handleCreateRoom = () => {
    router.push("/lobby/create");
  };

  const handleJoinRoom = (room: PublicRoomState) => {
    if (!socket) return;

    let password: string | undefined;
    if (!room.isPublic) {
      const pw = window.prompt("Esta sala é privada. Digite a senha para entrar:");
      if (pw === null) return; // cancelou
      password = pw;
    }

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
                  <span className="setting-tag">{room.ageBand} anos</span>
                  {!room.isPublic && <span className="setting-tag">🔒 Privada</span>}
                </div>
              </div>
              <div className="room-card-footer">
                <button
                  className="join-room-btn"
                  onClick={() => handleJoinRoom(room)}
                >
                  {room.isPublic ? "Entrar na Sala" : "🔒 Entrar com Senha"}
                </button>
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
