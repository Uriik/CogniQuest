# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: solo-match.spec.ts >> Solo Match Flow >> Deve entrar na partida solo e carregar o radar imediatamente
- Location: e2e\solo-match.spec.ts:9:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - link "CogniQuest Icon CogniQuest" [ref=e5] [cursor=pointer]:
          - /url: /dashboard
          - img "CogniQuest Icon" [ref=e6]
          - generic [ref=e7]: CogniQuest
        - navigation [ref=e8]:
          - link "Dashboard" [ref=e9] [cursor=pointer]:
            - /url: /dashboard
            - button "Dashboard" [ref=e10]
          - link "Salas PvP" [ref=e11] [cursor=pointer]:
            - /url: /lobby
            - button "Salas PvP" [ref=e12]
          - button "Ranking" [disabled] [ref=e13]
        - generic [ref=e14] [cursor=pointer]:
          - generic [ref=e15]:
            - generic [ref=e16]: Playwright Tester
            - generic [ref=e17]: Online
          - generic [ref=e19]: P
    - main [ref=e20]:
      - button "← Voltar para as Salas" [ref=e22] [cursor=pointer]
      - generic [ref=e24]:
        - generic [ref=e25]:
          - heading "Configurar Nova Sala" [level=1] [ref=e26]
          - paragraph [ref=e27]: Defina o modo, a matéria e a dificuldade do duelo
        - generic [ref=e28]:
          - generic [ref=e29]: Modo de Jogo
          - generic [ref=e30]:
            - button "👥 Dupla (PvP)" [ref=e31] [cursor=pointer]
            - button "🤖 Solo (vs Máquina)" [ref=e32] [cursor=pointer]
          - paragraph [ref=e33]: No modo solo a máquina não ataca — afunde a frota dela respondendo as perguntas.
        - generic [ref=e34]:
          - generic [ref=e35]: Escolha a Matéria
          - generic [ref=e36]:
            - button "Matemática Matemática" [ref=e37] [cursor=pointer]:
              - img "Matemática" [ref=e38]
              - generic [ref=e39]: Matemática
            - button "Física Física" [ref=e40] [cursor=pointer]:
              - img "Física" [ref=e41]
              - generic [ref=e42]: Física
            - button "Biologia Biologia" [ref=e43] [cursor=pointer]:
              - img "Biologia" [ref=e44]
              - generic [ref=e45]: Biologia
            - button "Química Química" [ref=e46] [cursor=pointer]:
              - img "Química" [ref=e47]
              - generic [ref=e48]: Química
            - button "Português Português" [ref=e49] [cursor=pointer]:
              - img "Português" [ref=e50]
              - generic [ref=e51]: Português
            - button "História História" [ref=e52] [cursor=pointer]:
              - img "História" [ref=e53]
              - generic [ref=e54]: História
            - button "Geografia Geografia" [ref=e55] [cursor=pointer]:
              - img "Geografia" [ref=e56]
              - generic [ref=e57]: Geografia
        - generic [ref=e58]:
          - generic [ref=e59]: Série Escolar (Dificuldade)
          - generic [ref=e60]:
            - button "6º Ano" [ref=e61] [cursor=pointer]
            - button "7º Ano" [ref=e62] [cursor=pointer]
            - button "8º Ano" [ref=e63] [cursor=pointer]
            - button "9º Ano" [ref=e64] [cursor=pointer]
            - button "1º EM" [ref=e65] [cursor=pointer]
            - button "2º EM" [ref=e66] [cursor=pointer]
            - button "3º EM" [ref=e67] [cursor=pointer]
        - button "Iniciar Solo" [ref=e69] [cursor=pointer]
  - alert [ref=e70]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Solo Match Flow', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Inject auth session
  6  |     await page.goto('/api/auth/test-session');
  7  |   });
  8  | 
  9  |   test('Deve entrar na partida solo e carregar o radar imediatamente', async ({ page }) => {
  10 |     page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  11 |     page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  12 | 
  13 |     await page.goto('/lobby');
  14 | 
  15 |     // Clicar em "Criar Nova Sala"
  16 |     const createRoomBtn = page.locator('button', { hasText: 'Criar Nova Sala' });
  17 |     await expect(createRoomBtn).toBeVisible();
  18 |     await createRoomBtn.click();
  19 | 
  20 |     // Aguardar o redirecionamento para criação de sala
  21 |     await page.waitForURL(/\/lobby\/create/);
  22 | 
  23 |     // Clicar no botão "Solo (vs Máquina)"
  24 |     const soloOption = page.locator('button', { hasText: 'Solo (vs Máquina)' });
  25 |     await soloOption.click();
  26 | 
  27 |     // Selecionar a primeira matéria disponível para não dar erro
  28 |     const firstSubject = page.locator('.setup-subject-btn').first();
  29 |     await expect(firstSubject).toBeVisible();
  30 |     await firstSubject.click();
  31 | 
  32 |     const startGameBtn = page.locator('button', { hasText: 'Iniciar Solo' });
  33 |     await startGameBtn.click();
  34 | 
  35 |     // Aguardar redirecionamento para o GamePage
> 36 |     await page.waitForURL(/\/game\/.*/, { timeout: 10000 });
     |                ^ TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
  37 | 
  38 |     // Verificar se o texto "DEFESA NAVAL" está visível
  39 |     await expect(page.locator('text="DEFESA NAVAL"')).toBeVisible({ timeout: 15000 });
  40 | 
  41 |     // A Grid deve ter sido renderizada (não pode estar "Iniciando Varredura...")
  42 |     const varreduraText = page.locator('text="Iniciando Varredura..."');
  43 |     await expect(varreduraText).not.toBeVisible();
  44 | 
  45 |     // Pelo menos uma célula do radar deve estar clicável
  46 |     const firstCell = page.locator('.grid-cell').first();
  47 |     await expect(firstCell).toBeVisible();
  48 | 
  49 |     // Clicar em uma célula do radar
  50 |     await firstCell.click();
  51 | 
  52 |     // Validar abertura do modal de Pergunta
  53 |     const questionModal = page.locator('.question-modal-box');
  54 |     await expect(questionModal).toBeVisible({ timeout: 5000 });
  55 |   });
  56 | });
  57 | 
```