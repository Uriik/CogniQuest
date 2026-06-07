# Plano de Implementação — CogniQuest

> Plataforma de ensino gamificada. Documento de especificação e plano de ação para ser executado por um agente de codificação dentro de um workflow.
>
> **Idioma:** documento em português · **Código:** inglês (nomes, commits, comentários).
> **Status:** especificação aprovada para planejamento — _não implementar ainda_.
> **Base existente:** já há um mock funcional (`index.html`, `style.css`, `script.js`, `visual_identity.md`) e os SVGs em `assets/`. O mock é a referência de UI/UX e identidade visual — mas é um protótipo **solo**; a versão real é **PvP** (ver §7).

---

## 1. Visão geral

CogniQuest é uma plataforma de ensino baseada em **gamificação**. O aluno aprende jogando: o conteúdo pedagógico (perguntas de múltipla escolha por matéria e faixa etária) é o motor das partidas. A plataforma é uma **coleção de jogos** — cada jogo pode ser solo, em dupla, ou em grupo.

O **primeiro jogo** é **Batalha Naval** (modo 2 jogadores / PvP). Os jogos seguintes (Galactic Voyager, Bio-Explorer — já visíveis "bloqueados" no carrossel do mock) **não** entram neste MVP, mas a arquitetura deve acomodá-los sem reescrita (motor de jogo plugável).

### Princípios norteadores
- **Segurança em primeiro lugar.** Há cadastro de usuários; o sistema deve resistir a DDoS, phishing e vazamento de respostas pelo inspetor do navegador.
- **Servidor-autoritativo.** O cliente nunca decide o resultado de uma jogada nem recebe a resposta correta.
- **Tempo real confiável.** Lobby e partidas usam WebSockets; estado volátil em Redis, estado persistente em PostgreSQL.
- **Fiel ao mock.** UI, paleta, tipografia e movimento seguem `visual_identity.md` (ver §10).
- **Extensível.** Adicionar um novo jogo é implementar um contrato, não mexer no núcleo.

---

## 2. Escopo

### Dentro do MVP (v1)
- Cadastro, login e gestão de sessão (Auth.js / NextAuth + JWT/refresh).
- Dashboard com carrossel de jogos (Naval ativo; demais bloqueados).
- **Lobby híbrido:** lista pública de salas abertas **+** convite privado por link/código (ver §7.1).
- Jogo **Batalha Naval PvP**, com a regra: _só ataca quem acerta a pergunta_.
- Banco de perguntas de múltipla escolha (7 matérias × 4 faixas etárias), sorteio aleatório, **cache em Redis** e modelo servidor-autoritativo (resposta nunca vai ao cliente).
- Infraestrutura híbrida: Cloud SQL (PostgreSQL) + Cloud Memorystore (Redis).
- Segurança: rate limiting, anti-DDoS, anti-phishing, CAPTCHA (Cloudflare Turnstile).

### Fora do MVP (planejado, não construir agora)
- Galactic Voyager, Bio-Explorer e demais jogos (solo/grupo).
- Ranking/Placares, Desafios, Comunidade (já no header do mock, desabilitados).
- Painel administrativo de perguntas — no MVP, perguntas via **seed manual**.
- Matchmaking automático.

> **Removido do produto:** sistema de **níveis/XP** (o "Nível 14" do mock é fictício e sai da UI). Não é deferido — é cortado.

---

## 3. Fase 0 — Bootstrap do agente (executar PRIMEIRO)

Antes de qualquer código, o agente do workflow prepara o ambiente de skills e fixa os padrões.

### 3.1 Descobrir e instalar skills com `find-skills`
Usar a skill **find-skills** (vercel-labs) como ponto de partida — é o "gerenciador de pacotes" do ecossistema de skills, operado pela Skills CLI.

Instalar a find-skills (se necessário):

```bash
npx skills add https://github.com/vercel-labs/skills --skill find-skills
```

Descobrir skills por domínio do projeto:

