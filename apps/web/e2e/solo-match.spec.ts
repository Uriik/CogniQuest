import { test, expect } from '@playwright/test';

test.describe('Solo Match Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Inject auth session
    await page.goto('/api/auth/test-session');
  });

  test('Deve entrar na partida solo e carregar o radar imediatamente', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    await page.goto('/lobby');

    // Clicar em "Criar Nova Sala"
    const createRoomBtn = page.locator('button', { hasText: 'Criar Nova Sala' });
    await expect(createRoomBtn).toBeVisible();
    await createRoomBtn.click();

    // Aguardar o redirecionamento para criação de sala
    await page.waitForURL(/\/lobby\/create/);

    // Clicar no botão "Solo (vs Máquina)"
    const soloOption = page.locator('button', { hasText: 'Solo (vs Máquina)' });
    await soloOption.click();

    // Selecionar a primeira matéria disponível para não dar erro
    const firstSubject = page.locator('.setup-subject-btn').first();
    await expect(firstSubject).toBeVisible();
    await firstSubject.click();

    const startGameBtn = page.locator('button', { hasText: 'Iniciar Solo' });
    await startGameBtn.click();

    // Aguardar redirecionamento para o GamePage
    await page.waitForURL(/\/game\/.*/, { timeout: 10000 });

    // Verificar se o texto "DEFESA NAVAL" está visível
    await expect(page.locator('text="DEFESA NAVAL"')).toBeVisible({ timeout: 15000 });

    // A Grid deve ter sido renderizada (não pode estar "Iniciando Varredura...")
    const varreduraText = page.locator('text="Iniciando Varredura..."');
    await expect(varreduraText).not.toBeVisible();

    // Pelo menos uma célula do radar deve estar clicável
    const firstCell = page.locator('.grid-cell').first();
    await expect(firstCell).toBeVisible();

    // Clicar em uma célula do radar
    await firstCell.click();

    // Validar abertura do modal de Pergunta
    const questionModal = page.locator('.question-modal-box');
    await expect(questionModal).toBeVisible({ timeout: 5000 });
  });
});
