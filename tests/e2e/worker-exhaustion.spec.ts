import { test, expect } from '@playwright/test';

test.describe('Worker Pool Exhaustion', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByRole('button', { name: 'Nastavi kao gost' }).click();
        await page.waitForURL('/');
    });

    test('Rapidly change dimensions 50+ times', async ({ page }) => {
        // Go to Lab component by clicking the order/calculation section
        // Depending on UI, the dimension inputs are usually length, width, height.
        // I will find the length input and type into it rapidly.

        await page.waitForSelector('input[name="dims.length"]', { state: 'visible', timeout: 10000 });
        const lengthInput = page.locator('input[name="dims.length"]');

        // Listen for console messages to check for crashing or queueing
        const consoleMessages: string[] = [];
        page.on('console', msg => {
            if (msg.text().includes('[WorkerPool]')) {
                consoleMessages.push(msg.text());
                console.log(msg.text());
            }
        });

        for (let i = 0; i < 50; i++) {
            await lengthInput.fill((100 + i).toString());
            // small delay to let react state trigger worker
            await page.waitForTimeout(50);
        }

        // Wait to see if workers crash
        await page.waitForTimeout(2000);

        const crashed = consoleMessages.some(msg => msg.includes('error') || msg.includes('timed out'));
        const queued = consoleMessages.some(msg => msg.includes('queued'));

        console.log(`Crashed: ${crashed}, Queued: ${queued}`);

        // We're just asserting it doesn't crash the whole page, 
        // but evaluating the logs for diagnostic purposes.
        expect(page.locator('input[name="dims.length"]')).toBeVisible();
    });
});