```bash
npx skills find "next.js app router"
npx skills find "react framer motion animation"
npx skills find "socket.io realtime multiplayer"
npx skills find "node.js backend api"
npx skills find "drizzle orm postgresql"
npx skills find "redis cache"
npx skills find "authentication nextauth security"
npx skills find "cloudflare turnstile captcha"
npx skills find "testing vitest playwright"
npx skills find "security audit owasp"
npx skills find "google cloud run deploy"
```

Critérios de seleção (a própria find-skills recomenda): **nº de instalações, reputação da fonte e estrelas no GitHub**. Instalar só skills verificadas:

```bash
npx skills add <repo-url> --skill <skill-name>
```

> **Entregável 0.1:** `docs/skills-instaladas.md` listando cada skill, finalidade e comando usado.

### 3.2 Linguagem padrão de código
**TypeScript (strict)** — front e back. Justificativa: projeto com foco em segurança e com contratos entre Front ↔ API ↔ Socket.io ↔ DB se beneficia de tipagem forte.

- `tsconfig` com `strict: true`, `noUncheckedIndexedAccess: true`.
- Tipos compartilhados (eventos de socket, DTOs) em pacote comum (§11).
- Validação em runtime nas fronteiras com **Zod** (toda entrada de usuário e todo payload de socket validados).

### 3.3 Convenções
- **Idioma do código:** inglês (identificadores, comentários, commits).
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`…).
- **Lint/format:** ESLint + Prettier; `pre-commit` com lint-staged.
- **Branches:** trunk-based, PRs curtos, `main` protegida.

> **Saída da Fase 0:** ambiente de skills pronto, TypeScript fixado, convenções no `CONTRIBUTING.md`. Só então a Fase 1.

---

## 4. Stack tecnológica (decisões fechadas)

| Camada | Tecnologia | Observação |
|---|---|---|
| Frontend | **Next.js** (App Router) + **React** + **Framer Motion** | Animações do mock (radar, balanço do navio, hover de cards/alternativas) |
| Backend | **NestJS** (Node.js) + **Socket.io** (WebSocket gateway) | Servidor de jogo e lobby em tempo real; estrutura modular (modules/providers/guards) |
| Tempo real | **WebSockets (Socket.io)** + **Redis adapter** | Lobby, convites, partida; Pub/Sub p/ escala horizontal |
| Dados persistentes | **Cloud SQL (PostgreSQL)** | Usuários, perguntas, histórico de partidas |
| Dados voláteis / cache | **Cloud Memorystore (Redis)** | Salas, cache de perguntas, sessões de jogo, rate limit |
| Auth | **Auth.js (NextAuth)** + JWT/refresh | Cookies httpOnly (§9) |
| ORM | **Drizzle ORM** | Schema tipado em TS + migrations |
| Validação | **Zod** | Fronteiras HTTP e socket |
| CAPTCHA | **Cloudflare Turnstile** | Cadastro/login (§9.2) |
| Monorepo | **pnpm workspaces + Turborepo** | Apps + packages (§11) |
| Linguagem | **TypeScript (strict)** | Padrão único front+back |
| Hospedagem game-server | **Google Cloud Run** (com WebSockets) | Mais infra em §14 |

---

## 5. Arquitetura de alto nível

```
            ┌──────────────────────────────┐
            │        Cliente (Browser)      │
            │  Next.js + React + Framer M.  │
            │  - UI lobby / 2 tabuleiros    │
            │  - socket.io-client           │
            └───────────────┬──────────────┘
                            │ HTTPS (REST/RSC) + WSS (Socket.io)
                            ▼
        ┌───────────────────────────────────────────┐
        │  GCP LB + Cloud Armor (WAF / rate / TLS)   │  ← anti-DDoS (§9)
        └───────────────┬───────────────────────────┘
                        │
          ┌─────────────┴───────────────┐
          ▼                             ▼
 ┌──────────────────┐         ┌────────────────────────┐
 │  Next.js (web)   │         │  game-server (Cloud Run)│
 │  - Auth.js       │         │  - Socket.io            │
 │  - REST API      │         │  - Lobby / salas        │
 │  - SSR/RSC       │         │  - Engine Batalha Naval │
 └────────┬─────────┘         └───────┬──────────────┬──┘
          │                           │              │
          ▼                           ▼              ▼
 ┌──────────────────┐        ┌────────────────┐  ┌──────────────────┐
 │  Cloud SQL       │        │   Redis        │  │  Redis Pub/Sub   │
 │  (PostgreSQL)    │        │  (Memorystore) │  │  (escala horiz.) │
 │  users,          │        │  salas,        │  │  sincroniza      │
 │  questions,      │        │  cache de Q,   │  │  múltiplas       │
 │  matches         │        │  estado jogo   │  │  instâncias      │
 └──────────────────┘        └────────────────┘  └──────────────────┘
