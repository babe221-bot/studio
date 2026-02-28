import { test, expect } from '@playwright/test';

test.describe('Authentication and Login', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
    });

    test('1. Should display login page correctly', async ({ page }) => {
        await expect(page.getByText('Prijava', { exact: true })).toBeVisible();
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Prijavi se', exact: true })).toBeVisible();
    });

    test('2. Should show validation error for empty fields', async ({ page }) => {
        await page.getByRole('button', { name: 'Prijavi se' }).click();

        // Browsers handle HTML5 required natively, let's verify native validation
        const emailInput = page.locator('input[type="email"]');
        const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
        expect(validationMessage).not.toBe('');
    });

    test('3. Should allow continuing as guest', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Nastavi kao gost' })).toBeVisible();
    });

    test('4. Guest login redirects to home and header shows', async ({ page }) => {
        await page.getByRole('button', { name: 'Nastavi kao gost' }).click();

        // Wait for redirection
        await page.waitForURL('/');
        await expect(page.locator('header')).toBeVisible();
    });
});
