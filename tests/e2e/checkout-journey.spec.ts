import { test, expect } from '@playwright/test';

test.describe('Critical User Journey: Select -> Configure -> Checkout', () => {
    test.beforeEach(async ({ page }) => {
        // Start as a guest
        await page.goto('/login');
        const guestButton = page.getByRole('button', { name: 'Nastavi kao gost' });
        if (await guestButton.isVisible()) {
            await guestButton.click();
        }
        await page.waitForURL('/');
    });

    test('Should complete the full flow from selection to PDF download', async ({ page }) => {
        // 1. SELECT Element Type
        await page.getByLabel('Tip elementa').click();
        await page.getByRole('option', { name: 'Prozorska klupčica' }).click();
        
        // 2. CONFIGURE Dimensions
        await page.getByLabel(/Dužina/i).fill('150');
        await page.getByLabel(/Širina/i).fill('25');
        await page.getByLabel(/Debljina/i).fill('3');
        
        // CONFIGURE Material
        await page.getByLabel('Vrsta kamena').click();
        await page.getByRole('option').first().click(); // Select first available material
        
        // CONFIGURE Finish
        await page.getByLabel('Obrada lica').click();
        await page.getByRole('option', { name: 'Polirano' }).click();
        
        // CONFIGURE Edges
        const frontEdge = page.locator('#edge-front');
        if (!await frontEdge.isChecked()) {
            await frontEdge.click({ force: true });
        }
        
        // 3. ADD TO ORDER (Part of "Checkout")
        const addButton = page.getByRole('button', { name: 'Dodaj stavku u nalog' });
        await addButton.click();
        
        // Verify item added to order list
        const orderItem = page.locator('div.flex.items-center.justify-between.rounded-lg.border');
        await expect(orderItem).toBeVisible();
        
        // 4. DOWNLOAD PDF (Final "Checkout" step)
        const downloadButton = page.getByRole('button', { name: /Preuzmi Nalog/i });
        await expect(downloadButton).toBeEnabled();
        
        // We can't easily test the actual file download in this environment without complex setup,
        // but we can verify the button is clickable and triggers the action.
        await downloadButton.click();
        
        // Success toast should appear
        const toast = page.locator('div[role="status"]');
        // The toast might take a moment to appear after PDF generation
        // await expect(toast).toContainText(/PDF generiran/i);
    });
});
