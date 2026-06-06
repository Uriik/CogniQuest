# Backend Architecture Rules (Game Server)

## 1. WebSockets & Broadcasting
- **Immutable Public State**: A interface `PublicGameState` compartilhada com o cliente não deve conter lógica dedutiva baseada na sessão (ex: mesclar ou omitir dados achando que sabe quem é o destinatário).
- **No Client Guessing**: Como o NestJS emite eventos de `game:state` em broadcast para a `roomId` inteira, enviar `enemyRevealed` deduzido a partir de `gameState.turn` fará com que o mapa pisque ou reverta no frontend de todos os clientes se o turno mudar. O backend **DEVE** enviar ambos (`hostRevealed` e `guestRevealed`) e o Frontend escolhe qual exibir cruzando as informações com o token JWT logado.
- **Immediate Synchronization**: Quando iniciar uma partida (`handleGameReady`), o envio da notificação `game:start` deve ser **imediatamente** acompanhado de `this.server.to(roomId).emit('game:state', ...)` para que o layout UI cliente desbloqueie a renderização principal.

## 2. Core Game Engine Isolation
- Toda a lógica pura da Batalha Naval (cálculo de grids, colisões, barcos) deve permanecer no pacote `@cogniquest/game-engine`. O Gateway serve apenas como um despachante (Controller) e nunca deve tentar recalcular posições.

## 3. Database & Cache
- Partidas em andamento devem operar 100% no Redis por razões de performance e tolerância a falhas.
- O PostgreSQL (`@cogniquest/db`) deve ser acionado estritamente no final da partida (Game Over) para gravar logs e persistência histórica na tabela `matches`.
- **Estatísticas de Duelo**: As estatísticas de "Questões Respondidas" (`hostAnswers`, `guestAnswers`) não são deduzidas pelo frontend. O Game Server DEVE incrementar esses contadores a cada tiro validado (`handleGameAnswer`) e empacotar no `PublicGameState` via WebSocket.

## 4. Frota e Balanceamento (Shared Config)
- A composição da Frota de Batalha Naval (`FLEET`) e os tamanhos dos navios são globais e definidos no pacote `@cogniquest/shared/constants.ts`.
- O servidor nunca deve hardcodar instâncias (`new Submarine()`). Ele utiliza dinamicamente o `FLEET` para randomizar os navios no motor (`placeFleetRandom`). Alterar a regra da frota no frontend obrigatoriamente altera no backend.
