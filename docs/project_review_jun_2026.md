# Histórico de Ajustes e Code Review - CogniQuest

Este documento centraliza todo o contexto das alterações discutidas, projetadas e implementadas ao longo das últimas sessões de desenvolvimento. Ele serve como um **ponto de verdade** para garantir que as regras de negócio definidas pelo usuário foram rigorosamente implementadas.

---

## 1. Contexto Geral dos Ajustes Realizados

Ao longo do desenvolvimento, focamos em resolver problemas de fluxo de usuário, responsividade, sincronia de estado e refatoração da mecânica principal do jogo (Battleship + Quiz).

### A. Ajustes de Layout e UX
1. **Responsividade Base**: O sistema foi travado entre `1080px` (mínimo) e `1920px` (máximo) para garantir que componentes (como o carrossel do dashboard) ficassem perfeitamente centralizados sem quebrar o layout.
2. **Tela de Recuperação de Senha**: Adicionado o espaçamento faltante entre a opção de redefinir a senha e a de alterar o e-mail.
3. **Menu de Usuário**: 
   - Remoção do nome estático genérico ("Jogador") e substituição pelo `displayName` real do banco de dados na navbar.
   - Adicionado o botão de **Sair (Logout)** ao clicar no ícone do usuário, redirecionando para a tela de login.
4. **Layout do Modal de Perguntas**: Correção visual para inserir espaço e parênteses nas alternativas. Exemplo: De `A33` para `A) 33`.

### B. Funcionalidades de Lobby e Salas
1. **Correção de Criação de Sala**: Resolução do bug de "sala criando infinitamente" tanto no modo Solo quanto no PvP.
2. **Sistema de Convites**: 
   - Salas em modo "Dupla" que estão aguardando oponente agora exibem a opção de gerar/copiar um **Código de Convite** ou URL dinâmico dentro do próprio `GamePage`.
   - Adição de um input "Possui um Código?" no `LobbyPage` para permitir a entrada forçada em salas privadas.
3. **Regras de Privacidade**:
   - Salas Privadas agora rejeitam conexões não autorizadas no backend (`lobby:join`). Elas exigem estritamente a senha (código) ou o link de convite.
   - Salas Públicas continuam abertas para entrada normal ou por convite.
4. **Gestão do Ciclo de Vida da Sala**:
   - **Transferência de Host**: Se o Host atual sair da sala ou desconectar, os privilégios de dono passam automaticamente para o Guest.
   - **Destruição da Sala**: Adição do botão "Sair" na sala de espera. Se o último sobrevivente sair, a sala é apagada da memória (Redis) para não se tornar uma sala fantasma.

### C. Refatoração da Mecânica In-Game
1. **Placar com Nomes Reais**: O servidor agora faz um fetch no Drizzle ORM assim que os usuários se conectam, emitindo um `GameState` público que contém os nomes reais, atualizando o painel de telemetria superior.
2. **Inversão da Mecânica do Radar (Ataque com Intenção)**:
   - *Antes*: O servidor lançava uma pergunta imediatamente e o mapa ficava bloqueado.
   - *Agora*: É o turno do jogador. Ele escolhe onde atirar no mapa primeiro (dispara `game:attackIntent`). Só então o servidor retém a coordenada e devolve a Pergunta Educativa.
3. **Feedback Visual de Resposta (In-Game)**:
   - Se responder **Certo**: A alternativa pisca em Verde por 2,5 segundos, a tela fecha e o torpedo é atirado na coordenada retida.
   - Se responder **Errado**: A alternativa pisca em Vermelho, a verdadeira resposta é pintada de Verde para fins pedagógicos (2,5s), o ataque falha (Miss) e a vez é passada adiante.
4. **Regras de Turno Cegas (Solo e PvP)**: Independentemente de acertar ou errar a pergunta, o turno de ataque SEMPRE passa para o próximo jogador (seja Humano ou Máquina). No modo Solo, se o jogador errar a conta, a IA ganha a vez de atirar de volta.

---

## 2. Code Review e Auditoria

Abaixo faremos uma auditoria técnica das principais funcionalidades de negócio levantadas pelo usuário para garantir que o código reflete a decisão.

### Feature: Inversão da Mecânica (Radar antes da Pergunta)
* **Objetivo**: O usuário clica no mapa, o backend salva a coordenada e devolve a pergunta.
* **Review**: **PASSOU**. 
  - O `page.tsx` no Frontend usa a função `handleAttackIntent` se for `isMyTurn`.
  - O Backend (`game.gateway.ts`) implementou o `@SubscribeMessage('game:attackIntent')`, que injeta `{x, y}` em `gameState.pendingAttack` e emite `game:question` com base no cache. O fluxo original de emitir pergunta ao iniciar o turno foi removido.

### Feature: Feedback Visual Educativo
* **Objetivo**: Verde para Certo. Vermelho para Errado, sublinhando o Certo. Turno passa independentemente.
* **Review**: **PASSOU**.
  - O evento `game:answerResult` foi expandido em `socket-events.ts` para portar `correctOptionId` e `selectedOptionId`.
  - O Frontend (`useGameSocket.ts`) adicionou o estado `answerFeedback` que é limpo apenas após um `setTimeout` de 2500ms.
  - O CSS (`globals.css`) ganhou as classes brutas: `.feedback-correct`, `.feedback-wrong` e `.feedback-correct-answer` (superando a especificidade conflitante do Tailwind pré-existente).

