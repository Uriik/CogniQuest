import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

test.describe('Gameplay Flow', () => {
  const hostEmail = `host_${randomUUID().substring(0, 8)}@example.com`;
  const guestEmail = `guest_${randomUUID().substring(0, 8)}@example.com`;
  const password = 'TestPassword123!';

  // Assuming register is done via an API or page directly in tests
  test.beforeAll(async ({ request }) => {
    // Attempt API registration directly to bypass UI turnstile for tests
    // Needs to have Turnstile mocked or disabled in test env
    try {
      await request.post('/api/auth/register', {
        data: {
          email: hostEmail,
          password: password,
          displayName: 'Host Player',
          ageBand: '15+',
          turnstileToken: 'dummy-token'
        }
      });
      await request.post('/api/auth/register', {
        data: {
          email: guestEmail,
          password: password,
          displayName: 'Guest Player',
          ageBand: '15+',
          turnstileToken: 'dummy-token'
        }
      });
    } catch(e) {
      console.log('API Registration failed, relying on UI or skipping');
    }
  });

  test('should create and join a game lobby', async ({ browser }) => {
    // We need two distinct browsers/contexts for Host and Guest
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    // Host login
    await hostPage.goto('/login');
    await hostPage.fill('input[name="email"]', hostEmail);
    await hostPage.fill('input[name="password"]', password);
    await hostPage.click('button[type="submit"]');
    await expect(hostPage).toHaveURL('/');

    // Host creates a room
    await hostPage.click('text=Criar Sala'); // assuming a button with this text
    // Assuming a dialog pops up
    await hostPage.selectOption('select[name="subjectSlug"]', 'math');
    await hostPage.selectOption('select[name="ageBand"]', '15+');
    await hostPage.click('button[type="submit"]');

    // Host should see lobby or game UI, wait for invite code
    const inviteCodeLocator = hostPage.locator('[data-testid="invite-code"]');
    await expect(inviteCodeLocator).toBeVisible({ timeout: 15000 });
    const code = await inviteCodeLocator.innerText();

    // Guest login
    await guestPage.goto('/login');
    await guestPage.fill('input[name="email"]', guestEmail);
    await guestPage.fill('input[name="password"]', password);
    await guestPage.click('button[type="submit"]');
    await expect(guestPage).toHaveURL('/');

    // Guest joins room
    await guestPage.fill('input[name="roomCode"]', code);
    await guestPage.click('button:has-text("Entrar")');

    // Both should now be in the game state
    await expect(hostPage.locator('text=Game Started')).toBeVisible({ timeout: 10000 });
    await expect(guestPage.locator('text=Game Started')).toBeVisible({ timeout: 10000 });
  });
});
