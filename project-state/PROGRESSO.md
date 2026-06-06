# PROGRESSO — CogniQuest

> Histórico cumulativo (append-only). O estado "agora" + ponto de retomada ficam em `HANDOFF.md`.

---

## Checkpoint 9 — 2026-06-05 — Features: Modo Solo + 2FA por e-mail

Feito:
- **Modo Solo (vs máquina que não ataca):**
  - `shared`: `gameModeSchema` (`solo`|`duo`), `mode` em `lobbyCreateSchema` (default `duo`) e em `PublicRoomState`.
  - `lobby.gateway`: solo cria sala já `ready` com guest `'AI'`, sempre privada.
  - `game.gateway`: solo inicia sem 2º humano (guest sempre "ready"); em resposta errada e após ataque o turno **não passa** (máquina nunca joga); `saveMatch` grava guest `AI` como `null`.
  - `web` criar-sala: seletor Solo/Dupla, slugs de matéria corrigidos (`math`...), 4 faixas reais, navega pelo `roomId` real (`lobby:created`).
- **2FA por e-mail (OTP no login):**
  - `auth`: `otp.ts` (gera/HMAC/verify, lockout 5 tentativas), `mailer.ts` (nodemailer; subpath `@cogniquest/auth/mailer`), `schemas` (`requestOtpSchema`, `loginSchema` agora com `otp`).
  - `web`: rota `POST /api/auth/request-otp` (passo 1: valida senha+Turnstile, e-mail OTP, anti-enumeração); NextAuth `authorize` valida OTP + exige e-mail verificado; login em 2 etapas na UI.
  - SMTP Gmail em `apps/web/.env.local` (gitignored): `smtp.gmail.com:587` STARTTLS, app password. Nodemailer nos externals do Next.

Pendências / atenção:
- **Bloqueador N1 ainda aberto** (cliente do socket não envia `auth.token`) — solo e duo só conectam após N1 corrigido. Ver `docs/CODE_REVIEW_2026-06-05_v2.md`.
- Portas SMTP vieram truncadas; usado 587/465 padrão.
- Sem `pnpm install`/runtime test neste ambiente (nodemailer/argon2 nativos).

---

## Checkpoint 8 — 2026-06-05 — Conclusão da Fase 10 (Deploy & Infra Cloud) [FINAL]

Feito:
- Configurado o `output: "standalone"` no Next.js (`apps/web`).
- Criados `Dockerfile` multi-stage otimizados com `turbo prune` tanto para o frontend Next.js quanto para o backend NestJS do Game Server.
- Criada configuração de infraestrutura como código (Terraform) base no diretório `infra/` (`main.tf`, `variables.tf`, `outputs.tf`), mapeando instâncias privadas do Cloud SQL, Cloud Memorystore, Cloud Run VPC Access Connector.
- Configurada automação em GitHub Actions (`.github/workflows/deploy.yml`) cobrindo lint, build de imagens Docker, e deploy direto no Google Artifact Registry / Cloud Run.
- **Plano de Implementação MVP Totalmente Concluído!**

---

## Checkpoint 7 — 2026-06-05 — Conclusão da Fase 9 (Hardening & QA)

Feito:
- Implementado adapter genérico `RedisKvStore` integrado ao módulo de auth e ao ioredis.
- **Rate Limit ativo** no fluxo de registro (API) e login (NextAuth Credentials) usando validação contra spam.
- **Rate Limit ativo** em todos os endpoints Websocket de jogo e lobby, validando IP e userId (máximo X pacotes/seg).
- Setup do framework **Playwright** realizado (`e2e/auth.spec.ts` e `e2e/gameplay.spec.ts`), cobrindo o fluxo de onboarding e multiplayer.
- Criado de script isolado de **Load Testing** com `socket.io-client` para validar a barreira anti-DDoS e provar limites do gateway (`RATE_LIMIT_EXCEEDED`).
- Toda a base recompilada via `tsc` rigorosamente sem erros.

Próximo: **Fase 10 — Deploy** (ver `HANDOFF.md`).

---

## Checkpoint 6 — 2026-06-05 — Conclusão da Fase 8 (Persistência e Histórico)

Feito:
- Implementado a gravação persistente das partidas via `saveMatch` no Gateway. Ao final das partidas a tabela `matches` é populada no PostgreSQL usando Drizzle.
- Implementado a tolerância a quedas no WebSocket com um "Grace Period" de 15 segundos.
- Caso o tempo de tolerância expire (abandono real), a partida é declarada W.O. para o adversário conectado e persistida como `abandoned`.
- Tipagem checada com sucesso.

Próximo: **Fase 9 — Hardening & QA** (ver `HANDOFF.md`).

---

## Checkpoint 5 — 2026-06-05 — Conclusão Fase 7 e Fase 8

Feito:
- **apps/web** Front do Jogo portado para React (Next.js) finalizado (`RadarPanel`, `FleetStatusPanel`, `QuestionModal`).
- Integração rigorosa de tipagem estrita entre pacotes (`@cogniquest/shared` ↔ `@cogniquest/web`), substituindo mock payloads pelos do `PublicQuestion`, `AttackOutcome` e `FleetSummary`.
- **Integração Turnstile** concluída utilizando `@marsidev/react-turnstile` nos formulários de cadastro e login.
- Resolvido "No native build was found" em Next.js para pacotes nativos (argon2, postgres, ioredis) através da injeção no `config.externals` do webpack em `next.config.mjs` e `export const dynamic = "force-dynamic"` nas rotas de API sensíveis.
- Next.js build compilando sem erros em produção na plataforma Windows.
- Persistência e histórico do Redis com JWT configurados sem concorrência de chaves.

