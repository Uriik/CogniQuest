# Skills instaladas — CogniQuest

Skills de agente instaladas em `.claude/skills/` (lidas pelo Claude Code). Lockfile: `skills-lock.json` na raiz (restaurável com `npx skills experimental_install`).

> Nota: o instalador `npx skills add` copia a skill para **todos** os agents detectados, criando vários dotdirs (`.goose`, `.windsurf`, ...). Esses dotdirs foram removidos; a fonte de verdade para este projeto é `.claude/skills/`. Ao reinstalar, limpar os dotdirs extras depois.

## Comunicação
| Skill | Origem | Uso |
|---|---|---|
| `caveman` | juliusbrussee/caveman | Modo de resposta comprimido (caveman). Auto-on via hooks em `.claude/`. |

## Frontend (Next.js + animação)
| Skill | Origem | Uso |
|---|---|---|
| `next-best-practices` | vercel-labs/next-skills | Boas práticas Next.js (App Router, data, bundling). |
| `framer-motion-animator` | patricio0312rev/skills | Animações Framer Motion (port do mock: radar, cards, alternativas). |
| `motion` | onmax/nuxt-skills | Padrões de motion. |
| `motion-advanced` | affaan-m/everything-claude-code | Motion avançado. |

## Backend (NestJS / Node)
| Skill | Origem | Uso |
|---|---|---|
| `nestjs-best-practices` | kadajett/agent-nestjs-skills | Boas práticas NestJS (modules, providers, DI). |
| `nestjs-patterns` | affaan-m/everything-claude-code | Padrões NestJS. |
| `nestjs-expert` | jeffallan/claude-skills | NestJS avançado. |
| `nodejs-backend-patterns` | wshobson/agents | Padrões de backend Node.js. |
| `nodejs-best-practices` | sickn33/antigravity-awesome-skills | Boas práticas Node.js. |

## WebSockets
| Skill | Origem | Uso |
|---|---|---|
| `websocket-engineer` | jeffallan/claude-skills | Engenharia de WebSocket (Socket.io gateway, salas). |
| `websocket-security` | yaklang/hack-skills | Segurança de WebSocket (rate limit, validação, abuso). |

## Pendência
- Skills específicas para **Drizzle**, **Redis** e **Auth.js/Turnstile** não foram encontradas no registry. Cobrir via `next-best-practices` + docs oficiais, ou rodar `npx skills find` interativo no workflow real para localizar.
