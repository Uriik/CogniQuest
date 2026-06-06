# @cogniquest/web (placeholder)

Frontend Next.js (App Router) + React + Framer Motion + Auth.js.

## Próximo passo (Fase 2 / Fase 7)

1. Scaffold real: `pnpm create next-app@latest . --ts --app --eslint --src-dir`.
2. Adicionar dependências: `next-auth`, `framer-motion`, `zod`, `@cogniquest/shared`, `socket.io-client`, `@marsidev/react-turnstile`.
3. Configurar headers/CSP no `next.config` + middleware (liberar Google Fonts, `backdrop-filter`, imagens inline do mock).
4. Portar telas do mock (`../../MockModelo`): Login/Cadastro, Dashboard (carrossel), Lobby, Criar Sala, Gameplay (2 tabuleiros), Modal de Pergunta.
5. Aplicar design system de `../../MockModelo/visual_identity.md` (paleta neon/glass, Outfit + Inter, animações).
6. Remover Nível/XP do header. Faixas 6-8/9-11/12-14/15+. 7 matérias (ícones em `../../assets/`).

Ver `PLANO_DE_IMPLEMENTACAO.md` §10 e §13.