### Feature: Punição no Modo Solo
* **Objetivo**: Errar no modo Solo também deve resultar em perda de turno para a Máquina jogar.
* **Review**: **PASSOU**.
  - No `game.gateway.ts`, ao processar um Erro na resposta, a instrução de ignorar a Máquina (`if (roomData.mode !== 'solo')`) foi obliterada.
  - Agora, na linha de execução de resposta (ou no sucesso de `executeAttack`), `gameState.turn = isHost ? guestId : hostId` corre solto. Se `guestId` for `'AI'`, a condicional subsequente invoca imediatamente `this.simulateAITurn(roomId)`.

### Feature: Destruição e Herança de Salas
* **Objetivo**: Quem fica vivo herda a sala. Se a sala ficar vazia, exclua.
* **Review**: **PASSOU**.
  - No `handleDisconnect` do `lobby.gateway.ts`, o backend executa: `if (room.hostId === userId && room.guestId) { room.hostId = room.guestId }`.
  - Caso não haja ninguém: `redis.hset(..., status: 'finished')` ou deleção total se não iniciada. O Frontend engatilha isso de forma pró-ativa com o botão Sair (`lobby:leave`), acelerando a limpeza sem esperar 15 segundos do Ping/Pong nativo.

## Conclusão da Auditoria
Todos os débitos e funcionalidades solicitados foram mapeados no código TypeScript de Frontend e Backend. A lógica imperativa da mecânica de jogos (Inversão + Turnos Solos) atende aos requisitos exatos do escopo delineado pelo Usuário.

---

## 3. Arquitetura de Estado e WebSockets (Regras Micro)

Após a estabilização de bugs relacionados à interface invisível e pontuações zeradas, estabelecemos regras arquiteturais estritas para o fluxo de dados em tempo real:

### A. Separação de Payload no Backend (Anti-Fantasma)
* **Regra de Negócio**: O servidor NÃO pode tentar deduzir o que o cliente vai ver com base no turno (`turn`) no momento de um broadcast (ex: emitir `enemyRevealed` dinamicamente).
* **Decisão Arquitetural**: A interface `PublicGameState` sempre trafega os dados crus de ambos os jogadores (`hostFleet`, `guestFleet`, `hostRevealed`, `guestRevealed`). A emissão é idêntica para todos (`server.to(roomId).emit`), garantindo pureza nos eventos do Socket.

### B. Mapeamento Reativo no Frontend
* **Regra de Negócio**: O Frontend é responsável por cruzar as informações públicas do socket com a sessão ativa privada.
* **Decisão Arquitetural**: O hook `useGameSocket.ts` verifica se o usuário autenticado (`session.user.id`) é igual ao `hostId` recebido do servidor. A partir disso, o próprio React extrai do pacote bruto o que é `myFleet` e o que é `enemyRevealed`, populando o estado para o `RadarPanel` sem risco de sobreposição de dados.

### C. Sincronia de Partida (Unblocking UI)
* **Regra de Negócio**: O jogador nunca pode ficar preso em "Iniciando Varredura" aguardando o primeiro turno para receber o tabuleiro inicial.
* **Decisão Arquitetural**: O método `handleGameReady` no Gateway, responsável por inicializar os arrays no Redis, **deve emitir sincronicamente** o evento `game:state` logo após disparar `game:start`. Assim, o Frontend inicia renderizando a Grid imediatamente.

### D. Playwright E2E e Sessões Mockadas
* **Regra de Negócio**: Os testes End-to-End não devem depender do fluxo completo de UI do Auth.js para evitar instabilidades ou limites de taxa (Rate Limit).
* **Decisão Arquitetural**: Utilizamos uma rota `/api/auth/test-session` que injeta diretamente o cookie JWT assinado (`authjs.session-token`) para o Playwright. 
* **Restrição Crítica (UUID)**: O Drizzle ORM no PostgreSQL exige estritamente que a coluna `id` na tabela `users` seja do tipo UUID. Nunca utilize IDs falsos como `"test-user-id"` nos testes mockados se esse ID for tocar em queries do Drizzle (como na busca do Host no WebSocket), ou ocorrerá um crash silencioso do lado do PostgreSQL (`invalid input syntax for type uuid`). Use sempre UUIDs válidos (ex: `"12345678-1234-1234-1234-123456789012"`).

### E. Popularização de Banco e Seed
* **Regra de Negócio**: O jogo exige perguntas reais para funcionar.
* **Decisão Arquitetural**: Se a tabela `questions` estiver vazia, o jogo irá crashar silenciosamente durante a tentativa de ataque (`cannot read properties of undefined`). É obrigatório rodar o script de seed (`pnpm --filter @cogniquest/db run db:seed`) para alimentar o banco de dados antes de iniciar os testes ou rodar localmente.
