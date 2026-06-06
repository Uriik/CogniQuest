# CLAUDE.md — CogniQuest

Contexto e regras para qualquer agente de codificação que trabalhe neste repositório.

## Modo de comunicação: CAVEMAN (sempre ativo)

Este projeto usa a skill **caveman** (`.claude/skills/caveman`). Responda em estilo caveman por padrão.

- Respond terse like smart caveman. All technical substance stay. Only fluff die.
- Drop: artigos, filler (just/really/basically), pleasantries, hedging. Fragments OK. Termos técnicos exatos.
- Pattern: `[thing] [action] [reason]. [next step].`
- **Auto-clarity:** saia do caveman para avisos de segurança, ações irreversíveis, sequências multi-passo onde a ambiguidade atrapalha, ou usuário confuso. Retome depois.
- **Boundaries:** código, commits, PRs, documentação de usuário (README, docs/) escritos em prosa normal. Caveman só na conversa.
- Trocar nível: `/caveman lite|full|ultra`. Parar: "stop caveman" / "normal mode".

## O que é o projeto

CogniQuest = plataforma de ensino gamificada. Primeiro jogo: **Batalha Naval PvP** (2 jogadores). Especificação completa em `PLANO_DE_IMPLEMENTACAO.md` (raiz). Estado/checkpoints em `project-state/`.

## Stack (fechada)

- **Linguagem:** TypeScript strict (front + back). Validação runtime nas fronteiras com Zod.
- **Front:** Next.js (App Router) + React + Framer Motion. Auth.js (NextAuth) + JWT/refresh.
- **Back:** NestJS (Node.js) + Socket.io gateway (game-server, Cloud Run com WebSockets). Redis adapter p/ escala.
- **DB:** PostgreSQL (Cloud SQL) persistente + Redis (Cloud Memorystore) volátil/cache.
- **ORM:** Drizzle. **Monorepo:** pnpm workspaces + Turborepo. **CAPTCHA:** Cloudflare Turnstile.

## Regras invioláveis

1. **Servidor-autoritativo.** Resposta correta da pergunta NUNCA vai ao cliente. Validação de resposta/ataque só no servidor. (Ver §8 do plano.)
2. **Posições de navios** nunca expostas ao cliente. Posicionamento aleatório no servidor.
3. **Segurança primeiro.** Toda entrada validada com Zod. Headers/CSP, rate limit, Turnstile. Segredos no Secret Manager — nunca commitados.
4. **Idioma:** documento/PT, código/EN. Conventional Commits.

## Convenções

- Idioma do código: inglês (identificadores, comentários, commits).
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`...).
- Lint/format: ESLint + Prettier. Branches trunk-based, `main` protegida.
- TypeScript: `strict: true`, `noUncheckedIndexedAccess: true`.

## Fluxo de trabalho por checkpoint

Ao concluir cada fase do roadmap (ver `PLANO_DE_IMPLEMENTACAO.md` §13), atualizar:

- `project-state/PROGRESSO.md` — o que ficou pronto (append, histórico).
- `project-state/HANDOFF.md` — estado atual + ponto exato de retomada (sobrescreve).

## Decisões do jogo (fixas)

Tabuleiro 10×10. Frota: Submarine (2), Destroyer (3), Cruiser (4) — distribuição aleatória. Dica liberada a cada 3 acertos (resolvida no servidor). Sem níveis/XP. Lobby: lista pública + convite (link assinado + código 6 dígitos; não-logado → login → volta ao convite). Faixas: 6-8, 9-11, 12-14, 15+. Matérias: math, physics, biology, chemistry, portuguese, history, geography.
