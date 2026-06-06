# Code Review v2 — CogniQuest (2026-06-05)

Re-revisão após o avanço do Antigravity (HANDOFF marca "Fases 0–10, projeto inteiramente implementado"). Compara com a v1 (`CODE_REVIEW_2026-06-05.md`) e com o `PLANO_DE_IMPLEMENTACAO.md`.

**Veredito:** grande evolução — **todos os 3 críticos e os 5 altos da v1 foram corrigidos.** Mas há **1 CRÍTICO novo** (regressão de integração) que impede qualquer partida pelo front, além de alguns bugs MÉDIOS e testes de Fase 9 desalinhados. **Ainda não é "inteiramente implementado/jogável".** Falta uma rodada curta de correção.

---

## 1. Corrigido desde a v1 ✅

| v1 | Item | Como foi resolvido |
|---|---|---|
| C1 | Set/Map perdidos no Redis | `game-engine` agora usa `hits: string[]` e `shots: Record` → sobrevive a JSON. Ataque funciona. |
| C2 | Bypass de Turnstile | `if (!turnstileValid.success)` em login e register. |
| C3 | WebSocket sem auth | `AuthenticatedIoAdapter` (`main.ts`) com `server.use()` validando `verifyAccessToken` e setando `socket.data.userId`; recusa sem token. |
| A1 | Brute force login | Rate limit em login/register/createRoom (Redis via `RedisKvStore`). |
| A2 | Sem Redis adapter | `createAdapter(pub, sub)` plugado no adapter. |
| A3 | CORS WS aberto | Ambos gateways: `cors: { origin: WEB_CLIENT_URL, credentials }`. |
| A4 | Rate limit ausente | Aplicado em `game:answer`, `game:attack`, `lobby:create`, login, register. |
| A5 | Handler de dica | `@SubscribeMessage('game:useHint')` + `computeHint` + decremento. |
| M3 | Persistir partida | `saveMatch` insere em `matches` na vitória e no abandono. |
| M4 | Desconexão | `handleDisconnect` com grace period de 15s → `abandoned` + reconexão em `game:ready`. |

Conformidade com o plano agora **forte**: regras invioláveis (resposta e posições nunca no cliente) mantidas; Zod em todas as fronteiras; rate limit; CORS restrito; servidor-autoritativo de fato.

---

## 2. CRÍTICO novo (bloqueia o jogo) 🔴

### N1 — Cliente do socket não envia o token → toda conexão é recusada
O servidor passou a **exigir** `socket.handshake.auth.token` (recusa "Missing token"). Mas `apps/web/src/lib/socket.ts` cria o socket **sem** `auth`:
```ts
socket = io(url, { autoConnect: false, withCredentials: true }); // falta auth: { token }
```
Pior: o access token só existe **server-side** dentro do JWT do NextAuth (`token.accessToken` em `lib/auth.ts`) — não há nada expondo-o ao JS do cliente. Resultado: **nenhum socket conecta**; lobby e partida ficam inacessíveis pela aplicação. Regressão direta de C3 (auth adicionada no servidor sem atualizar o cliente).

**Correção:**
1. Expor o access token ao cliente — ex.: rota `GET /api/auth/socket-token` (autenticada por sessão NextAuth) que devolve `session.token.accessToken`; ou colocar o accessToken na `session` no callback `session()`.
2. No cliente, buscar o token e passar: `io(url, { auth: { token }, autoConnect:false })` (e reconectar quando rotacionar).
3. Teste E2E que valide conexão autenticada de ponta a ponta.

---

## 3. ALTO 🟠

### H1 — Contrato de `game:hintResult` divergente → dica chega vazia
Gateway: `client.emit('game:hintResult', hint)` (envia o `HintPayload` cru). Contrato/cliente esperam `{ hint, hintsAvailable }` e fazem `({ hint, hintsAvailable }) => ...`. Logo o cliente recebe `hint = undefined`. Emitir `{ hint, hintsAvailable: isHost ? gameState.hostHints : gameState.guestHints }`.

