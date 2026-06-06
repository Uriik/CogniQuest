"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Turnstile } from "@marsidev/react-turnstile";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [ageBand, setAgeBand] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!turnstileToken) {
      setError("Por favor, resolva o captcha antes de continuar.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          displayName,
          ageBand: ageBand || undefined,
          turnstileToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "Email in use") {
          setError("Este e-mail já está em uso.");
        } else if (data.error === "Invalid input") {
          setError("Dados inválidos. A senha precisa de no mínimo 8 caracteres, com letras e números.");
        } else {
          setError(data.error || "Ocorreu um erro no cadastro.");
        }
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="login-wrapper">
        <div className="login-card text-center">
          <h2 className="login-title mb-4">Cadastro Concluído!</h2>
          <p className="mb-6">Sua conta foi criada com sucesso! Faça login para entrar na arena.</p>
          <button className="login-submit-btn" onClick={() => router.push("/login")}>
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-logo-area">
          <Image 
            src="/logo_full.svg" 
            alt="CogniQuest Logo" 
            width={250} 
            height={60} 
            className="login-logo"
            priority
          />
        </div>
        
        <h2 className="login-title">Crie sua Conta</h2>
        <p className="login-subtitle">Junte-se à arena do conhecimento gamificado</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-md text-sm mb-4 text-center font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="register-name">Nome de Exibição</label>
            <input 
              type="text" 
              id="register-name" 
              placeholder="Seu nome no jogo" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required 
            />
          </div>

          <div className="input-group">
            <label htmlFor="register-email">E-mail</label>
            <input 
              type="email" 
              id="register-email" 
              placeholder="nome@exemplo.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>

          <div className="input-group">
            <label htmlFor="register-password">Senha</label>
            <input 
              type="password" 
              id="register-password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              minLength={8}
            />
            <span className="text-xs text-slate-400 mt-1 block">A senha precisa de 8+ caracteres, incluindo letras e números.</span>
          </div>

          <div className="input-group">
            <label htmlFor="register-age">Faixa Etária</label>
            <select 
              id="register-age" 
              value={ageBand}
              onChange={(e) => setAgeBand(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            >
              <option value="" disabled>Selecione...</option>
              <option value="6-8">6 a 8 anos</option>
              <option value="9-11">9 a 11 anos</option>
              <option value="12-14">12 a 14 anos</option>
              <option value="15+">15+ anos</option>
            </select>
          </div>

          <div className="flex justify-center mb-4 mt-6">
            <Turnstile
              siteKey={(typeof window !== "undefined" ? (window as any).__ENV?.TURNSTILE_SITE_KEY : null) || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
              onSuccess={(token) => setTurnstileToken(token)}
            />
          </div>

          <button 
            type="submit" 
            className="login-submit-btn" 
            disabled={loading}
          >
            {loading ? "Registrando..." : "Cadastrar-se"}
          </button>
        </form>

        <div className="login-footer">
          <span>Já tem uma conta?</span>
          <Link href="/login" className="switch-link-btn inline-block mt-2">
            Fazer Login
          </Link>
        </div>
      </div>
    </div>
  );
}
