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
        await expect(page.getByText('Gost Korisnik')).toBeVisible();
    });

    test('6. Should display the AI Assistant section', async ({ page }) => {
        await expect(page.locator('.fixed.bottom-4.right-4.z-50')).toBeVisible();
        // This is the AI assistant chat toggle button
        await page.locator('.fixed.bottom-4.right-4.z-50 button').first().click();
        await expect(page.getByText('AI Asistent')).toBeVisible();
    });

    test('7. Settings panel should be visible', async ({ page }) => {
        // Look for typical Lab headings
        await expect(page.getByText('Dimenzije i Količina')).toBeVisible();
        await expect(page.getByText('Materijal')).toBeVisible();
    });

    test('8. Should format price correctly', async ({ page }) => {
        // Validate that total is rendered and formatted (e.g. Total: 0,00 €)
        const totalAmountText = await page.locator('.text-3xl.font-bold, .text-4xl.font-bold').first().innerText();
        expect(totalAmountText).toContain('€');
    });
});
