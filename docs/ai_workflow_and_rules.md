# Workflow de IA e Contextualização do Projeto

O desenvolvimento do CogniQuest contou com a participação de múltiplos agentes de Inteligência Artificial trabalhando sob diretrizes estritas. Abaixo explicamos como a colaboração humana x máquina operou sem comprometer as regras de negócio.

## 1. Ferramentas Utilizadas

A construção da aplicação dividiu-se entre três atores principais:

### Claude Code
Utilizado principalmente para **Arquitetura de Requisitos** e **Code Review**.
- O Claude analisou a documentação inicial.
- Gerou os planos de implementação funcionais de alto nível.
- Realizava auditorias de segurança sobre o código submetido.

### Antigravity Gemini
Atuou como o **Engenheiro de Software Principal**.
- Criou, refatorou e operou o código nos mínimos detalhes usando suas Skills (presentes na pasta `.github/skills`).
- O Gemini foi responsável por construir e integrar o Next.js, os Gateways WebSocket no NestJS, e o ORM de forma autonôma, mantendo a responsabilidade por garantir a compilação e teste antes de encerrar seu turno.

### Google Image Generation
Utilizado indiretamente via Gemini para conceber a estética e criar mockups de interface (como as imagens e assets vetoriais `.svg`). Isso evitou o uso genérico de bibliotecas pré-fabricadas e deu um visual exclusivo à aplicação.

## 2. A Engenharia de "Rules" para Controle de Contexto das IAs

Um dos maiores problemas no desenvolvimento auxiliado por IA é a perda de escopo (quando a LLM começa a inventar funções desnecessárias, alucinar pacotes, ou perder o contexto da pasta que está mexendo).

Para contornar isso, adotamos uma estratégia de fragmentação de regras:
1. **Regras Gerais (`CLAUDE.md` e Root Context):**
   Na raiz do repositório, há regras globais que definem a essência: usar PNPM, proibir a alteração das pastas de arquivos estáticos em demasia sem checagem de tipos, obrigatoriedade de TypeScript estrito.
2. **`RULES.md` Específicos por Pasta:**
   Dentro da pasta do `apps/web/`, há um `RULES.md` que diz exclusivamente: *"Você está mexendo no Frontend. Só use Tailwind. Use Next.js App Router"*.
   Dentro do `apps/game-server/`, o `RULES.md` foca em regras de back-end: *"Não mexa no DOM, foque em latência, use bibliotecas Node"*.

Essa segmentação impede que a IA destrua as lógicas de negócio ou use hooks do React num arquivo do NestJS, reduzindo drasticamente a incidência de *bugs arquiteturais*. Dessa forma, a autonomia ganha precisão, resultando em um sistema extremamente polido em tempo recorde.
