# Arquitetura e Infraestrutura

A infraestrutura e a arquitetura do CogniQuest foram concebidas com base nos conceitos mais modernos de engenharia de software para garantir velocidade de iteração (DX - Developer Experience), escalabilidade e resiliência extrema em produção.

## 1. Abordagem Monorepo (PNPM & Turborepo)

Optamos por concentrar todos os serviços (Frontend, Backend, Infra, Bibliotecas de Tipos e Banco de Dados) em um único repositório, gerenciado pelo **PNPM workspaces** e build otimizado com **Turborepo**.

### Por que não separar Back, Front e Infra?
Tradicionalmente, projetos separam frontend, backend e infraestrutura em repositórios distintos (poly-repos). No entanto, ao usar um Monorepo mitigamos vários problemas:
- **Compartilhamento Imediato de Tipos:** A pasta `packages/shared` ou `@cogniquest/db` compartilha as interfaces exatas (ex: `PublicRoomState`, schemas do Drizzle ORM) entre o Backend (NestJS) e Frontend (Next.js). Se uma coluna do banco for alterada, o TypeScript avisa instantaneamente tanto o Back quanto o Front.
- **Atomicidade nos Commits:** Refatorações grandes (como migrar "Faixa Etária" para "Série Escolar") afetam de ponta a ponta. Num monorepo, um único pull request garante que frontend, backend e schemas de banco subam juntos, anulando o risco de version mismatch em deploy.
- **Orquestração de Build:** O Turborepo aproveita o *remote caching*, construindo apenas os pacotes que sofreram modificação.
- **Casos Reais do Mercado:** Empresas gigantes operam com Monorepos. O **Google** é famoso por manter o maior monorepo do mundo (Piper). A **Meta (Facebook)** também opera num monorepo gigantesco para a maioria dos seus projetos web. No ecossistema frontend, a **Vercel** e a **Shopify** utilizam intensamente Turborepo para coordenar centenas de micro-frontends e bibliotecas internas, obtendo times mais alinhados e releases mais confiáveis.

## 2. Segregação de Responsabilidades: Next.js vs NestJS Socket.io

No CogniQuest, o servidor backend é dividido:

### Next.js (Web & API Stateless)
Responsável por entregar as páginas do usuário (Server-Side Rendering) e hospedar rotas de API como Registro e Login. O Next.js adota por padrão a filosofia **Serverless/Stateless**, que significa que cada requisição HTTP deve viver e morrer muito rápido, sem manter conexões longas na memória da máquina.

### NestJS Socket.io (Game Server Stateful)
Um quiz em tempo real exige velocidade instantânea (<50ms de latência) e transmissão de eventos para vários jogadores ao mesmo tempo. 
- **Por que separar?** WebSockets necessitam de conexões **Stateful** (long-lived connections). Se tentássemos embutir o Socket.io diretamente nas API routes do Next.js hospedado em arquiteturas serverless padrão, enfrentaríamos o problema de *cold starts* e queda de conexão constante (o servidor mata o container após ociosidade). 
- **A Solução:** Isolar o Socket.io em um servidor Node (NestJS) dedicado. Ele roda permanentemente, retendo os Lobbys em memória e distribuindo eventos em milissegundos sem a sobrecarga das rotinas de SSR do frontend.

## 3. Tecnologias Core da Infra

- **Cloudflare:** Atua na borda (Edge) como DNS primário, cache de estáticos, e barreira principal contra bots utilizando o **Turnstile** (Captcha).
- **Google Cloud Platform (GCP):** Todo o tráfego processado fica no **Cloud Run**, que auto-escala os containers Docker de 0 a 1.000 instâncias baseadas na carga da CPU, utilizando imagens pré-construídas e armazenadas no **Google Artifact Registry (GAR)**.
- **Supabase (PostgreSQL):** Banco de dados relacional robusto. Utilizado via **Drizzle ORM** para *type-safety* rígido nas consultas.
- **Upstash (Redis):** O Redis não apenas atua limitando taxas (*Rate Limiting*), mas é essencial para o cache.
- **SMTP Nodemailer:** Gerencia entregas essenciais (como verificação de conta ou reset de senhas).

## 4. Git Architecture e Terraform

- **Git Flow:** Utilizamos automação direta via **GitHub Actions** (`.github/workflows/deploy.yml`). *Pushs* na branch `main` ativam instantaneamente a construção das imagens no GAR e implantação no Cloud Run, adotando a abordagem "Continuous Deployment" fluída.
- **Terraform (`infra/`):** A estrutura de infra como código (IaC) permite que todo o ambiente no GCP seja recriável. Com os arquivos `main.tf`, garantimos que permissões de IAM, APIs do Google e limites de memória do Cloud Run estejam rastreáveis através de controle de versão.

## 5. Observabilidade

Saber que o sistema falhou *antes* do cliente reclamar é crucial.
- **Google Cloud Run Logs:** Monitora picos de CPU, *cold starts* prolongados e falhas de memória (OOM).
- **Sentry:** Instalado tanto no Front quanto no Game Server, ele captura exceções não tratadas em tempo real. Se um jogador tentar enviar um payload mal-formado e o jogo *crashar* internamente na função Socket, o Sentry emite um alerta com o rastro de execução exato e a versão do código.

## 6. Dockerização

Ambos os serviços (Web e Game Server) possuem `Dockerfile` próprio, estruturados em multi-stage builds. Isso garante que as imagens subidas para produção sejam leves e não contenham lixo de compilação ou dependências de dev (`devDependencies`), maximizando a segurança e a rapidez no *spin-up* dos containers.
