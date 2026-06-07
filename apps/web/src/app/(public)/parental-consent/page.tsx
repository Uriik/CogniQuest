"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/axios";

function ParentalConsentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "already" | "error">("loading");
  const [childName, setChildName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setErrorMsg("Link de autorização inválido. Nenhum token encontrado.");
      return;
    }

    apiClient
      .get(`/api/auth/parental-consent?token=${encodeURIComponent(token)}`)
      .then((res) => {
        const data = res.data;
        if (data.alreadyActive) {
          setStatus("already");
        } else if (data.success) {
          setChildName(data.childName || "");
          setStatus("success");
        }
      })
      .catch((err) => {
        const msg = err.response?.data?.error || "Erro ao processar autorização.";
        setErrorMsg(msg);
        setStatus("error");
      });
  }, [searchParams]);

  return (
    <div className="parental-consent-wrapper">
      <div className="parental-consent-card">
        {status === "loading" && (
          <>
            <h1>Verificando autorização...</h1>
            <p>Aguarde enquanto processamos sua solicitação.</p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 style={{ color: "var(--success)" }}>✓ Conta Autorizada!</h1>
            <p>
              A conta de <span className="child-name-highlight">{childName}</span> foi
              ativada com sucesso no CogniQuest.
            </p>
            <p>
              Agora {childName} pode fazer login e começar a aprender jogando!
            </p>
            <button
              className="login-submit-btn"
              style={{ marginTop: "1.5rem" }}
              onClick={() => router.push("/login")}
            >
              Ir para Login
            </button>
          </>
        )}

        {status === "already" && (
          <>
            <h1>Conta já está ativa</h1>
            <p>Esta conta já foi autorizada anteriormente. Nenhuma ação adicional é necessária.</p>
            <Link href="/login" className="login-submit-btn" style={{ display: "inline-block", marginTop: "1.5rem", textDecoration: "none", padding: "0.85rem 2rem" }}>
              Ir para Login
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <h1 style={{ color: "var(--error)" }}>Erro na Autorização</h1>
            <p>{errorMsg}</p>
            <p style={{ fontSize: "0.8rem", marginTop: "1rem" }}>
              Se o link expirou, solicite um novo cadastro da criança na plataforma.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function ParentalConsentPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-white">Carregando...</div>}>
      <ParentalConsentContent />
    </Suspense>
  );
}
