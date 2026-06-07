# Plano de Implementação — LGPD / Proteção de Menores e Moderação de Conteúdo

> **Aviso legal.** Este documento descreve a arquitetura técnica e o framework de política recomendados. Ele **não é aconselhamento jurídico**. O texto da Política de Privacidade, dos Termos de Uso e a forma de coleta do consentimento (especialmente parental) devem ser revisados por um advogado/DPO antes de ir a produção. Onde há decisão jurídica, está marcado como **[validar com jurídico]**.

> **Estado atual (verificado no código).** O `users` guarda `email`, `password_hash`, `display_name`, `grade`, `email_verified_at`, `created_at`, `updated_at` — **não há** data de nascimento, consentimento, soft-delete nem auditoria. **Não existem** páginas de privacidade/termos, fluxo de exclusão de conta, nem moderação de `display_name`/nome de sala. As séries cobertas (6º ano a 3º EM) implicam um público majoritariamente **menor de idade**.

---

## PARTE 1 — LGPD e Proteção de Dados de Menores

### 1.1 Princípios que guiam o desenho

- **Art. 14 da LGPD (crianças e adolescentes).** O tratamento de dados de **crianças** (menores de 12) exige **consentimento específico e em destaque** dado por ao menos um dos pais ou responsável legal. Para **adolescentes** (12 a 18), o tratamento deve observar o seu **melhor interesse**. Toda a coleta deve ser no melhor interesse do menor. **[validar com jurídico]**
- **Minimização.** Só coletar o estritamente necessário. Hoje coletamos e-mail, nome de exibição e série — questionar se o e-mail deve ser do menor ou do responsável.
- **Finalidade e transparência.** Cada dado tem uma finalidade declarada e visível.
- **Segurança e prestação de contas.** Controles técnicos + registro de quem consentiu o quê e quando.

### 1.2 Mapeamento de dados (data inventory) — pré-requisito

Antes de codar, documentar o inventário (insumo do RIPD, abaixo):

| Dado | Onde vive | Sensibilidade | Finalidade |
|------|-----------|---------------|------------|
| E-mail, nome, série | PostgreSQL (Supabase) | PII de menor | Conta, matchmaking por série |
| Hash de senha | PostgreSQL | credencial | Autenticação |
| Histórico de partidas | PostgreSQL (`matches`) | PII de menor | Ranking, histórico |
| Estado volátil de partida | Redis (Upstash) | PII de menor | Gameplay (efêmero) |
| IP (handshake/rate limit) | Redis / logs | PII | Segurança, anti-abuso |
| Erros | Sentry | deve ser sem PII | Observability |
| Logs | Cloud Run | deve ser sem PII | Operação |

**Subprocessadores** a documentar com DPA e região de dados: Supabase, Upstash, Cloudflare, Sentry, provedor SMTP, Google Cloud. **[validar com jurídico]**

### 1.3 Decisões de produto recomendadas

1. **Coletar data de nascimento no cadastro.** A `grade` não basta para definir faixa etária legal. Sem a idade, não dá para acionar o fluxo correto de consentimento. Recomendo **data de nascimento** (deriva idade e faixa: <12 criança, 12–17 adolescente, 18+ adulto).
2. **Conta de menor vinculada a um responsável.** Para menores, coletar o **e-mail do responsável** e exigir o **consentimento parental verificável** (double opt-in por e-mail). A conta só é ativada após o responsável confirmar.
3. **Defaults no melhor interesse do menor.** Salas privadas por padrão para menores; exposição mínima de dados em rankings (ex.: só primeiro nome ou apelido, nunca e-mail).

### 1.4 Mudanças de schema (Drizzle + migration versionada)

Nada disso quebra dado existente; tudo é aditivo. **Toda alteração entra via migration do Drizzle** (não editar tabela na mão no Supabase).

