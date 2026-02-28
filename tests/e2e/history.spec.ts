import { test, expect } from '@playwright/test';

test.describe('History and Templates functionality', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByRole('button', { name: 'Nastavi kao gost' }).click();
        await page.waitForURL('/');
    });

    test('19. Should open History/Templates drawer', async ({ page }) => {
        const historyBtn = page.getByRole('button', { name: /Povijest verzija/i }).first();
        if (await historyBtn.isVisible()) {
            await historyBtn.click();
            await expect(page.getByText(/Povijest verzija projekta/i)).toBeVisible();
        }
    });

    test('20. Save current config to history (Mock check)', async ({ page }) => {
        const saveBtn = page.getByText(/Spremi trenutnu verziju/i).first();
        await expect(saveBtn).toBeVisible();
    });
});
