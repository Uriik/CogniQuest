# Identidade Visual e Design System - CogniQuest

Este documento detalha o sistema de design visual, cores, tipografia, ícones e diretrizes de interação para a plataforma **CogniQuest**.

---

## 1. Logotipo Oficial

O logotipo escolhido apresenta uma estrutura isométrica em forma de cubo tridimensional com a letra **C** estilizada em linhas neon ciano.

Os vetores SVG oficiais foram gerados e salvos em:
* [logo_full.svg](./assets/logo_full.svg) (Logotipo + Texto)
* [logo_icon.svg](./assets/logo_icon.svg) (Apenas o Ícone 3D)

---

## 2. Paleta de Cores (Ciano, Roxo e Deep Navy)

A paleta foi desenhada para criar um visual gamer e futurista altamente imersivo, usando tons que remetem à concentração e tecnologia:

| Cor | Hex | Uso Principal | Efeito Visual |
| :--- | :--- | :--- | :--- |
| **Deep Space Navy** | `#05070F` | Fundo principal da aplicação | Estabilidade e contraste |
| **Glass Panel** | `rgba(12, 17, 34, 0.8)` | Painéis de conteúdo e cards | Vidro fumê fosco (`backdrop-filter: blur(20px)`) |
| **Neon Cyan** | `#00F0FF` | Botões de ação, itens ativos, acertos | Energia e foco principal |
| **Electric Purple** | `#8B5CF6` | Elementos inativos, bordas de cards secundários, detalhes | Tecnologia e diferenciação |
| **Dark Violet** | `#4C1D95` | Fundos de barras de progresso e trilhas | Profundidade e contraste secundário |
| **Soft Emerald** | `#10B981` | Sucesso, acertos adicionais no radar | Validação positiva |
| **Cyber Red** | `#EF4444` | Erros, alvos afundados, avisos | Alerta e destruição |

---

## 3. Tipografia

* **Títulos (Headings):** **Outfit** (Google Fonts) — Uma fonte geométrica, moderna, com cantos levemente arredondados que confere um visual premium e tecnológico às telas.
* **Leitura e Interface (Body):** **Inter** (Google Fonts) — Excelente legibilidade em telas de qualquer tamanho, especialmente importante para as caixas de perguntas de múltipla escolha.

---

## 4. Diretrizes de Interação e Movimento (Hover & Motion)

Para garantir que o front-end "se mexa" de forma orgânica ao interagir, aplicamos os seguintes efeitos em CSS:

### A. Zoom do Card de Jogo (Carrossel)
Ao passar o mouse sobre um card de jogo:
* O card deve subir levemente (`transform: translateY(-8px)`).
* A imagem interna de cobertura (`card-bg-img`) deve aumentar de escala (`transform: scale(1.12)`).
* A borda ganha um brilho ciano ou roxo pulsante.

### B. Efeito Balanço do Navio (Batalha Naval)
O navio blueprint ao fundo do radar não fica estático. Ele flutua suavemente simulando o mar.

### C. Deslocamento Lateral de Alternativas (Quiz)
Quando o usuário passa o mouse sobre as opções de resposta do modal, elas se movem levemente para a direita, indicando seleção.

---

## 5. Biblioteca de Ícones Vetoriais (SVG)

Os ícones foram estruturados em SVG puro na pasta `./assets/`:
1. **Matemática:** [icon_math.svg](./assets/icon_math.svg)
2. **Física:** [icon_physics.svg](./assets/icon_physics.svg)
3. **Biologia:** [icon_biology.svg](./assets/icon_biology.svg)
