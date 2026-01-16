import { test, expect } from '@playwright/test';
import { AppPage } from './page-objects/app.po';
import { ChatWindowPage } from './page-objects/chat-window.po';

test.describe('Data Persistence (No Wipe)', () => {
    let appPage: AppPage;
    const testContact = `persistence-user-${Date.now()}`;
    const domain = 'local-jabber.entenhausen.pazz.de';
    const fullJid = `${testContact}@${domain}`;

    test.beforeEach(async ({ browser }) => {
        appPage = await AppPage.create(browser);
        await appPage.setupForTest();
        await appPage.loginAdmin();
    });

    test('should keep roster and messages when offline', async () => {
        // 1. Setup Data (Contact + Message)
        const contactLocator = appPage.page.locator(`[title*="${testContact}"]`);
        const exists = await contactLocator.count() > 0;

        if (!exists) {
            await appPage.addContact(fullJid);
            // Wait for it to appear
            await contactLocator.first().waitFor({ timeout: 10000 });
        }

        let chatWindow: ChatWindowPage;
        // Re-check existence to be sure (waitFor throws if not found)
        chatWindow = await appPage.selectChatWithContact(testContact);
        await chatWindow.write('Persistence Check');

        // 2. Verify Data Exists (Online)
        await expect(appPage.page.locator(`[title*="${testContact}"]`).first()).toBeVisible();
        await chatWindow.assertLastMessage('Persistence Check', 'outgoing');

        // 3. Go Offline
        await appPage.page.context().setOffline(true);

        // Wait a bit to ensure potential wipe WOULD have happened
        await appPage.page.waitForTimeout(1000);

        // 4. Verify Data STILL Exists (Offline)
        // Roster should still have the contact
        await expect(appPage.page.locator(`[title*="${testContact}"]`).first()).toBeVisible();
        // Chat window should still have the message
        await chatWindow.assertLastMessage('Persistence Check', 'outgoing');

        // 5. Go Online
        await appPage.page.context().setOffline(false);

        // 6. Verify Data Remains (No Flicker/Wipe on Reconnect)
        await expect(appPage.page.locator(`[title*="${testContact}"]`).first()).toBeVisible();
        await chatWindow.assertLastMessage('Persistence Check', 'outgoing');
    });
});
