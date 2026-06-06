# Code Review — CogniQuest (2026-06-05)

Revisão do estado entregue até a "Fase 8" (trabalho do Antigravity). Avalia conformidade com `PLANO_DE_IMPLEMENTACAO.md` (regras invioláveis §8, segurança §9) e qualidade do código.

**Veredito:** boa cobertura de funcionalidades e as duas regras de ouro de exposição de dados estão respeitadas, **mas** há **3 bugs CRÍTICOS** que impedem o jogo de funcionar e quebram a segurança de conta. O projeto **não** está pronto para a Fase 9 (Hardening) — precisa de uma rodada de correção antes. Os docs de estado (`HANDOFF`/`PROGRESSO`) **superestimam** a conclusão (Fases 2 e 8 estão parciais).

---

## 1. Conformidade com as regras invioláveis do plano

| Regra (PLANO §8/§9, CLAUDE.md) | Status | Nota |
|---|---|---|
| Resposta correta NUNCA vai ao cliente | ✅ OK | `game:question` envia só `id/prompt/options`; validação via `checkAnswer` no servidor (`packages/db/questions.ts`). |
| Posições de navios NUNCA expostas | ✅ OK | `game:start` envia só `fleetSummary` (sem coords); `game:state.yourFleet` vazio; `enemyRevealed` só hit/miss. |
| Posicionamento aleatório no servidor | ✅ OK | `placeFleetRandom()` no `game:ready`. |
| Toda entrada validada com Zod | ✅ OK | Gateways e rotas usam `*.parse`/`safeParse`. |
| Rate limit (login, criar sala, responder) | ❌ FALTA | Só TODO no middleware; `RATE_RULES` nunca usado. |
| CORS restrito à origem oficial | ⚠️ PARCIAL | HTTP ok no `main.ts`, mas o gateway WS usa `cors: true` (aberto). |
| Segredos fora do código | ⚠️ PARCIAL | Há fallbacks perigosos `|| 'dev-secret'` no assinador de convites. |

As duas regras mais importantes (resposta e posições) **estão cumpridas**. As falhas estão em segurança de borda/conta.

---

## 2. CRÍTICO (bloqueia funcionamento ou segurança)

### C1 — Estado do jogo perde `Set`/`Map` ao passar pelo Redis → ataques quebram
`packages/game-engine/battleship.ts` modela `PlacedShip.hits` como **`Set`** e `PlayerBoard.shots` como **`Map`**. No `game.gateway.ts` o `gameState` (que contém `hostFleet`/`guestFleet`) é salvo com `JSON.stringify` e relido com `JSON.parse`. **`Set`/`Map` não sobrevivem a JSON** — viram `{}`.

Consequência: em `game:attack`, `resolveAttack` chama `ship.hits.add(...)` → `TypeError: hits.add is not a function` → cai no `catch` → emite `INVALID_PAYLOAD`. **Nenhum ataque funciona e a vitória (`isFleetDestroyed` usa `.size`) nunca dispara.** O jogo é injogável.

**Correção:** serializar/desserializar o board explicitamente. Opções: (a) adicionar `serializeBoard/deserializeBoard` no `game-engine` convertendo `Set`→array e `Map`→entries; ou (b) trocar `Set<string>` por `string[]` e `Map` por `Record<string,Outcome>` na engine (mais simples para persistência). Cobrir com teste de round-trip JSON.

### C2 — Turnstile (CAPTCHA) nunca bloqueia — bypass de bot
`verifyTurnstile` retorna **um objeto** `{ success, errorCodes }`. Em `apps/web/src/lib/auth.ts` e `apps/web/src/app/api/auth/register/route.ts` o código faz:
```ts
const turnstileValid = await verifyTurnstile(...);
if (!turnstileValid) { /* rejeita */ }
```
Objeto é sempre *truthy* → `!turnstileValid` é sempre `false` → **o captcha nunca reprova**, mesmo com token inválido. Anti-bot anulado (contraria §9.2).

**Correção:** `if (!turnstileValid.success)`. Aplicar nos dois arquivos. Adicionar teste.

### C3 — WebSocket sem autenticação → identidade falsificável
Em ambos os gateways: `const userId = client.data?.userId || client.id;`. **Nada popula `client.data.userId`** (não há middleware `io.use()` validando o JWT de acesso). Logo a identidade é o `socket.id` anônimo.

Consequências: (1) qualquer um conecta sem login e cria/entra em salas; (2) dá para se passar por outro jogador / jogar o turno alheio enviando o `roomId`; (3) identidade muda a cada reconexão (quebra turnos e `this.server.to(hostId)`). Contraria o princípio "segurança primeiro" e o modelo servidor-autoritativo.

**Correção:** handshake autenticado — `io.use((socket,next)=>{ verifyAccessToken(token) })` lendo o access token (do auth handshake `socket.handshake.auth.token` ou cookie), setando `socket.data.userId`. Recusar conexão sem token válido. O `@cogniquest/auth/verifyAccessToken` já existe; falta plugá-lo.

---

## 3. ALTO

### A1 — Dois sistemas de auth paralelos; rota `/api/auth/refresh` morta
`lib/auth.ts` (NextAuth) já faz rotação de access/refresh dentro do callback `jwt`. Em paralelo, `/api/auth/refresh/route.ts` lê um cookie `refresh_token` que **nunca é setado** (nem no register, nem no NextAuth). A rota é inalcançável/quebrada e o access token gerado não é consumido por ninguém (o game-server não o valida — ver C3). Decidir UM mecanismo. Recomendado: manter o do NextAuth e remover a rota custom, OU usar a rota custom e parar de duplicar no callback.

