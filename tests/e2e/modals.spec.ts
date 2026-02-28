import { test, expect } from '@playwright/test';

test.describe('Modals functionality', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByRole('button', { name: 'Nastavi kao gost' }).click();
        await page.waitForURL('/');
    });

    test('16. Should open Material Modal and close it', async ({ page }) => {
        const addMaterialBtn = page.getByRole('button', { name: 'Dodaj novi materijal' });
        await expect(addMaterialBtn).toBeVisible();
        await addMaterialBtn.click();
        const modalDialog = page.getByRole('dialog');
        await expect(modalDialog).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(modalDialog).not.toBeVisible();
    });

    test('17. Should open Profile Modal and close it', async ({ page }) => {
        const addProfileBtn = page.getByRole('button', { name: 'Dodaj novi profil ivice' });
        await expect(addProfileBtn).toBeVisible();
        await addProfileBtn.click();
        const modalDialog = page.getByRole('dialog');
        await expect(modalDialog).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(modalDialog).not.toBeVisible();
    });

    test('18. Should open Finish Modal and close it', async ({ page }) => {
        const addFinishBtn = page.getByRole('button', { name: 'Dodaj novu obradu lica' });
        await expect(addFinishBtn).toBeVisible();
        await addFinishBtn.click();
        const modalDialog = page.getByRole('dialog');
        await expect(modalDialog).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(modalDialog).not.toBeVisible();
    });
});
