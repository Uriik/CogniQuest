"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Turnstile } from "@marsidev/react-turnstile";

type Step = "request" | "reset";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Resolva o captcha antes de continuar.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken }),
      });
      if (res.status === 429) {
        setError("Muitas tentativas. Aguarde um momento.");
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Não foi possível enviar o código.");
        return;
      }
      setStep("reset");
      setInfo(`Enviamos um código de 6 dígitos para ${email}. Verifique sua caixa de entrada.`);
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Não foi possível redefinir a senha.");
        return;
      }
      
      router.push("/login?reset=success");
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

        <h2 className="login-title">Recuperar Senha</h2>
        <p className="login-subtitle">
          {step === "request"
            ? "Informe seu e-mail para receber o código"
            : "Crie uma nova senha de acesso"}
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-md text-sm mb-4 text-center font-semibold">
            {error}
          </div>
        )}
        {info && (
          <div className="bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 px-4 py-2 rounded-md text-sm mb-4 text-center">
            {info}
          </div>
        )}

        {step === "request" ? (
          <form onSubmit={handleRequestOtp}>
            <div className="input-group">
              <label htmlFor="reset-email">E-mail</label>
              <input
                type="email"
                id="reset-email"
                name="email"
                placeholder="nome@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-center mb-4">
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
                onSuccess={(token) => setTurnstileToken(token)}
              />
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? "Enviando código..." : "Enviar Código"}
            </button>
            
            <Link href="/login" className="switch-link-btn block text-center mt-4">
              ← Voltar ao Login
            </Link>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <div className="input-group">
              <label htmlFor="reset-otp">Código de verificação</label>
              <input
                type="text"
                id="reset-otp"
                name="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                style={{ letterSpacing: "8px", textAlign: "center", fontSize: "1.4rem" }}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="reset-new-password">Nova Senha</label>
              <input
                type="password"
                id="reset-new-password"
                name="newPassword"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading || otp.length !== 6 || newPassword.length < 8}>
              {loading ? "Redefinindo..." : "Redefinir Senha"}
            </button>

            <button
              type="button"
              className="switch-link-btn block text-center mt-4 w-full"
              onClick={() => {
                setStep("request");
                setOtp("");
                setInfo("");
                setError("");
              }}
            >
              ← Alterar e-mail
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
