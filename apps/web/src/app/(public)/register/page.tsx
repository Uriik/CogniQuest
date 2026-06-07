"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Turnstile } from "@marsidev/react-turnstile";
import { GRADES, GRADE_LABELS } from "@cogniquest/shared";
import apiClient from "@/lib/axios";

/** Derive age from YYYY-MM-DD string. */
function getAge(dateStr: string): number | null {
  if (!dateStr) return null;
  const birth = new Date(dateStr);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [grade, setGrade] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [pendingParental, setPendingParental] = useState(false);
  const [loading, setLoading] = useState(false);

  const age = useMemo(() => getAge(birthdate), [birthdate]);
  const isChild = age !== null && age < 12;
  const isMinor = age !== null && age < 18;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!acceptTerms || !acceptPrivacy) {
      setError("É necessário aceitar os Termos de Uso e a Política de Privacidade.");
      setLoading(false);
      return;
    }

    if (!birthdate) {
      setError("Informe sua data de nascimento.");
      setLoading(false);
      return;
    }

    if (isMinor && !guardianEmail) {
      setError("Para menores de 18 anos, é necessário informar o e-mail do responsável.");
      setLoading(false);
      return;
    }

    if (!turnstileToken) {
      setError("Por favor, resolva o captcha antes de continuar.");
      setLoading(false);
      return;
    }

    try {
      const res = await apiClient.post("/api/auth/register", {
        email,
        password,
        displayName,
        grade: grade || undefined,
        turnstileToken: turnstileToken || "dummy-token-for-tests",
        birthdate,
        guardianEmail: isMinor ? guardianEmail : undefined,
        acceptTerms: true,
        acceptPrivacy: true,
      });

      const data = res.data;

      if (data.pendingParental) {
        setPendingParental(true);
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      const errorData = err.response?.data || {};
      if (errorData.error === "Email in use") {
        setError("Este e-mail já está em uso.");
      } else if (errorData.error === "Invalid input") {
        setError("Dados inválidos. A senha precisa de no mínimo 8 caracteres, com letras e números.");
      } else {
        setError(errorData.error || "Ocorreu um erro no cadastro.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (pendingParental) {
    return (
      <div className="login-wrapper">
        <div className="login-card text-center">
          <h2 className="login-title mb-4">Aguardando Autorização</h2>
          <p className="mb-4" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
            Sua conta foi criada, mas como você é menor de 18 anos, é necessário que um
            responsável autorize sua participação.
          </p>
          <p className="mb-6" style={{ color: "var(--primary)", fontWeight: 600 }}>
            Um e-mail foi enviado para o responsável com um link de autorização.
          </p>
          <button className="login-submit-btn" onClick={() => router.push("/login")}>
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

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
              name="displayName"
              placeholder="Seu nome no jogo" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required 
              minLength={2}
              maxLength={40}
            />
          </div>

          <div className="input-group">
            <label htmlFor="register-email">E-mail</label>
            <input 
              type="email" 
              id="register-email" 
              name="email"
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
              name="password"
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              minLength={8}
            />
            <span className="text-xs text-slate-400 mt-1 block">A senha precisa de 8+ caracteres, incluindo letras e números.</span>
          </div>

          <div className="input-group">
            <label htmlFor="register-birthdate">Data de Nascimento</label>
            <input 
              type="date" 
              id="register-birthdate" 
              name="birthdate"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              required
              max={new Date().toISOString().split("T")[0]}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              style={{ colorScheme: "dark" }}
            />
            {age !== null && (
              <span className="text-xs mt-1 block" style={{ color: isMinor ? "var(--accent-purple)" : "var(--text-muted)" }}>
                {age} anos — {isChild ? "Criança (requer autorização do responsável)" : isMinor ? "Adolescente (requer autorização do responsável)" : "Adulto"}
              </span>
            )}
          </div>

          {isChild && (
            <div className="input-group">
              <label htmlFor="register-guardian">E-mail do Responsável</label>
              <input 
                type="email" 
                id="register-guardian" 
                name="guardianEmail"
                placeholder="email.do.responsavel@exemplo.com" 
                value={guardianEmail}
                onChange={(e) => setGuardianEmail(e.target.value)}
                required
              />
              <span className="text-xs text-slate-400 mt-1 block">
                O responsável receberá um e-mail para autorizar sua conta (LGPD, Art. 14).
              </span>
            </div>
          )}

          <div className="input-group">
            <label htmlFor="register-grade">Série Escolar</label>
            <select 
              id="register-grade" 
              name="grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            >
              <option value="" disabled>Selecione...</option>
              {GRADES.map(g => (
                <option key={g} value={g}>{GRADE_LABELS[g]}</option>
              ))}
            </select>
          </div>

          {/* Consent checkboxes */}
          <div style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>
            <div className="consent-group">
              <input 
                type="checkbox" 
                id="accept-terms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
              />
              <label htmlFor="accept-terms">
                Li e concordo com os{" "}
                <Link href="/termos" target="_blank">Termos de Uso</Link>
              </label>
            </div>
            <div className="consent-group">
              <input 
                type="checkbox" 
                id="accept-privacy"
                checked={acceptPrivacy}
                onChange={(e) => setAcceptPrivacy(e.target.checked)}
              />
              <label htmlFor="accept-privacy">
                Li e concordo com a{" "}
                <Link href="/privacidade" target="_blank">Política de Privacidade</Link>
              </label>
            </div>
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
            disabled={loading || !acceptTerms || !acceptPrivacy}
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