```

**Pontos-chave**
- O **game-server** é a única autoridade sobre o estado da partida, a posição dos navios e a correção das respostas.
- **Redis** guarda o volátil/alta-frequência (salas, turnos, dois tabuleiros, cache de perguntas). Usar **Redis adapter do Socket.io** (Pub/Sub) para mais de uma instância no Cloud Run.
- **PostgreSQL** guarda o que dura: contas, banco de perguntas, resultado final das partidas.

---

## 6. Modelo de dados

### 6.1 PostgreSQL (persistente) — esboço (implementar com Drizzle)

```
users (
  id            uuid pk,
  email         citext unique not null,
  password_hash text not null,          -- Argon2id
  display_name  text not null,
  age_band      text,                   -- '6-8' | '9-11' | '12-14' | '15+'
  email_verified_at timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz
)

subjects (                              -- 7 matérias fixas (seed)
  id   uuid pk,
  slug text unique not null,            -- math|physics|biology|chemistry|portuguese|history|geography
  name text not null,
  icon text not null                    -- caminho do SVG em assets/
)

questions (
  id            uuid pk,
  subject_id    uuid -> subjects(id),
  age_band      text not null,          -- '6-8' | '9-11' | '12-14' | '15+'
  prompt        text not null,
  created_at    timestamptz default now()
)

question_options (
  id          uuid pk,
  question_id uuid -> questions(id) on delete cascade,
  label       text not null,
  is_correct  boolean not null          -- NUNCA sai do servidor para o cliente
)

