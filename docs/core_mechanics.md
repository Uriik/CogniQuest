# Core Mechanics e Regras de Negócio

CogniQuest não é apenas um quiz simples. É uma plataforma que exige sincronismo entre usuários, segurança na resolução de partidas e persistência confiável. 

## 1. Como funciona o Core (Lobby & Gameplay)

A principal jornada do jogador ocorre da seguinte maneira:

### Criação de Sala (Lobby)
1. **Configuração:** O usuário acessa a página de criação, seleciona o Modo (Solo vs Máquina ou Duo PvP), a Matéria (Matemática, História, etc.) e a Série Escolar.
2. **Socket Handshake:** Ao enviar o formulário, o frontend via Next.js passa esses dados para o `lobby.gateway.ts` no servidor NestJS usando Socket.io.
3. **Alocação de ID:** O Game Server gera um `roomId` criptograficamente seguro e registra o "Lobby" em memória. Se a sala for pública, todos os outros usuários conectados recebem um evento `lobby:updated` e veem a sala surgir na sua tela inicial em tempo real.
4. **Join:** Ao atingir a capacidade (ou se for solo), a partida é ativada.

### O Websocket no Core da Partida
Durante a partida ativa (`game.gateway.ts`), os jogadores se alternam atacando no tabuleiro (radar).
- Quando um jogador ataca, o servidor busca uma **pergunta no banco** da matéria e série definida e envia aos clientes.
- O jogo "trava" o tempo. Quem responder mais rápido e de forma correta envia o evento `game:answer`.
- O servidor é a **única fonte da verdade** (Authoritative Server). Ele calcula a resposta, altera os hitpoints e emite a atualização de estado via `game:sync`. Nenhuma lógica de dano é processada no cliente, impedindo trapaças.

## 2. Uso do Cache (Upstash Redis)

Como o Node.js lida com memória em uma única thread, guardar todos os lobbys do servidor apenas em memória local limitaria o número de partidas que uma instância aguenta e impediria escalar o servidor de jogos horizontalmente.
- O **Redis** foi usado como fonte unificada de estado global para salas e presença.
- O Redis armazena metadados rápidos (quem está online, quantas salas abertas).

## 3. Tabelas Utilizadas (Supabase)

Para garantir integridade, desenhamos o banco via Drizzle com as seguintes tabelas chave:
- `users`: Armazena credenciais (hashed), `grade` (série do aluno), pontuações gerais.
- `subjects`: Tabela de catálogo (Matemática, Física).
- `questions` e `question_options`: Banco de milhares de questões, amarradas à série.
- `matches`: Histórico das partidas concluídas. Útil para auditoria e ranking no dashboard.
- `match_players`: Qual jogador participou de qual partida e sua pontuação.

## 4. Testes (Playwright e Unitários)

O ecossistema assegura qualidade através de:
- **Testes Unitários:** O core do NestJS possui lógicas complexas de validação testadas através de suites no Jest, onde cada gateway é instanciado em *memory* sem dependência do Redis real.
- **Playwright (Testes End-to-End):** Simulamos usuários reais logando, preenchendo o Turnstile e navegando pela interface (`auth.spec.ts`). Como o Next.js gerencia as rotas protegidas usando Server-Side Sessions, o Playwright intercepta a rede e certifica de que usuários deslogados sejam devidamente rejeitados pelo middleware de autenticação.
