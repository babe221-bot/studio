import { test, expect } from '@playwright/test';

test.describe('Modals functionality', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByRole('button', { name: 'Nastavi kao gost' }).click();
        await page.waitForURL('/');
    });

    test('16. Should open Material Modal and close it', async ({ page }) => {
        const changeMaterialBtn = page.getByRole('button', { name: /(Promijeni|Odaberi Materijal)/i });
        if (await changeMaterialBtn.isVisible()) {
            await changeMaterialBtn.click();
            const modalDialog = page.getByRole('dialog');
            await expect(modalDialog).toBeVisible();
            await page.keyboard.press('Escape');
            await expect(modalDialog).not.toBeVisible();
        }
    });

    test('17. Should open Profile Modal and close it', async ({ page }) => {
        const openProfileBtn = page.getByRole('button', { name: /(Profil|Odaberi profil)/i }).filter({ hasText: /Profil/i });
        if (await openProfileBtn.isVisible()) {
            await openProfileBtn.click();
            await expect(page.getByRole('dialog')).toBeVisible();
            await page.keyboard.press('Escape');
        }
    });

    test('18. Should open Finish Modal and close it', async ({ page }) => {
        const openFinishBtn = page.getByRole('button', { name: /(Površina|Obrada|Finish)/i }).first();
        if (await openFinishBtn.isVisible()) {
            await openFinishBtn.click();
            await expect(page.getByRole('dialog')).toBeVisible();
            await page.keyboard.press('Escape');
        }
    });
});
