# Core Mechanics e Regras de Negócio

CogniQuest não é apenas um quiz simples. É uma plataforma que exige sincronismo entre usuários, segurança na resolução de partidas e persistência confiável. 

## 1. Como funciona o Core (Lobby & Gameplay)

A principal jornada do jogador ocorre da seguinte maneira:

### Criação de Sala (Lobby)
1. **Configuração:** O usuário acessa a página de criação, seleciona o Modo (Solo vs Máquina ou Duo PvP), a Matéria (Matemática, História, etc.) e a Série Escolar.
2. **Evento de socket:** Ao enviar o formulário, o frontend emite `lobby:create` para o `lobby.gateway.ts` (NestJS + Socket.io). Toda entrada é validada por Zod na fronteira; salas privadas exigem senha, armazenada apenas como hash (bcrypt).
3. **Alocação de ID:** O Game Server gera um `roomId` (`randomUUID`) e persiste a sala no **Redis** (não em memória local), com TTL. Se a sala for pública/duo, ela entra no índice público e os demais clientes assinantes recebem `lobby:listed`/`lobby:updated` e a veem surgir em tempo real.
4. **Robustez do ciclo de vida:** A sala recém-criada é marcada com `createdAt` e fica protegida por uma graça contra o "anti-fantasma" do lobby, que removeria salas sem ninguém conectado. Isso cobre a transição da tela de criação para a do jogo, em que o host fica brevemente sem socket. Além disso, o socket do cliente vive em um provider no layout protegido e **sobrevive à navegação** (lobby → criação → jogo), eliminando reconexões e a janela "sem socket".
5. **Join:** Ao entrar o segundo jogador (ou imediatamente, no solo), a sala passa a `ready`/`in_game` e a partida inicia.

### O Websocket no Core da Partida
Durante a partida ativa (`game.gateway.ts`), os jogadores se alternam atacando no tabuleiro (radar).
- **Intenção de ataque:** o jogador emite `game:attackIntent`; o servidor responde com `game:question` — uma questão do lote cacheado, **sem o campo de resposta correta**.
- **Resposta:** o jogador emite `game:answer`. O servidor valida lendo o id da resposta correta do **cache no Redis** (sem tocar o Postgres no caminho quente), emite `game:answerResult` e, em seguida, o estado público completo via `game:state`.
- **Ritmo (UX):** numa resposta errada, o servidor adia (~1,2 s) a revelação da troca de turno e o início da IA, dando tempo de o jogador ver o feedback de certo/errado antes de o modal fechar. O cliente só anuncia "SUA VEZ"/"TURNO DO INIMIGO" quando o turno realmente muda, evitando flicker.
- **Authoritative Server:** a resposta correta e a posição dos navios nunca vão ao cliente. Toda resolução de dano/turno acontece no servidor, impedindo trapaça.

## 2. Uso do Cache (Upstash Redis)

Guardar o estado das partidas apenas em memória local limitaria quantas partidas uma instância aguenta e impediria escalar o game server horizontalmente. O **Redis** é a fonte unificada de estado global, e o adapter de Redis do Socket.io distribui eventos entre instâncias. Usos concretos:

- **Estado de salas e presença:** salas, vínculo usuário→sala, índice público e graças de reconexão vivem no Redis.
- **Lote de questões por matéria/série:** um pool é cacheado no Redis (`qcache:...`), evitando o `ORDER BY RANDOM()` no Postgres a cada partida; as partidas amostram do pool em memória.
- **Validação de resposta sem banco:** o id da resposta correta de cada questão é cacheado por partida (server-only). Validar uma resposta — o evento mais frequente do jogo — vira uma leitura de Redis, com fallback ao Postgres só se o cache expirar.
- **Listagem do lobby eficiente:** os estados das salas são lidos com pipeline (um round-trip) e a presença é checada de forma agregada (uma chamada), em vez de uma consulta por sala.
- **Conexões consolidadas:** os gateways compartilham um único cliente Redis para reduzir a pressão no limite de conexões do provedor sob autoscaling.

## 3. Tabelas Utilizadas (Supabase)

Para garantir integridade, desenhamos o banco via Drizzle. O schema atual tem cinco tabelas:
- `users`: credenciais (senha em hash bcrypt), `display_name`, `grade` (série do aluno), verificação de e-mail.
- `subjects`: catálogo de matérias (slug, nome, ícone).
- `questions`: enunciado, amarrado a `subject_id` e `grade`. Índice em `(subject_id, grade)` para o sorteio de questões.
- `question_options`: alternativas de cada questão, com a flag `is_correct` — **server-only, nunca serializada ao cliente**. Índice em `question_id`.
- `matches`: histórico das partidas concluídas (host, guest, matéria, série, vencedor, status). No modo solo, o guest é `null`. Índice em `(status, host_id)`.

> O estado volátil da partida em si (tabuleiros, turno, revelações, mapa de respostas) vive no **Redis**, não no Postgres. O banco guarda só o que precisa persistir.

## 4. Testes (Playwright e Unitários)

O ecossistema assegura qualidade através de:
- **Testes Unitários:** O core do NestJS possui lógicas complexas de validação testadas através de suites no Jest, onde cada gateway é instanciado em *memory* sem dependência do Redis real.
- **Playwright (Testes End-to-End):** Simulamos usuários reais logando, preenchendo o Turnstile e navegando pela interface (`auth.spec.ts`). Como o Next.js gerencia as rotas protegidas usando Server-Side Sessions, o Playwright intercepta a rede e certifica de que usuários deslogados sejam devidamente rejeitados pelo middleware de autenticação.