### H2 — CSP nonce não conectado ao Next → app pode não renderizar
`middleware.ts` gera nonce e o coloca no `Content-Security-Policy` (`script-src 'self' 'nonce-…'`, sem `unsafe-inline`), mas **não injeta o nonce nos scripts do Next** (padrão oficial: setar `x-nonce` no request header e lê-lo no root layout para os `<script>`/Next). Sem isso, os scripts inline de bootstrap/hidratação do Next são bloqueados pela CSP em produção → tela branca. Implementar o padrão de nonce do Next 14 (ou, pior e temporário, permitir `'unsafe-inline'`).

### H3 — `lobby:create` grava `guestId: null` no hash do Redis
`redis.hset(room, state)` com `guestId: null`. ioredis tende a serializar como string `"null"` (truthy). Na entrada, `if (roomData.guestId && roomData.guestId !== user)` passaria a barrar o primeiro guest com `ROOM_FULL`. Verificar e corrigir: não gravar `guestId` quando nulo (ou usar `""`).

---

## 4. MÉDIO 🟡

- **M1 — Verificação de e-mail não exigida no login.** `verify-email` grava `emailVerifiedAt`, mas `authorize` (NextAuth) não checa. PLANO: verificação obrigatória antes de jogar.
- **M2 — Rota `/api/auth/refresh` morta/redundante.** Lê cookie `refresh_token` que nunca é setado; o refresh real acontece no callback `jwt` do NextAuth. Remover a rota ou unificar a estratégia.
- **M3 — Testes E2E (Fase 9) desalinhados.** `e2e/gameplay.spec.ts` usa `ageBand: '18+'` (inválido — faixas são `6-8|9-11|12-14|15+`, o `registerSchema` rejeita) e `subjectSlug: 'matematica'` (slug correto é `math`); seletores/`data-testid` assumidos. Provavelmente não passam. Fase 9 "QA" está superficial — alinhar fixtures aos enums reais + mockar Turnstile em test.
- **M4 — Drift de contrato.** `game:over` emite `{ winnerId, reason }` (contrato é só `{ winnerId }`); `lobby:created` não existe em `ServerToClientEvents`. Atualizar `socket-events.ts`.
- **M5 — Fallback `AUTH_SECRET || 'dev-secret'`** no `main.ts` (auth do socket). Lobby já falha sem o segredo; aplicar o mesmo no adapter (falhar em vez de segredo previsível).

---

## 5. BAIXO / polimento 🔵

- **B1 — `getPublicState` por perspectiva no broadcast:** calcula `enemyRevealed` pela vez atual e dá `to(roomId).emit` (ambos recebem a mesma visão). Não vaza posição, mas mostra board errado ao oponente. Enviar estado por jogador.
- **B2 — Cache de perguntas não usado:** `getRandomQuestions` chamado sem `store` no gateway (PLANO §6.3 pede cache Redis).
- **B3 — Sprawl de clientes Redis:** `new Redis(...)` em cada gateway + singleton no `db`. Centralizar.
- **B4 — `QuestionModal`** mostra tags fixas em vez de matéria/faixa.
- **B5 — `saveMatch`** usa `startedAt: new Date()` (momento do fim) e `as any`; guardar o início real.
- **B6 — `handleDisconnect` com `setTimeout`** de 15s não é confiável em Cloud Run (instância pode escalar a zero); para robustez, usar TTL/expiry-event do Redis ou job.

---

## 6. HANDOFF/PROGRESSO × realidade

- HANDOFF: "Fases 0 a 10, projeto inteiramente implementado". **Parcialmente verdadeiro:** as features existem, mas N1 impede jogar pelo front e os E2E não estão verdes/alinhados. Sugestão: marcar como **"Fases 0–8 completas; Fase 9 (QA) parcial; bloqueador N1 aberto"** e só declarar "implementado" após N1 + H1–H3 + E2E verdes em infra real (Postgres+Redis).

---

## 7. Ordem de correção sugerida

1. **N1** — token do socket no cliente (destrava o jogo). 
2. **H1** — payload de `game:hintResult`. 
3. **H3** — `guestId` nulo no lobby. 
4. **H2** — CSP nonce no Next. 
5. **M1** e-mail verificado no login; **M2** remover refresh route; **M3** alinhar E2E; **M4** contratos.
6. Polimento B1–B6. Depois rodar `pnpm test` + E2E real e então fechar a Fase 9.

> Revisão estática (sem runtime). N1/H3 precisam de confirmação com servidores rodando.
