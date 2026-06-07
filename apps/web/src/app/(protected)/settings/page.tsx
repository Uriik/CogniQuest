"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/axios";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export default function SettingsPage() {
  const router = useRouter();
  const [exportStatus, setExportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "confirm" | "loading" | "error">("idle");

  const handleExportData = async () => {
    setExportStatus("loading");
    try {
      const res = await apiClient.get("/api/auth/my-data");
      const dataStr = JSON.stringify(res.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cogniquest-dados-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setExportStatus("success");
      setTimeout(() => setExportStatus("idle"), 3000);
    } catch (error) {
      console.error("Export error", error);
      setExportStatus("error");
      setTimeout(() => setExportStatus("idle"), 5000);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteStatus !== "confirm") {
      setDeleteStatus("confirm");
      return;
    }

    setDeleteStatus("loading");
    try {
      await apiClient.delete("/api/auth/my-data");
      await signOut({ redirect: false });
      router.push("/login?deleted=true");
    } catch (error) {
      console.error("Delete error", error);
      setDeleteStatus("error");
      setTimeout(() => setDeleteStatus("idle"), 5000);
    }
  };

  return (
    <div className="main-wrapper">
      <div className="lobby-header-row mb-6">
        <div>
          <h1 className="page-title">Configurações da Conta</h1>
          <p className="page-subtitle">Gerencie seus dados e preferências (LGPD)</p>
        </div>
      </div>

      <div className="settings-page">
        {/* PRIVACY SECTION */}
        <div className="settings-section">
          <h2>Privacidade e Termos</h2>
          <p>
            Você aceitou os Termos de Uso e a Política de Privacidade (v1.0) no momento
            da criação da sua conta. Suas informações são tratadas exclusivamente para
            fins educativos.
          </p>
          <div className="flex gap-4">
            <a href="/termos" target="_blank" className="settings-btn" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", textDecoration: "none" }}>
              Ver Termos de Uso
            </a>
            <a href="/privacidade" target="_blank" className="settings-btn" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", textDecoration: "none" }}>
              Ver Política
            </a>
          </div>
        </div>

        {/* DSAR SECTION - EXPORT */}
        <div className="settings-section">
          <h2>Exportar Meus Dados</h2>
          <p>
            Conforme o Art. 18 da LGPD (direito à portabilidade), você pode baixar uma
            cópia completa de todos os dados pessoais, consentimentos e histórico de
            partidas associados à sua conta. O formato será JSON estruturado.
          </p>
          <button 
            className="settings-btn settings-btn-primary"
            onClick={handleExportData}
            disabled={exportStatus === "loading"}
          >
            {exportStatus === "loading" ? "Preparando arquivo..." : 
             exportStatus === "success" ? "✓ Dados Exportados" : 
             exportStatus === "error" ? "X Erro ao Exportar" : "Exportar Dados (JSON)"}
          </button>
          {exportStatus === "success" && (
            <span className="ml-4 text-xs text-emerald-500 font-semibold">
              Download iniciado!
            </span>
          )}
        </div>

        {/* DSAR SECTION - DELETE */}
        <div className="settings-section" style={{ borderColor: "rgba(239, 68, 68, 0.2)" }}>
          <h2 style={{ color: "var(--error)" }}>Excluir Conta</h2>
          <p>
            Você pode solicitar a exclusão da sua conta. Esta ação é irreversível.
            Seus dados pessoais serão anonimizados e sua conta será bloqueada permanentemente.
            Nenhum outro jogador poderá ver seu nome.
          </p>
          
          {deleteStatus === "confirm" && (
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-md mb-4">
              <p className="text-red-400 font-bold mb-2">Tem certeza absoluta?</p>
              <p className="text-sm text-red-300 mb-0">Você perderá o acesso à conta e todo o histórico será anonimizado.</p>
            </div>
          )}

          <div className="flex gap-4">
            <button 
              className="settings-btn settings-btn-danger"
              onClick={handleDeleteAccount}
              disabled={deleteStatus === "loading"}
            >
              {deleteStatus === "loading" ? "Excluindo..." : 
               deleteStatus === "confirm" ? "Sim, Quero Excluir" : 
               deleteStatus === "error" ? "X Erro ao Excluir" : "Excluir Minha Conta"}
            </button>
            
            {deleteStatus === "confirm" && (
              <button 
                className="settings-btn"
                style={{ background: "rgba(255,255,255,0.05)" }}
                onClick={() => setDeleteStatus("idle")}
              >
                Cancelar
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