matches (                               -- resultado final, p/ histórico
  id         uuid pk,
  game_type  text not null,             -- 'battleship'
  host_id    uuid -> users(id),
  guest_id   uuid -> users(id),
  subject_id uuid -> subjects(id),
  age_band   text not null,
  winner_id  uuid -> users(id),
  status     text not null,             -- 'finished' | 'abandoned'
  started_at  timestamptz,
  finished_at timestamptz
)
```

> **Regra de ouro:** `is_correct` (e qualquer marcação de gabarito) **nunca** é serializado para o cliente. Ver §8.

### 6.2 Faixas etárias e matérias (seed do MVP — decisões fechadas)
- **Faixas etárias (dificuldade):** `6-8`, `9-11`, `12-14`, `15+`.
- **Matérias (7):** Matemática (`math`), Física (`physics`), Biologia (`biology`), Química (`chemistry`), Português (`portuguese`), História (`history`), Geografia (`geography`).
- **Ícones (todos presentes em `assets/`):** `icon_math.svg`, `icon_physics.svg`, `icon_biology.svg`, `icon_chemistry.svg`, `icon_portuguese.svg`, `icon_history.svg`, `icon_geography.svg`.
- **Origem das perguntas:** **seed manual** (migrations/seed script). O `script.js` do mock já traz um `questionBank` de exemplo que serve de ponto de partida — mas precisa migrar de 3 para 7 matérias e das faixas 7-10/11-14/15-17 para 6-8/9-11/12-14/15+.

### 6.3 Redis (volátil) — estruturas sugeridas

| Chave | Tipo | Conteúdo | TTL |
|---|---|---|---|
| `room:{roomId}` | Hash | estado da sala (host, guest, subject, ageBand, status, visibilidade) | renovado |
| `room:public:index` | Sorted Set | salas abertas listáveis no lobby público | renovado |
| `room:{roomId}:invite` | String | token de convite assinado + código de 6 dígitos | minutos |
| `game:{roomId}` | JSON | **dois tabuleiros**, turno atual, navios restantes por jogador | partida |
| `game:{roomId}:question:{userId}` | String | pergunta corrente (sem gabarito) do jogador | até responder |
| `qcache:{subjectSlug}:{ageBand}` | List | lote de perguntas pré-carregadas (cache) | médio |
| `presence:{userId}` | String | online/offline, socketId | curto |
| `ratelimit:{ip}:{rota}` | Counter | rate limit | janela |

---

## 7. Fluxo do jogo — Batalha Naval (PvP, 2 tabuleiros)

**Modelo confirmado:** cada jogador tem o **seu próprio tabuleiro**; navios e submarinos são **distribuídos aleatoriamente pelo servidor** (nenhum jogador escolhe nem vê posições). Cada um ataca o tabuleiro do adversário, em turnos. **Nenhum dos dois sabe onde estão os navios** do outro. O ensino vem das perguntas que liberam o ataque.

> **Por que o mock parece solo:** cada jogador enxerga apenas a **sua própria tela/perspectiva** — não vê o tabuleiro nem a posição do oponente. O protótipo mostra só essa visão única, o que dá a impressão de jogo solo; mas a partida é entre **duas pessoas**, cada uma com sua visão isolada.

**Frota e tabuleiro (fixos — herdados do mock):** tabuleiro **10×10**; frota com **Submarine (2 segmentos)**, **Destroyer (3)** e **Cruiser (4)**, distribuída aleatoriamente. Sem orientação/posição escolhida pelo jogador.

### 7.1 Lobby (público + convite)
1. **Host** cria sala → escolhe **matéria** e **faixa etária**. Pode deixar a sala **pública** (aparece na lista "Salas de Espera Ativas") ou apenas privada.
2. Servidor gera **convite duplo**: um **link com token assinado** (curto, com expiração) **e** um **código de 6 dígitos**. Ambos válidos para a mesma sala.
3. Entrada do 2º jogador, por qualquer via:
   - lista pública → "Entrar na Sala"; **ou**
   - link de convite; **ou**
   - digitando o código de 6 dígitos.
4. **Fluxo de autenticação no convite:** se quem abre o convite **não está logado**, redireciona para login/cadastro e, ao autenticar, **retorna automaticamente para o convite e entra na sala** (preservar o destino pós-login).
5. Servidor valida (assinatura/código + expiração + sala aberta + não cheia) e coloca ambos no lobby da sala.

### 7.2 Início e posicionamento (automático)
6. Ao ambos ficarem prontos, o servidor:
   - **posiciona aleatoriamente** a frota de cada jogador em seu tabuleiro (validação interna: tamanhos, sem sobreposição, dentro dos limites);
   - pré-carrega um **lote de perguntas** (sorteio aleatório filtrado por matéria + faixa etária) no **cache Redis**.

### 7.3 Turnos — regra central
7. No turno do jogador, o servidor entrega **uma pergunta** (enunciado + alternativas, **sem** indicar a correta).
8. O jogador responde:
   - **Acertou** → recebe o direito de **atacar** uma coordenada do tabuleiro **adversário**. Servidor resolve _hit/miss/sunk_ e atualiza o estado.
   - **Errou** → não ataca; turno passa ao adversário.
9. Servidor emite o resultado (acerto da pergunta + resultado do ataque) para ambos via Socket.io. Cada cliente vê: seu radar de ataque (tabuleiro inimigo, só hits/miss revelados) e o status da própria frota.
10. Repete até um jogador afundar **toda a frota adversária**.

**Mecânica de Dica (server-mediated):** a cada **3 acertos** de pergunta, o jogador ganha **1 dica** disponível. A dica é resolvida **no servidor** (nunca expõe o tabuleiro inteiro ao cliente) — ex.: revela que há um navio em determinada linha/coluna, ou aproxima de uma célula com acerto. O contador de acertos para dica é mantido no estado da partida em Redis; o cliente só recebe "dica disponível" e o resultado pontual ao usá-la.

### 7.4 Fim de jogo
11. Servidor determina o vencedor, **persiste a partida** em PostgreSQL (`matches`), limpa o estado em Redis e notifica ambos.
12. **Desconexão:** _grace period_ com reconexão via Redis; se expira, partida marcada `abandoned` e o oponente vence por W.O.

> **Resumo do turno:** `seu turno → pergunta (sem gabarito) → resposta → [servidor valida] → acertou? ataca tabuleiro inimigo : passa → broadcast estado dos dois tabuleiros`

> **Sobre o mock:** o `script.js` atual implementa um fluxo **solo** (um tabuleiro, navios fixos no código, "dica" que revela posição). Na versão real isso vira **dois tabuleiros**, **posicionamento aleatório no servidor** e a "dica" — se mantida — precisa ser mediada pelo servidor (nunca expor posição ao cliente).

---

## 8. Proteção das perguntas (anti-inspetor) — servidor-autoritativo

Objetivo: o jogador **não pode** descobrir a resposta correta inspecionando rede, memória ou DOM. (No mock, o gabarito está no `questionBank` do `script.js` — visível no front; isso **não** pode acontecer na versão real.)

**Modelo adotado: servidor-autoritativo, sem enviar a resposta.**

1. **A resposta correta nunca trafega.** O payload ao cliente contém só `questionId`, `prompt` e `options` (rótulo + id de opção). O flag `is_correct` fica só no servidor/DB e no cache Redis interno.
2. **Validação no servidor.** O cliente envia apenas o `optionId` escolhido; o servidor compara com o gabarito e devolve `correct: true/false`. A decisão "pode atacar" é do servidor.
3. **Cache sem gabarito exposto.** O cache Redis pode guardar o gabarito (lado servidor), mas o objeto serializado para o cliente é derivado e **omite** o gabarito.
4. **Ofuscação adicional (camada extra, opcional):** embaralhar a ordem das alternativas por sessão e usar ids efêmeros de opção por partida — inspecionar o tráfego não revela padrão reutilizável. Não substitui o item 1.
5. **Anti-automação:** rate limit por jogador nas respostas, _timeout_ de turno e detecção de respostas impossíveis (ex.: responder antes de a pergunta ser entregue).

> **Decisão registrada:** "criptografar a pergunta e decifrar no cliente" foi **descartado** como segurança — a chave viajaria ao navegador e poderia ser extraída. Segurança real = **não enviar a resposta**. TLS é obrigatório; a ofuscação do item 4 é só atrito contra inspeção casual.

---

## 9. Segurança (prioridade do projeto)

### 9.1 Autenticação e contas
- **Auth.js (NextAuth)** com JWT + **refresh token** rotativo; access curto, refresh em cookie **httpOnly + Secure + SameSite**.
- Hash de senha **Argon2id** (ou bcrypt cost alto).
- **Verificação de e-mail** obrigatória antes de jogar.
- Política de senha + checagem contra vazamentos (HIBP k-anonymity).
- **MFA opcional** (TOTP) como evolução.
- Revogação de sessão via lista em Redis (logout/troca de senha invalida refresh).

### 9.2 Anti-DDoS e anti-bot
- **WAF + rate limiting na borda** (GCP Cloud Armor) antes da aplicação.
- Rate limit na aplicação por IP e por usuário (Redis) nas rotas sensíveis (login, criar sala, responder).
- **Cloudflare Turnstile** em cadastro e login (e após N tentativas).
- Limite de conexões WebSocket por IP; _heartbeat_/timeout; backpressure no Socket.io (limite de eventos/seg por socket; desconectar abusadores).

### 9.3 Anti-phishing
- Domínio único e canônico; **HSTS**, TLS obrigatório, redirect http→https.
- E-mails transacionais com **SPF, DKIM e DMARC** (links de verificação/convite confiáveis).
- **Tokens de convite assinados (HMAC)** com expiração curta e escopo de sala; **código de 6 dígitos** também de uso limitado/expirável — convite não pode ser forjado nem reutilizado.
- Nunca pedir credenciais por e-mail; ações por token de uso único.

### 9.4 Hardening geral (OWASP)
- **Validação de toda entrada** com Zod (HTTP e socket).
- **Headers:** CSP estrita, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (middleware Next.js). Atenção: o mock usa `backdrop-filter`, Google Fonts e imagens inline — a CSP precisa liberar essas origens explicitamente.
- **CSRF:** proteção em rotas com cookie; SameSite + token anti-CSRF onde aplicável.
- **CORS** restritivo à origem oficial.
- Menor privilégio em credenciais de DB/Redis; segredos no **Secret Manager** (GCP), nunca no código.
- Logs/auditoria de eventos sensíveis (login, criar sala, fim de partida); sem dados sensíveis em log.
- Auditoria de dependências; **security review** no CI.

---

## 10. Identidade visual e front-end (do mock)

Seguir `visual_identity.md`. Ao portar o mock para Next.js + React + Framer Motion, preservar:

- **Paleta:** Deep Space Navy `#05070F` (fundo), Glass Panel `rgba(12,17,34,.8)` com `backdrop-filter: blur(20px)`, Neon Cyan `#00F0FF` (ação/acerto), Electric Purple `#8B5CF6` (secundário), Dark Violet `#4C1D95` (trilhas), Soft Emerald `#10B981` (sucesso), Cyber Red `#EF4444` (erro/afundado).
- **Tipografia:** **Outfit** (títulos) e **Inter** (corpo/perguntas) — Google Fonts (liberar na CSP).
- **Movimento (Framer Motion):** zoom/elevação dos cards do carrossel; balanço do navio blueprint no radar; deslocamento lateral das alternativas no hover; varredura de radar; toasts.
- **Telas a portar:** Login/Cadastro, Dashboard (carrossel com Naval ativo + bloqueados), Lobby (lista pública), Criar Sala (matéria + faixa + convite), Gameplay (radar 10×10, painéis Missions/Fleet Status), Modal de Pergunta (glassmorphic).
- **Ajustes vs. mock:** trocar faixas para 6-8/9-11/12-14/15+; expandir o seletor de matérias de 3 para 7 (ícones já em `assets/`); adaptar o gameplay para a perspectiva PvP (radar de ataque ao tabuleiro inimigo + status da própria frota); **remover o "Nível/XP"** do header (perfil mantém só nome/avatar); manter a dica (🧠) agora liberada a cada 3 acertos.