- `users`: adicionar `birthdate` (date), `guardian_email` (text, nullable), `status` (`pending_parental` | `active` | `suspended`), `anonymized_at` (timestamp, nullable, para soft-delete/anonimização).
- **Nova tabela `consents`**: `id`, `user_id`, `type` (`privacy_policy` | `terms` | `data_processing` | `parental`), `policy_version`, `granted_at`, `ip`, `method`. Permite re-consentimento quando a versão da política muda.
- **Nova tabela `data_requests` (DSAR)**: `id`, `user_id`, `type` (`access` | `deletion` | `rectification` | `portability`), `status`, `created_at`, `resolved_at`. Atende aos direitos do titular (Art. 18).
- **Nova tabela `audit_log`**: `id`, `actor_id`, `action`, `target`, `metadata`, `created_at`. Registra operações sensíveis (consentimento, exclusão, exportação).
- **Retenção**: definir TTLs explícitos — ex.: contas inativas por X meses são anonimizadas; `matches` retidos por período definido. **[validar com jurídico]**

### 1.5 Funcionalidades técnicas

- **Páginas de Política de Privacidade e Termos**, com **versionamento** (cada publicação tem `policy_version`). Rotas públicas em `apps/web/src/app/(public)/`.
- **Captura de consentimento no cadastro**: checkboxes não pré-marcados, registrando `policy_version`, `ip`, timestamp na tabela `consents`. **Re-consentimento** forçado quando a versão muda.
- **Fluxo de consentimento parental** (menores): ao cadastrar com data de nascimento de menor, conta entra em `pending_parental`; envia e-mail ao responsável com token assinado (reusar `createSignedToken` do `@cogniquest/auth`); ao confirmar, registra consentimento `parental` e ativa a conta.
- **Direitos do titular (DSAR)** — self-service + visão de admin:
  - **Exportar meus dados** (Art. 18 — portabilidade): gera JSON com dados do `users` + `matches` + `consents`.
  - **Excluir minha conta**: soft-delete + **anonimização** — limpar PII em `users` (e-mail, nome → valores anônimos, set `anonymized_at`), anonimizar referências em `matches`, **purgar chaves do Redis** (sala, vínculos), revogar sessões/refresh tokens, e considerar remoção em subprocessadores. Reter só o mínimo exigido por lei. **[validar com jurídico]**
  - **Retificar dados**.
- **Higiene de PII em observability/logs**: manter `sendDefaultPii: false` no Sentry (já é o caso) e adicionar `beforeSend` para raspar e-mail/senha de eventuais payloads; revisar logs para garantir ausência de PII.
- **Segredos no Secret Manager** (encerra a pendência do CLAUDE.md): mover variáveis sensíveis do painel do Cloud Run para o Secret Manager.

### 1.6 Processos (não-código, mas obrigatórios)

- **Nomear um Encarregado (DPO)** e publicar canal de contato. **[validar com jurídico]**
- **RIPD/DPIA** (Relatório de Impacto à Proteção de Dados): recomendado/esperado por envolver dados de menores em escala. **[validar com jurídico]**
- **Processo de resposta a incidente** e notificação à ANPD em caso de vazamento. **[validar com jurídico]**
- **DPAs** assinados com cada subprocessador.

### 1.7 Faseamento sugerido (LGPD)

- **Fase 0 — Fundação legal (sem código):** DPO, inventário de dados, RIPD, rascunho de Política + Termos (jurídico), DPAs com subprocessadores.
- **Fase 1 — Transparência + consentimento:** páginas versionadas, captura de consentimento e re-consentimento no cadastro, coleta de data de nascimento, raspagem de PII no Sentry/logs, segredos no Secret Manager.
- **Fase 2 — Direitos do titular:** DSAR self-service (exportar/excluir/retificar), soft-delete + anonimização, `audit_log`, jobs de retenção.
- **Fase 3 — Menores/parental:** fluxo de consentimento parental verificável, `status = pending_parental`, defaults de melhor interesse (sala privada, exposição mínima).
- **Fase 4 — Contínuo:** resposta a incidentes, revisões periódicas, controle de acesso interno.

---

## PARTE 2 — Moderação de Conteúdo Gerado por Usuário

### 2.1 Superfície de entrada (verificada no código)

- **`display_name`** — definido no cadastro (`/api/auth/register`).
- **Nome da sala** — definido em `lobby:create` e alterável em `lobby:rename` (`lobby.gateway.ts`).

Ambos são **texto livre, visíveis a outros jogadores** (menores). Não há filtro hoje. Não há chat no jogo (reduz a superfície — registrar isso e reavaliar se/quando houver chat).

