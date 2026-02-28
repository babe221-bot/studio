import { test, expect } from '@playwright/test';

test.describe('Home Page and General UI', () => {
    test.beforeEach(async ({ page }) => {
        // Authenticate as guest first
        await page.goto('/login');
        await page.getByRole('button', { name: 'Nastavi kao gost' }).click();
        await page.waitForURL('/');
    });

    test('5. Should render the Header with user info', async ({ page }) => {
        await expect(page.locator('header')).toBeVisible();
        await expect(page.getByText('Gost', { exact: true })).toBeVisible();
    });

    test('6. Should display the AI Assistant section', async ({ page }) => {
        await expect(page.getByRole('button', { name: /Otvori AI Pomoćnika/i })).toBeVisible();
        await page.getByRole('button', { name: /Otvori AI Pomoćnika/i }).click();
        await expect(page.getByText('AI Pomoćnik')).toBeVisible();
    });

    test('7. Settings panel should be visible', async ({ page }) => {
        // Look for typical Lab headings
        await expect(page.getByText('1. Unos naloga')).toBeVisible();
        await expect(page.getByText('2. Odabir materijala')).toBeVisible();
    });

    test('8. Should format price correctly', async ({ page }) => {
        await expect(page.getByText('Ukupni trošak')).toBeVisible();
        await expect(page.getByText(/€/).first()).toBeVisible();
    });
});