---

## 11. Contratos de eventos Socket.io (esboço)

Payloads validados com Zod nos dois lados; tipos compartilhados no pacote comum.

**Cliente → Servidor**
| Evento | Payload | Efeito |
|---|---|---|
| `lobby:create` | `{ subjectId, ageBand, isPublic }` | cria sala; retorna `roomId` + invite (link+código) |
| `lobby:join` | `{ inviteToken? , code? , roomId? }` | entra na sala (valida token/código/sala) |
| `game:ready` | `{ roomId }` | pronto; dispara posicionamento aleatório + pré-carga de perguntas |
| `game:answer` | `{ roomId, questionId, optionId }` | envia resposta (servidor valida) |
| `game:attack` | `{ roomId, x, y }` | só aceito se a última resposta foi correta |
| `game:useHint` | `{ roomId }` | só aceito se há dica disponível (a cada 3 acertos) |

**Servidor → Cliente**
| Evento | Payload | Significado |
|---|---|---|
| `lobby:updated` | estado da sala | mudança no lobby |
| `game:start` | `{ yourFleetSummary, turn }` | partida iniciada (sem posições do inimigo) |
| `game:question` | `{ questionId, prompt, options[] }` | pergunta **sem** gabarito |
| `game:answerResult` | `{ correct, canAttack, hintsAvailable }` | resultado da resposta + dicas acumuladas |
| `game:attackResult` | `{ x, y, result, sunk? }` | hit/miss/sunk no tabuleiro inimigo |
| `game:hintResult` | `{ hint, hintsAvailable }` | resultado da dica (parcial, calculado no servidor) |
| `game:state` | estado público dos dois tabuleiros | sincronização (só células reveladas) |
| `game:over` | `{ winnerId }` | fim de jogo |
| `error` | `{ code, message }` | erro tratado |

