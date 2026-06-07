"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useGameSocket } from "../../../../hooks/GameSocketProvider";
import { VisibilitySelector } from "../../../../components/common/VisibilitySelector";

const SUBJECTS = [
  { slug: "math", name: "Matemática", icon: "/icon_math.svg" },
  { slug: "physics", name: "Física", icon: "/icon_physics.svg" },
  { slug: "biology", name: "Biologia", icon: "/icon_biology.svg" },
  { slug: "chemistry", name: "Química", icon: "/icon_chemistry.svg" },
  { slug: "portuguese", name: "Português", icon: "/icon_portuguese.svg" },
  { slug: "history", name: "História", icon: "/icon_history.svg" },
  { slug: "geography", name: "Geografia", icon: "/icon_geography.svg" },
] as const;

import { GRADES, GRADE_LABELS } from "@cogniquest/shared";

type Mode = "solo" | "duo";

export default function CreateRoomPage() {
  const router = useRouter();
  const { socket } = useGameSocket();
  const [subject, setSubject] = useState<string>("math");
  const [grade, setGrade] = useState<(typeof GRADES)[number]>("9-ano");
  const [mode, setMode] = useState<Mode>("duo");
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState("");
  const [roomName, setRoomName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleStartMatch = () => {
    if (!socket || submitting) return;

    const isPrivateDuo = mode === "duo" && !isPublic;
    if (isPrivateDuo && password.trim().length < 4) {
      alert("Defina uma senha de pelo menos 4 caracteres para a sala privada.");
      return;
    }

    setSubmitting(true);

    // Navigate to the real room when the server confirms creation.
    socket.once("lobby:created", ({ roomId }) => {
      router.push(`/game/${roomId}`);
    });
    socket.once("error", (err) => {
      setSubmitting(false);
      alert(`Erro ao criar sala: ${err.message}`);
    });

    socket.emit("lobby:create", {
      subjectSlug: subject,
      grade,
      name: roomName.trim() || undefined,
      // Solo rooms are always private.
      isPublic: mode === "solo" ? false : isPublic,
      password: isPrivateDuo ? password.trim() : undefined,
      mode,
    });
  };

  return (
    <>
      <div className="back-link-row">
        <button className="back-link-btn" onClick={() => router.push("/lobby")}>
          ← Voltar para as Salas
        </button>
      </div>

      <div className="create-room-container">
        <div className="create-room-card">
          <div>
            <h1 className="create-title">Configurar Nova Sala</h1>
            <p className="create-subtitle">Defina o modo, a matéria e a dificuldade do duelo</p>
          </div>

          {/* Modo de jogo */}
          <div className="setup-group">
            <label className="setup-label">Modo de Jogo</label>
            <div className="setup-age-selector">
              <button
                className={`setup-age-btn ${mode === "duo" ? "active" : ""}`}
                onClick={() => setMode("duo")}
              >
                👥 Dupla (PvP)
              </button>
              <button
                className={`setup-age-btn ${mode === "solo" ? "active" : ""}`}
                onClick={() => setMode("solo")}
              >
                🤖 Solo (vs Máquina)
              </button>
            </div>
            {mode === "solo" && (
              <p className="create-subtitle" style={{ marginTop: 8 }}>
                No modo solo a máquina não ataca — afunde a frota dela respondendo
                as perguntas.
              </p>
            )}
          </div>

          {/* Matéria */}
          <div className="setup-group">
            <label className="setup-label">Escolha a Matéria</label>
            <div className="setup-subject-grid">
              {SUBJECTS.map((s) => (
                <button
                  key={s.slug}
                  className={`setup-subject-btn ${subject === s.slug ? "active" : ""}`}
                  onClick={() => setSubject(s.slug)}
                >
                  <Image src={s.icon} alt={s.name} width={28} height={28} className="setup-icon" />
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Série Escolar */}
          <div className="setup-group">
            <label className="setup-label">Série Escolar (Dificuldade)</label>
            <div className="setup-age-selector">
              {GRADES.map((b) => (
                <button
                  key={b}
                  className={`setup-age-btn ${grade === b ? "active" : ""}`}
                  onClick={() => setGrade(b)}
                >
                  {GRADE_LABELS[b]}
                </button>
              ))}
            </div>
          </div>

          {/* Nome da sala (apenas duo) */}
          {mode === "duo" && (
            <div className="setup-group">
              <label className="setup-label">Nome da Sala (opcional)</label>
              <input
                type="text"
                value={roomName}
                maxLength={40}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Ex.: Duelo da Galera"
                className="bg-[rgba(0,10,30,0.5)] border border-[rgba(0,255,255,0.2)] rounded px-4 py-2 text-white placeholder-slate-500 w-full"
              />
              <p className="create-subtitle" style={{ marginTop: 6 }}>
                Se deixar em branco, usamos "Sala de {`{seu nome}`}". Dá pra editar depois na tela de espera.
              </p>
            </div>
          )}

          {/* Visibilidade (apenas duo) */}
          {mode === "duo" && (
            <VisibilitySelector
              isPublic={isPublic}
              onChange={setIsPublic}
              password={password}
              onPasswordChange={setPassword}
            />
          )}

          <div className="create-actions-row">
            <button className="start-match-btn" onClick={handleStartMatch} disabled={submitting}>
              {submitting ? "Criando..." : mode === "solo" ? "Iniciar Solo" : "Iniciar Partida"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
