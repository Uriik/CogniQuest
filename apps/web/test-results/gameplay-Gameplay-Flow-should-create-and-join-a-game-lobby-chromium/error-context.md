# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: gameplay.spec.ts >> Gameplay Flow >> should create and join a game lobby
- Location: e2e\gameplay.spec.ts:37:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected: "http://localhost:3000/"
Received: "http://localhost:3000/login"
Timeout:  5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    14 × unexpected value "http://localhost:3000/login"

```

```yaml
- img "CogniQuest Logo"
- heading "Acesse sua Conta" [level=2]
- paragraph: Entre na arena do conhecimento gamificado
- text: E-mail ou senha incorretos. E-mail
- textbox "E-mail":
  - /placeholder: nome@exemplo.com
  - text: host_fe0412b9@example.com
- text: Senha
- link "Esqueci a senha":
  - /url: /forgot-password
- textbox "Senha":
  - /placeholder: ••••••••
  - text: TestPassword123!
- button "Entrar na Arena"
- text: Não tem uma conta?
- link "Cadastrar-se":
  - /url: /register
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { randomUUID } from 'crypto';
  3  | 
  4  | test.describe('Gameplay Flow', () => {
  5  |   const hostEmail = `host_${randomUUID().substring(0, 8)}@example.com`;
  6  |   const guestEmail = `guest_${randomUUID().substring(0, 8)}@example.com`;
  7  |   const password = 'TestPassword123!';
  8  | 
  9  |   // Assuming register is done via an API or page directly in tests
  10 |   test.beforeAll(async ({ request }) => {
  11 |     // Attempt API registration directly to bypass UI turnstile for tests
  12 |     // Needs to have Turnstile mocked or disabled in test env
  13 |     try {
  14 |       await request.post('/api/auth/register', {
  15 |         data: {
  16 |           email: hostEmail,
  17 |           password: password,
  18 |           displayName: 'Host Player',
  19 |           grade: '3-em',
  20 |           turnstileToken: 'dummy-token'
  21 |         }
  22 |       });
  23 |       await request.post('/api/auth/register', {
  24 |         data: {
  25 |           email: guestEmail,
  26 |           password: password,
  27 |           displayName: 'Guest Player',
  28 |           grade: '3-em',
  29 |           turnstileToken: 'dummy-token'
  30 |         }
  31 |       });
  32 |     } catch(e) {
  33 |       console.log('API Registration failed, relying on UI or skipping');
  34 |     }
  35 |   });
  36 | 
  37 |   test('should create and join a game lobby', async ({ browser }) => {
  38 |     // We need two distinct browsers/contexts for Host and Guest
  39 |     const hostContext = await browser.newContext();
  40 |     const guestContext = await browser.newContext();
  41 | 
  42 |     const hostPage = await hostContext.newPage();
  43 |     const guestPage = await guestContext.newPage();
  44 | 
  45 |     // Host login
  46 |     await hostPage.goto('/login');
  47 |     await hostPage.fill('input[name="email"]', hostEmail);
  48 |     await hostPage.fill('input[name="password"]', password);
  49 |     await hostPage.click('button[type="submit"]');
> 50 |     await expect(hostPage).toHaveURL('/');
     |                            ^ Error: expect(page).toHaveURL(expected) failed
  51 | 
  52 |     // Host creates a room
  53 |     await hostPage.click('text=Criar Sala'); // assuming a button with this text
  54 |     // Assuming a dialog pops up
  55 |     await hostPage.selectOption('select[name="subjectSlug"]', 'math');
  56 |     await hostPage.click('button:has-text("3º EM")');
  57 |     await hostPage.click('button[type="submit"]');
  58 | 
  59 |     // Host should see lobby or game UI, wait for invite code
  60 |     const inviteCodeLocator = hostPage.locator('[data-testid="invite-code"]');
  61 |     await expect(inviteCodeLocator).toBeVisible({ timeout: 15000 });
  62 |     const code = await inviteCodeLocator.innerText();
  63 | 
  64 |     // Guest login
  65 |     await guestPage.goto('/login');
  66 |     await guestPage.fill('input[name="email"]', guestEmail);
  67 |     await guestPage.fill('input[name="password"]', password);
  68 |     await guestPage.click('button[type="submit"]');
  69 |     await expect(guestPage).toHaveURL('/');
  70 | 
  71 |     // Guest joins room
  72 |     await guestPage.fill('input[name="roomCode"]', code);
  73 |     await guestPage.click('button:has-text("Entrar")');
  74 | 
  75 |     // Both should now be in the game state
  76 |     await expect(hostPage.locator('text=Game Started')).toBeVisible({ timeout: 10000 });
  77 |     await expect(guestPage.locator('text=Game Started')).toBeVisible({ timeout: 10000 });
  78 |   });
  79 | });
  80 | 
```