---

## 12. Estrutura do projeto (monorepo — pnpm + Turborepo)

```
cogniquest/
├─ apps/
│  ├─ web/                 # Next.js (React + Framer Motion) — front + Auth.js
│  └─ game-server/         # Node.js + Socket.io — lobby + engine (Cloud Run)
├─ packages/
│  ├─ shared/              # tipos TS, schemas Zod, contratos de socket
│  ├─ game-engine/         # lógica pura da Batalha Naval PvP (testável, sem I/O)
│  └─ db/                  # Drizzle schema, migrations, seed (7 matérias × 4 faixas)
├─ assets/                 # SVGs (7 ícones + logos) — já existentes
├─ legacy-mock/            # index.html, style.css, script.js (referência de UI)
├─ docs/
│  ├─ skills-instaladas.md
│  └─ PLANO_DE_IMPLEMENTACAO.md
├─ infra/                  # IaC GCP (Cloud SQL, Memorystore, Cloud Run, Cloud Armor)
└─ turbo.json / pnpm-workspace.yaml
```

> **Motor de jogo plugável:** `packages/game-engine` expõe um contrato (`GameEngine`) com `init / autoPlaceFleet / resolveTurn / isOver`. Jogos futuros implementam o mesmo contrato — o `game-server` não precisa saber qual jogo é.

