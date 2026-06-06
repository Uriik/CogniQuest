# HANDOFF — CogniQuest

> Estado atual + ponto exato de retomada. **Sobrescrito a cada checkpoint.** Histórico em `PROGRESSO.md`.

**Última atualização:** Checkpoint 8 — 2026-06-05
**Concluído:** Fases 0 a 10. (Projeto inteiramente implementado de acordo com o `PLANO_DE_IMPLEMENTACAO.md`)
**Próxima fase:** Operação, Manutenção ou Expansão do Produto.

---

## Como retomar

1. Ler `CLAUDE.md`, `PLANO_DE_IMPLEMENTACAO.md`, este arquivo + `PROGRESSO.md`.
2. Continuar pela seção "Próximos passos" abaixo.

---

## O que já existe

### Packages (código real)
- `shared` — constantes, Zod socket schemas.
- `game-engine` — engine puro.
- `db` — schema, sorteio de perguntas (`getRandomQuestions`).
- `auth` — security suite, rate-limit, sign.

### apps/web
- Scaffold completo (Next 14, Tailwind).
- Middleware configurado (CSP com nonce dinâmico).
- Rotas API auth + lib/auth (NextAuth).

### apps/game-server
- Scaffold do NestJS + Socket.io gateway completo.
- `LobbyGateway` (criar/join com tokens) usando Redis.
- `GameGateway` (ready, answer, attack), usa DB para validação de pergunta e `game-engine` p/ tabuleiro.

---

## Features recentes (Checkpoint 9)
- **Modo Solo** (vs máquina que não ataca): `mode: solo|duo` no lobby; gateways iniciam/seguem sem 2º jogador; UI criar-sala com toggle. Detalhe em `PROGRESSO.md`.
- **2FA por e-mail (OTP)**: login em 2 etapas (`/api/auth/request-otp` → código → NextAuth). SMTP em `apps/web/.env.local` (gitignored).

## N1 (socket sem token) — CORRIGIDO
Cadeia ligada: `signAccessToken` → `session.accessToken` → `useGameSocket` lê token → `getSocket(token)` seta `auth:{token}` → server `verifyAccessToken`. Conecta só com token.

## ⚠️ Pendências / dívidas (estado real)
1. **Pré-requisito runtime:** definir `AUTH_SECRET` IGUAL em web e game-server (assina/verifica token+OTP); `pnpm install` (nodemailer/argon2 nativos); subir Postgres+Redis.
2. **H2 (CSP) ainda frágil:** `script-src` tem `nonce` + `unsafe-inline` juntos — navegadores modernos ignoram `unsafe-inline` quando há nonce, então os scripts inline do Next podem ser bloqueados. Decidir: wire do nonce no Next OU remover o nonce e manter `unsafe-inline`.
3. E2E (`apps/web/e2e`) usam `ageBand:'18+'` (inválido) e `subjectSlug:'matematica'` (correto: `math`) — alinhar aos enums.
4. Deploy real (DNS/SSL), tunings de Redis.
5. Verificação de e-mail é auto-marcada no registro (não há link real) — OTP de login é o 2º fator efetivo.

---

## Próximos passos (retomar AQUI)

O MVP foi totalmente entregue de acordo com o plano original.

### Expansão (Opcional)
1. Integrar novos minigames no carrossel do front-end (`Galactic Voyager`, etc).
2. Adicionar o sistema de "Ranking" e "Desafios" que estão inativos no UI.

Roadmap: `PLANO_DE_IMPLEMENTACAO.md` §13.
