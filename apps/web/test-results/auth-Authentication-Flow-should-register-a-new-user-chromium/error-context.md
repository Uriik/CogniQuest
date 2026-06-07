# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication Flow >> should register a new user
- Location: e2e\auth.spec.ts:8:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Cadastro Realizado!')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('text=Cadastro Realizado!')

```

```yaml
- img "CogniQuest Logo"
- heading "Crie sua Conta" [level=2]
- paragraph: Junte-se à arena do conhecimento gamificado
- text: Por favor, resolva o captcha antes de continuar. Nome de Exibição
- textbox "Nome de Exibição":
  - /placeholder: Seu nome no jogo
  - text: Playwright Tester
- text: E-mail
- textbox "E-mail":
  - /placeholder: nome@exemplo.com
  - text: test_644df3d2@example.com
- text: Senha
- textbox "Senha":
  - /placeholder: ••••••••
  - text: TestPassword123!
- text: A senha precisa de 8+ caracteres, incluindo letras e números. Série Escolar
- combobox "Série Escolar":
  - option "Selecione..." [disabled]
  - option "6º Ano"
  - option "7º Ano"
  - option "8º Ano"
  - option "9º Ano"
  - option "1º EM"
  - option "2º EM"
  - option "3º EM" [selected]
- button "Cadastrar-se"
- text: Já tem uma conta?
- link "Fazer Login":
  - /url: /login
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { randomUUID } from 'crypto';
  3  | 
  4  | test.describe('Authentication Flow', () => {
  5  |   const randomEmail = `test_${randomUUID().substring(0, 8)}@example.com`;
  6  |   const password = 'TestPassword123!';
  7  | 
  8  |   test('should register a new user', async ({ page }) => {
  9  |     // Go to registration page
  10 |     await page.goto('/register');
  11 |     
  12 |     // Fill out the form
  13 |     await page.fill('input[name="displayName"]', 'Playwright Tester');
  14 |     await page.fill('input[name="email"]', randomEmail);
  15 |     await page.fill('input[name="password"]', password);
  16 |     
  17 |     // Select age band
  18 |     await page.selectOption('select[name="grade"]', '3-em');
  19 |     
  20 |     // Note: Turnstile might block automated tests unless we use a mock token or test site key.
  21 |     // Assuming process.env.TURNSTILE_SECRET_KEY is mocked or disabled in test env.
  22 |     
  23 |     await page.click('button[type="submit"]');
  24 | 
  25 |     // Wait for redirect to login or success message
> 26 |     await expect(page.locator('text=Cadastro Realizado!')).toBeVisible({ timeout: 10000 });
     |                                                            ^ Error: expect(locator).toBeVisible() failed
  27 |   });
  28 | 
  29 |   test('should login with the created user', async ({ page }) => {
  30 |     // The previous test doesn't share state, so we will try to login
  31 |     // Depending on DB persistence across tests, this might fail if DB is reset.
  32 |     // Assuming DB is persistent for the run.
  33 |     await page.goto('/login');
  34 |     
  35 |     await page.fill('input[name="email"]', randomEmail);
  36 |     await page.fill('input[name="password"]', password);
  37 |     
  38 |     await page.click('button[type="submit"]');
  39 | 
  40 |     // Verify successful login by checking for dashboard/lobby redirect
  41 |     await expect(page).toHaveURL('/', { timeout: 10000 });
  42 |     
  43 |     // Check if user name is displayed
  44 |     await expect(page.locator('text=Playwright Tester')).toBeVisible();
  45 |   });
  46 | });
  47 | 
```