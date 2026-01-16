import { test, expect } from '@playwright/test';

test('simple connectivity check', async ({ page }) => {
    console.log('Navigating to /');
    await page.goto('/');
    console.log('Checking title...');
    await expect(page).toHaveTitle(/demo/);
    console.log('Checking for login form...');
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('button[name="login"]')).toBeVisible();
    console.log('Connectivity verified!');
});
