import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

test.describe('Authentication Flow', () => {
  const randomEmail = `test_${randomUUID().substring(0, 8)}@example.com`;
  const password = 'TestPassword123!';

  test('should register a new user', async ({ page }) => {
    // Go to registration page
    await page.goto('/register');
    
    // Fill out the form
    await page.fill('input[name="displayName"]', 'Playwright Tester');
    await page.fill('input[name="email"]', randomEmail);
    await page.fill('input[name="password"]', password);
    
    // Select age band
    await page.selectOption('select[name="ageBand"]', '15+');
    
    // Note: Turnstile might block automated tests unless we use a mock token or test site key.
    // Assuming process.env.TURNSTILE_SECRET_KEY is mocked or disabled in test env.
    
    await page.click('button[type="submit"]');

    // Wait for redirect to login or success message
    await expect(page).toHaveURL('/login?registered=true', { timeout: 10000 });
  });

  test('should login with the created user', async ({ page }) => {
    // The previous test doesn't share state, so we will try to login
    // Depending on DB persistence across tests, this might fail if DB is reset.
    // Assuming DB is persistent for the run.
    await page.goto('/login');
    
    await page.fill('input[name="email"]', randomEmail);
    await page.fill('input[name="password"]', password);
    
    await page.click('button[type="submit"]');

    // Verify successful login by checking for dashboard/lobby redirect
    await expect(page).toHaveURL('/', { timeout: 10000 });
    
    // Check if user name is displayed
    await expect(page.locator('text=Playwright Tester')).toBeVisible();
  });
});