### 2.2 Política de moderação recomendada (defesa em profundidade)

1. **Restrição de entrada** (já parcial): limite de tamanho (nome de sala já tem `max(40)`; `display_name` precisa de limite), e conjunto de caracteres permitido (bloquear URLs, zero-width, excesso de símbolos).
2. **Blocklist PT-BR com normalização** — camada principal e barata: normalizar (minúsculas, remover acentos, desfazer *leetspeak* `4→a`/`3→e`/`0→o`, remover separadores) e então casar contra uma lista de termos proibidos. Isso pega as evasões mais comuns.
3. **Fila de denúncia + revisão humana** — botão "denunciar" em salas/jogadores; o que o filtro automático não pega, a revisão pega.
4. **Rate limit** nas trocas de nome (a infra de rate limit já existe — `RATE_RULES`), evitando spam/contorno por tentativa.
5. **(Opcional, fase posterior)** classificador de terceiros/ML para nuance e contexto.

**Princípios:**
- **Aplicação no servidor, sempre** — nunca confiar no cliente. A checagem roda no `register` e nos handlers `lobby:create`/`lobby:rename`.
- **Rejeitar, não mascarar, em nomes** — para identidade (nome de sala/usuário), rejeitar com mensagem clara e pedir outro nome é melhor que censurar com asteriscos.
- **Default seguro** — nome de sala em branco já vira "Sala de <host>" no servidor (manter).

### 2.3 Implementação técnica

- **Novo módulo compartilhado de moderação** (ex.: `packages/moderation` ou dentro de `@cogniquest/shared`): função `checkText(text): { ok: boolean; reason?: string }` com normalização + blocklist PT-BR. Usar uma lista mantida (open-source) como base — **registrar a dependência** e permitir extensão.
- **Integração**:
  - `apps/web/src/app/api/auth/register/route.ts` → validar `display_name`.
  - `lobby.gateway.ts` `handleLobbyCreate` e `handleLobbyRename` → validar `name`; em falha, `client.emit('error', { code: 'NAME_REJECTED', ... })`.
- **Nova tabela `reports`**: `id`, `reporter_id`, `target_type` (`room` | `user`), `target_id`, `reason`, `status`, `created_at` + endpoint de admin para revisão e ação (renomear, suspender via `users.status = 'suspended'`).
- **Rate limit** em `lobby:rename` via `RATE_RULES`.
- **Auditoria**: registrar tentativas rejeitadas e reincidência (liga no `audit_log` da Parte 1).

### 2.4 Faseamento sugerido (Moderação)

- **Fase 1 — Filtro server-side:** módulo de moderação (normalização + blocklist) aplicado em cadastro/criação/rename; rejeição com mensagem; defaults seguros. Alto impacto, rápido.
- **Fase 2 — Denúncia + revisão:** botão de denúncia, tabela `reports`, painel de admin, rate limit, auditoria, suspensão.
- **Fase 3 — Avançado:** classificador de terceiros/ML, tratamento de reincidentes, escalonamento.

---

## Resumo de mudanças de schema (todas via migration Drizzle, aditivas)

- `users`: `+ birthdate`, `+ guardian_email`, `+ status`, `+ anonymized_at`.
- Novas tabelas: `consents`, `data_requests`, `audit_log`, `reports`.
- Nenhuma alteração destrutiva; nenhuma quebra de dado existente.

## Esforço e ordem recomendada

A ordem de maior valor/menor esforço para começar a codar:

1. **Moderação Fase 1** (módulo + integração) — rápido, protege menores já, sem dependência jurídica.
2. **LGPD Fase 1** (páginas versionadas + captura de consentimento + data de nascimento + raspagem de PII) — depende do texto jurídico para as páginas, mas o mecanismo pode ser construído em paralelo.
3. **LGPD Fase 2** (DSAR + anonimização + auditoria).
4. **LGPD Fase 3** (consentimento parental).
5. **Moderação Fase 2/3** (denúncia/revisão/ML).

> **Bloqueios externos:** Fase 0 da LGPD (DPO, RIPD, textos legais, DPAs) e todos os pontos **[validar com jurídico]** dependem de aconselhamento jurídico e não devem ser presumidos por engenharia.
