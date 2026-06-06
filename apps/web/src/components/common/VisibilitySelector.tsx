"use client";

/**
 * Seletor de visibilidade de sala, reutilizável entre jogos.
 * Mostra os botões Pública/Privada e, quando Privada, o campo de senha.
 *
 * Controlado pelo pai: receba `isPublic`/`password` e os callbacks de mudança.
 */
interface VisibilitySelectorProps {
  isPublic: boolean;
  onChange: (isPublic: boolean) => void;
  password: string;
  onPasswordChange: (password: string) => void;
  /** Rótulo do grupo (opcional). */
  label?: string;
  /** Tamanho mínimo da senha, só para o texto de ajuda. */
  minPasswordLength?: number;
}

export function VisibilitySelector({
  isPublic,
  onChange,
  password,
  onPasswordChange,
  label = "Visibilidade",
  minPasswordLength = 4,
}: VisibilitySelectorProps) {
  return (
    <div className="setup-group">
      <label className="setup-label">{label}</label>
      <div className="setup-age-selector">
        <button
          type="button"
          className={`setup-age-btn ${isPublic ? "active" : ""}`}
          onClick={() => onChange(true)}
        >
          Pública (lista)
        </button>
        <button
          type="button"
          className={`setup-age-btn ${!isPublic ? "active" : ""}`}
          onClick={() => onChange(false)}
        >
          🔒 Privada (senha)
        </button>
      </div>

      {!isPublic && (
        <div style={{ marginTop: 12 }}>
          <label className="setup-label">Senha da sala</label>
          <input
            type="text"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder={`Mínimo ${minPasswordLength} caracteres`}
            maxLength={64}
            className="bg-[rgba(0,10,30,0.5)] border border-[rgba(0,255,255,0.2)] rounded px-4 py-2 text-white placeholder-slate-500 w-full"
          />
          <p className="create-subtitle" style={{ marginTop: 6 }}>
            Seu colega vê a sala na lista com 🔒 e usa essa senha para entrar.
          </p>
        </div>
      )}
    </div>
  );
}