---

## 13. Roadmap por fases (entregáveis)

| Fase | Objetivo | Entregáveis principais |
|---|---|---|
| **0. Bootstrap** | Skills + padrões | find-skills rodando, TS fixado, convenções, `docs/skills-instaladas.md` |
| **1. Fundação** | Monorepo + infra base | scaffolding Next.js/Node, Drizzle+Postgres local, Redis local, Turborepo, CI lint/test |
| **2. Auth & segurança** | Contas seguras | cadastro/login (Auth.js), verificação de e-mail, Turnstile, rate limit, headers/CSP |
| **3. Banco de perguntas** | Conteúdo | schema subjects/questions/options (Drizzle), **seed manual** 7×4, sorteio aleatório, **cache Redis** |
| **4. Lobby** | Salas em tempo real | criar sala, matéria/faixa, **lista pública**, **convite link+código**, login-redirect→entra na sala |
| **5. Engine Batalha Naval** | Lógica pura | `game-engine` testado: **posicionamento aleatório**, dois tabuleiros, turnos, hit/miss/sunk, fim |
| **6. Integração de jogo** | Tempo real ponta a ponta | eventos Socket.io, regra "acerta→ataca", modelo servidor-autoritativo de perguntas |
| **7. Front do jogo** | UX (port do mock) | telas portadas p/ React + Framer Motion, dois tabuleiros, modal de pergunta, reconexão |
| **8. Persistência & histórico** | Durabilidade | gravar `matches`, tratar abandono/desconexão |
| **9. Hardening & QA** | Robustez | security review, testes E2E, carga/DDoS simulado, ajuste de rate limit |
| **10. Deploy GCP** | Produção | Cloud SQL, Memorystore, Cloud Run (WS), Cloud Armor, Secret Manager, observabilidade |

> Cada fase termina com testes verdes e checkpoint de revisão antes da próxima.

---

## 14. Qualidade e testes
- **Unitários:** motor de jogo (cobertura alta; lógica pura, sem I/O) — posicionamento aleatório, resolução de ataque, condição de vitória.
- **Integração:** fluxos de socket (lobby → partida) com cliente simulado, incluindo convite por link e por código.
- **E2E (Playwright):** cadastro/login, fluxo de convite com login-redirect, e uma partida PvP completa.
- **Segurança:** rodar `security-review` no CI; testes de rate limit e "resposta nunca vaza".
- **Carga:** múltiplas salas/conexões simultâneas (validar Redis adapter no Cloud Run e limites).

