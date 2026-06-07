"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Turnstile } from "@marsidev/react-turnstile";
import apiClient from "@/lib/axios";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  useEffect(() => {
    if (searchParams.get("reset") === "success") {
      setInfo("Senha redefinida com sucesso! Faça login com a nova senha.");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Resolva o captcha antes de continuar.");
      return;
    }

    setLoading(true);
    try {
      // Pré-checagem: o NextAuth mascara o motivo do authorize, então uma conta
      // bloqueada apareceria como "senha incorreta". Aqui descobrimos o motivo real.
      const pre = await apiClient.post("/api/auth/login-check", { email, password });
      const status = pre.data?.status;

      if (status === "pending_parental") {
        setError("Sua conta aguarda autorização do responsável. Verifique o e-mail enviado a ele.");
        setLoading(false);
        return;
      }
      if (status === "suspended") {
        setError("Sua conta foi suspensa. Entre em contato com o suporte.");
        setLoading(false);
        return;
      }
      if (status === "anonymized") {
        setError("Esta conta foi excluída.");
        setLoading(false);
        return;
      }
      if (status === "rate_limited") {
        setError("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
        setLoading(false);
        return;
      }
      if (status !== "ok") {
        setError("E-mail ou senha incorretos.");
        setLoading(false);
        return;
      }

      // Conta ativa e credencial válida: emite a sessão de fato.
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });
      if (res?.error) {
        setError("E-mail ou senha incorretos.");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-logo-area">
          <Image src="/logo_full.svg" alt="CogniQuest Logo" width={250} height={60} className="login-logo" priority />
        </div>

        <h2 className="login-title">Acesse sua Conta</h2>
        <p className="login-subtitle">Entre na arena do conhecimento gamificado</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-md text-sm mb-4 text-center font-semibold">
            {error}
          </div>
        )}

        {info && (
          <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 px-4 py-2 rounded-md text-sm mb-4 text-center font-semibold">
            {info}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label htmlFor="login-email">E-mail</label>
            <input
              type="email"
              id="login-email"
              name="email"
              placeholder="nome@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group relative">
            <div className="flex justify-between items-center w-full">
              <label htmlFor="login-password">Senha</label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline font-semibold mb-1">
                Esqueci a senha
              </Link>
            </div>
            <input
              type="password"
              id="login-password"
              name="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-center mb-4">
            <Turnstile
              siteKey={(typeof window !== "undefined" ? (window as any).__ENV?.TURNSTILE_SITE_KEY : null) || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
              onSuccess={(token) => setTurnstileToken(token)}
            />
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? "Entrando..." : "Entrar na Arena"}
          </button>
        </form>

        <div className="login-footer">
          <span>Não tem uma conta?</span>
          <Link href="/register" className="switch-link-btn inline-block mt-2">
            Cadastrar-se
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-white">Carregando...</div>}>
      <LoginForm />
    </Suspense>
  );
}