### A2 — Sem Redis adapter no Socket.io (escala Cloud Run quebrada)
`main.ts` usa `IoAdapter` padrão. PLANO §5/§15 exige `@socket.io/redis-adapter` (Pub/Sub) — sem ele, com mais de 1 instância no Cloud Run os `emit` entre jogadores em instâncias diferentes não chegam. Dependência nem está no `package.json`.

### A3 — CORS do WebSocket aberto
`@WebSocketGateway({ cors: true })` (nos dois gateways) libera qualquer origem para o canal WS, anulando o `enableCors` restrito do `main.ts`. Trocar por `{ cors: { origin: process.env.WEB_CLIENT_URL, credentials: true } }`.

### A4 — Rate limiting ausente
`middleware.ts` só tem TODO. Login/registro sem limite = brute force/credential stuffing; `game:answer` sem limite = spam. O core (`checkRateLimit`, `RATE_RULES`) existe mas não é usado. Implementar nas rotas de auth (Edge precisa de store compatível, ex. Upstash REST, ou mover a checagem para um route handler Node) e nos handlers de socket.

### A5 — Handler de dica ausente
O contrato define `game:useHint`/`game:hintResult` e `computeHint` existe na engine, mas **não há `@SubscribeMessage('game:useHint')`** no `game.gateway.ts`. As dicas acumulam (`hostHints++`) mas o jogador não consegue usá-las. Feature incompleta (decisão fixa do plano: dica a cada 3 acertos).

---

## 4. MÉDIO

- **M1 — Verificação de e-mail não é exigida.** `verify-email` grava `emailVerifiedAt`, mas o login (NextAuth) não checa. PLANO: verificação obrigatória antes de jogar.
- **M2 — CSP nonce não conectado ao Next.** O `middleware.ts` gera nonce e o põe no header, mas não injeta nos scripts do Next (padrão: ler o nonce via header na RSC). Resultado: ou os scripts inline do Next são bloqueados, ou o nonce é inócuo. Revisar o padrão oficial de CSP+nonce do Next 14.
- **M3 — Persistência de partida não ocorre (Fase 8 incompleta).** Em `game:over`, o gateway só apaga o Redis e marca `room status=finished`; **não grava na tabela `matches`**. PROGRESSO diz "Persistência e histórico" concluída — não confere.
- **M4 — Desconexão sem grace period.** `handleDisconnect` é no-op. PLANO §7.4 pede reconexão/`abandoned`. Sem isso, derrubar a aba trava a partida.
- **M5 — `lobby.gateway` salva `guestId: null` no hash.** `redis.hset(room, state)` com `guestId:null` tende a virar string `"null"` (truthy) → a checagem de sala cheia (`roomData.guestId && ...`) pode bloquear o primeiro guest. Inicializar sem o campo ou com `""`.
- **M6 — `lobby:created` fora do contrato.** O gateway emite `lobby:created`, mas `ServerToClientEvents` não o define (só `lobby:updated`). Drift de tipos cliente↔servidor.
- **M7 — Cache de perguntas não usado no jogo.** `getRandomQuestions` é chamado sem `store` no gateway → busca direta no DB toda vez (PLANO §6.3 pede cache Redis). Além disso o "shuffle" `sort(()=>Math.random()-0.5)` é enviesado.

---

## 5. BAIXO / polimento

- **B1 — Sprawl de clientes Redis:** cada gateway faz `new Redis(...)` no topo do módulo + `packages/db/redis.ts` tem outro singleton. Centralizar em um provider.
- **B2 — `QuestionModal`** mostra tags fixas "Desafio/Atenção" em vez de matéria/faixa reais.
- **B3 — Estado público broadcast:** `getPublicState` calcula `enemyRevealed` pela vez atual e dá `server.to(roomId).emit` (ambos recebem a mesma perspectiva). Não vaza posição, mas mostra o board errado para o oponente. Enviar estado por jogador.
- **B4 — Fallbacks de segredo:** `process.env.AUTH_SECRET || 'dev-secret'` no `lobby.gateway` — em prod sem env vira segredo previsível. Falhar se ausente.

---

## 6. Divergências HANDOFF/PROGRESSO × realidade

- Docs afirmam **"Fase 0 a 8 concluídas"**. Na prática:
  - **Fase 2** (rate limit) — incompleta (A4).
  - **Fase 8** (persistência/abandono) — não implementada (M3, M4).
  - Funcionalidade central de jogo (ataque) — quebrada (C1).
- Sugestão: rebaixar o HANDOFF para "Fases 0–7 parciais; pendências críticas abertas" e só ir para a Fase 9 após corrigir C1–C3 e A1–A5.

---

## 7. Plano de correção sugerido (ordem)

1. **C1** serialização do board (destrava o jogo) + teste round-trip.
2. **C2** `turnstileValid.success` (2 arquivos).
3. **C3** middleware de auth no Socket.io (`verifyAccessToken`).
4. **A1** unificar auth; **A3** CORS WS; **A2** Redis adapter; **A5** handler de dica.
5. **A4** rate limit (auth + socket).
6. **M3/M4** persistir `matches` + grace period de desconexão.
7. **M1/M2** exigir e-mail verificado + CSP nonce correto.
8. Limpeza M5–M7, B1–B4.
9. Só então **Fase 9** (QA/carga/security review).

> Nota: nada disso foi testado em runtime nesta revisão (estática). Após as correções, rodar `pnpm test` e um fluxo E2E real (Postgres+Redis) para confirmar C1/C3.