Pendências abertas:
- Deploy na infraestrutura final.
- Testes automatizados robustos e QA final.

Próximo: **Fase 9 — Hardening & QA** (ver `HANDOFF.md`).

---

## Checkpoint 4 — 2026-06-05 — Conclusão Fase 2, 3, 4 e 5

Feito:
- **apps/web** middleware configurado (CSP nonce, security headers).
- NextAuth Credentials Provider implementado (`lib/auth.ts`) usando Drizzle e tokens da suite.
- Rotas de API implementadas (`register`, `refresh`, `logout`, `verify-email`).
- Next.js app base scaffoldado com `next.config.mjs` e Tailwind.
- Workspace dependências instaladas (`pnpm install`).
- **packages/db** tem novo serviço `getRandomQuestions` que expõe apenas dados públicos (sem isCorrect) e inclui suporte à interface de cache (Redis).
- [x] **Fase 5: Integração Back vs Engine** -> API conectada ao Socket.io com Redis.
- [x] **Fase 7: Front do Jogo** -> Interface portada do mock estático para React (Next.js) com integração Socket.io concluída.

## Em Andamento
- [ ] **Integração Turnstile / Ajustes Finais** -> Finalizar detalhes de UI real e validação.
- **apps/game-server** configurado com NestJS e Socket.io.
- `LobbyGateway` criado: gere eventos `lobby:create` e `lobby:join`, integração de state room no Redis e códigos de convite numéricos/tokens JWT.
- `GameGateway` criado: gere fluxo `game:ready`, posicionamento aleatório (`placeFleetRandom`), fluxo de resposta validada contra DB (`game:answer`) e ataques (`game:attack`).


---

## Checkpoint 1 — 2026-06-05 — Fundação do monorepo + setup .claude

**Fases:** 0 (parcial) + 1 (fundação).

Feito:
- Setup `.claude`: skill **caveman** instalada + hooks de auto-ativação + `settings.json` (statusline caveman).
- `CLAUDE.md` (raiz) com contexto, stack fechada, regras invioláveis e modo caveman.
- Pasta de estado `project-state/` (este arquivo + `HANDOFF.md`).
- Monorepo pnpm + Turborepo: `turbo.json`, `pnpm-workspace.yaml`, `tsconfig.base.json` (TS strict), `.gitignore`, `.env.example`.
- `packages/shared`: constantes do domínio (faixas, 7 matérias, frota 10×10, dica a cada 3) + contratos Zod dos eventos de socket (cliente↔servidor) com a regra "gabarito/posições nunca vão ao cliente".
- `packages/game-engine`: Batalha Naval pura — `placeFleetRandom`, `resolveAttack`, `isFleetDestroyed`, `computeHint` + testes Vitest.
- `packages/db`: schema Drizzle (users, subjects, questions, question_options, matches) + seed manual (7 matérias + perguntas iniciais por faixa).
- `apps/web` e `apps/game-server`: placeholders válidos com README do próximo passo.

Verificado:
- Engine sanity-check: 2000 posicionamentos sem overlap/OOB; afundar/miss-idempotente/destruir-frota OK.

Pendências abertas:
- **find-skills não concluído** (varredura de skills de dev) — `skills find` é TUI interativo, retorna vazio headless. Refazer no workflow real.
- `pnpm install` não rodado (ambiente efêmero).
- Apps ainda são placeholders.

Próximo: **Fase 2 — Auth & segurança** (ver `HANDOFF.md`).

---

## Checkpoint 3 — 2026-06-05 — Fase 2 (parcial): core de segurança

Feito:
- **`packages/auth`** criado: `password.ts` (Argon2id), `tokens.ts` (jose access+refresh + rotação por jti), `signing.ts` (HMAC p/ convite/email + `generateNumericCode`), `rate-limit.ts` (sliding window sobre `KvStore`), `turnstile.ts` (verify Cloudflare), `schemas.ts` (Zod register/login + política de senha), `email-verification.ts`, `index.ts`, `auth.test.ts`.
- **`apps/web/src/lib/security-headers.ts`**: CSP builder (Google Fonts, data img, Turnstile, WS) + headers estáticos (HSTS, nosniff, frame DENY, Referrer/Permissions-Policy).

Faltou na Fase 2 (retomar): `apps/web` middleware (CSP nonce + rate-limit), `lib/auth.ts` (NextAuth/Credentials), rotas `/api/auth/*` (register/refresh/logout/verify-email), `next.config.mjs`, deps reais + `pnpm install`.

Pendências: nada compilado/testado (sem install); apps sem scaffold real; rotação de refresh precisa de Redis.

Próximo: terminar Fase 2 → Fase 3 (perguntas/cache). Detalhe em `HANDOFF.md`.

---

## Checkpoint 2 — 2026-06-05 — Skills (Fase 0) + decisão NestJS

Feito:
- Instaladas 12 skills em `.claude/skills/` (caveman + 11 de dev: next/framer/motion/nestjs×3/nodejs×2/websocket×2). Registrado em `docs/skills-instaladas.md` + `skills-lock.json`.
- Limpeza: instalador copiou para ~46 dotdirs de agents; todos removidos (via permissão de delete do Cowork). Fonte de verdade = `.claude/skills`. `.gitignore` atualizado para ignorar litter futuro.
- **Decisão: backend = NestJS** (+ Socket.io gateway). Refletido em `CLAUDE.md`, `PLANO §4/§16`, `apps/game-server/README.md`.

Pendências abertas:
- `pnpm install` não rodado; apps ainda placeholders.
- Sem skills de Drizzle/Redis/Auth.js no registry.

Próximo: **Fase 2 — Auth & segurança** (ver `HANDOFF.md`).
