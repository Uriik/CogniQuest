# @cogniquest/game-server (placeholder)

Servidor de jogo **NestJS** (Node.js) + Socket.io gateway. Autoridade única do estado de partida. Deploy: Cloud Run (WebSockets habilitado).

## Próximo passo (Fase 4 / Fase 6)

1. Scaffold: `nest new` (ou estrutura manual) com `@nestjs/core`, `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`, `@socket.io/redis-adapter`, `ioredis`, `zod`, `@cogniquest/shared`, `@cogniquest/game-engine`, `@cogniquest/db`.
2. Estrutura modular sugerida:
   - `LobbyModule` (gateway + service) — criar/entrar sala, convite link/código, presença (Redis).
   - `GameModule` (gateway + service) — turnos, perguntas, ataques, dicas.
   - `QuestionsModule` — sorteio + cache Redis (sem gabarito no payload).
   - `common/` — ZodValidationPipe, guards de rate limit, filtros de exceção.
3. Validar TODO payload de socket com os schemas Zod de `@cogniquest/shared` (`lobbyCreateSchema`, `gameAnswerSchema`, ...).
4. Partida: `placeFleetRandom` (posições só no servidor), entregar `PublicQuestion` (sem gabarito), validar resposta no servidor, `resolveAttack`, `computeHint` a cada 3 acertos.
5. Regra de ouro: resposta correta e posições de navio NUNCA vão ao cliente.
6. `@socket.io/redis-adapter` (Pub/Sub) para escalar no Cloud Run. Persistir resultado em `matches` ao fim.

## Skills relevantes (instaladas em `.claude/skills`)

`nestjs-best-practices`, `nestjs-patterns`, `nestjs-expert`, `nodejs-backend-patterns`, `nodejs-best-practices`, `websocket-engineer`, `websocket-security`.

Ver `PLANO_DE_IMPLEMENTACAO.md` §7, §8, §11.