---

## 15. Infra GCP — itens de configuração
- **Cloud SQL (PostgreSQL):** instância privada (VPC), backups automáticos, SSL obrigatório, usuário de app com privilégios mínimos.
- **Cloud Memorystore (Redis):** rede privada, AUTH habilitado, TLS in-transit.
- **Cloud Run (game-server):** habilitar **WebSockets**, min instances ≥1 (evitar cold start em partida), conexão VPC para Redis/SQL, autoscaling com Redis adapter para Socket.io.
- **Cloud Armor / Load Balancer:** regras anti-DDoS, rate limiting de borda, WAF.
- **Secret Manager:** todos os segredos (DB, Redis, JWT, SMTP, Turnstile) — nada em `.env` versionado.
- **Observabilidade:** Cloud Logging/Monitoring, alertas de erro e de pico de tráfego.

---

## 16. Decisões registradas (todas fechadas)
- **Linguagem padrão:** TypeScript (strict), front e back.
- **Framework de backend:** NestJS (Socket.io via `@nestjs/websockets` gateway; Zod nos pipes de validação).
- **Documento em PT, código em EN.**
- **Auth:** Auth.js (NextAuth) + JWT/refresh, cookies httpOnly.
- **Perguntas:** servidor-autoritativo — gabarito nunca vai ao cliente; criptografia no cliente descartada.
- **Tempo real:** Socket.io + Redis adapter.
- **Dados:** PostgreSQL (persistente) + Redis (volátil/cache).
- **Monorepo:** pnpm workspaces + Turborepo.
- **ORM:** Drizzle.
- **Origem das perguntas:** seed manual (base inicial no `questionBank` do mock).
- **CAPTCHA:** Cloudflare Turnstile.
- **Faixas etárias:** 6-8, 9-11, 12-14, 15+.
- **Matérias (7):** Matemática, Física, Biologia, Química, Português, História, Geografia (ícones já em `assets/`).
- **Convite:** link com token assinado **+** código de 6 dígitos; se não-logado, redireciona para login/cadastro e retorna ao convite entrando na sala.
- **Hospedagem game-server:** Google Cloud Run (com WebSockets).
- **Modelo do jogo:** Batalha Naval PvP, cada jogador com seu tabuleiro, **frota distribuída aleatoriamente pelo servidor**, ataques mútuos, nenhum jogador conhece as posições. Cada jogador vê apenas a própria perspectiva.
- **Lobby:** lista pública de salas **+** convite privado.
- **Frota e tabuleiro (fixos):** 10×10; Submarine (2), Destroyer (3), Cruiser (4) segmentos.
- **Dica:** liberada a cada **3 acertos**, resolvida no servidor (não expõe o tabuleiro ao cliente).
- **Níveis/XP:** removidos do produto.

---

## 17. Observações finais / pontos de atenção
1. O mock atual é **solo na aparência e com gabarito no front** — mas isso é só porque mostra a perspectiva de **um** jogador (que nunca vê o tabuleiro do oponente). A lógica de jogo e de perguntas será **reescrita** server-side para PvP.
2. **Dica:** liberada a cada 3 acertos, **resolvida no servidor**. Definir na Fase 5 o *tipo* exato de dica (revelar linha/coluna com navio, marcar célula próxima a um acerto, etc.) sem nunca enviar o tabuleiro completo ao cliente.
3. **Níveis/XP removidos** do produto. "Placares/Desafios/Comunidade" seguem como itens desabilitados no header (fora do MVP).
4. **Frota e tabuleiro fixos:** 10×10 com Submarine (2), Destroyer (3), Cruiser (4) segmentos, distribuídos aleatoriamente. Implementar o gerador de posicionamento aleatório (sem sobreposição, dentro dos limites) na Fase 5.

---

_Fim do documento. Próximo passo do workflow: executar a Fase 0 (find-skills + fixar TypeScript) e então a Fase 1._
