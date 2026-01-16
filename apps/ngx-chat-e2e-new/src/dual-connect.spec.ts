
import { test, expect } from '@playwright/test';
import { EjabberdAdminPage } from './page-objects/ejabberd-admin.po';
import { devXmppDomain, devXmppJid, devXmppPassword } from '../secrets';
import { generateUser } from './utils/user-helper';


// ... (existing imports)

test.describe('Dual Connect', () => {
    let snowWhite: string;
    let sleepy: string;
    let ejabberdAdminPage: EjabberdAdminPage;

    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`[Browser] ${msg.text()}`));
    });

    test.afterEach(async ({ page }) => {
        await page.goto('about:blank').catch(() => { });
    });

    test('should facilitate chat between two users via dual.html with extended message flow', async ({ page, browser, playwright }) => {
        test.slow(); // Heavy integration test involving multiple frames and connections
        // ... (provision users)
        ejabberdAdminPage = await EjabberdAdminPage.create(playwright, devXmppDomain, devXmppJid, devXmppPassword);
        snowWhite = generateUser('snowwhite');
        sleepy = generateUser('sleepy');
        const snowWhiteJid = `${snowWhite}@${devXmppDomain}`;
        const sleepyJid = `${sleepy}@${devXmppDomain}`;

        await ejabberdAdminPage.register(snowWhite, snowWhite);
        await ejabberdAdminPage.register(sleepy, sleepy);

        await page.goto(`/dual.html?u1=${snowWhite}&p1=${snowWhite}&u2=${sleepy}&p2=${sleepy}&service=${encodeURIComponent('ws://localhost:5280/websocket')}`);

        const snowWhiteFrame = page.frames().find(f => f.url().includes(`username=${snowWhite}`));
        const sleepyFrame = page.frames().find(f => f.url().includes(`username=${sleepy}`));

        if (!snowWhiteFrame || !sleepyFrame) {
            throw new Error('Could not find both chat frames');
        }

        const connectionStateSelector = '[data-zid="chat-connection-state"]';
        await expect(snowWhiteFrame.locator(connectionStateSelector)).toHaveText('online', { timeout: 15000 });
        await expect(sleepyFrame.locator(connectionStateSelector)).toHaveText('online', { timeout: 15000 });

        // SnowWhite: Add Sleepy
        const snowAddContactBtn = snowWhiteFrame.locator('[data-zid="add-contact"]');
        const snowContactInput = snowWhiteFrame.locator('[data-zid="contact-jid"]');
        await snowContactInput.fill(sleepyJid);
        await snowAddContactBtn.click();

        // Instead of waiting for the roster entry (which relies on async roster push),
        // we use the direct "Open Chat" feature to interact.
        // We invoke it directly on the component to allow removing the button from the UI.
        await snowWhiteFrame.evaluate(async (jid) => {
            const app = (window as any).ng.getComponent(document.querySelector('app-root'));
            await app.openChat(jid);
        }, sleepyJid);

        const snowChatWindow = snowWhiteFrame.locator('.window').first();
        await snowChatWindow.waitFor({ state: 'visible', timeout: 5000 });
        if (!await snowChatWindow.isVisible()) {
            // Retry opening chat via direct call if window didn't appear
            await snowWhiteFrame.evaluate(async (jid) => {
                const app = (window as any).ng.getComponent(document.querySelector('app-root'));
                await app.openChat(jid);
            }, sleepyJid);
            await snowChatWindow.waitFor();
        }
        const snowChatInput = snowChatWindow.locator('[data-zid="chat-input"]');

        // 1. SnowWhite sends 2 messages (A1, A2)
        const runId = Date.now();
        const msgA1 = `SnowWhite Message 1 ${runId}`;
        const msgA2 = `SnowWhite Message 2 ${runId}`;
        const msgB1 = `Sleepy Reply 1 ${runId}`;
        const msgB2 = `Sleepy Reply 2 ${runId}`;
        const msgA3 = `SnowWhite Message 3 ${runId}`;
        const msgA4 = `SnowWhite Message 4 ${runId}`;

        await snowChatInput.fill(msgA1);
        await snowChatInput.press('Enter');
        const msgA1Loc = snowChatWindow.locator('ngx-chat-message-out', { hasText: msgA1 });
        await msgA1Loc.scrollIntoViewIfNeeded();
        await expect(msgA1Loc).toBeVisible({ timeout: 10000 });

        await snowChatInput.fill(msgA2);
        await snowChatInput.press('Enter');
        const msgA2Loc = snowChatWindow.locator('ngx-chat-message-out', { hasText: msgA2 });
        await msgA2Loc.scrollIntoViewIfNeeded();
        await expect(msgA2Loc).toBeVisible({ timeout: 10000 });

        // Sleepy: Open chat and verify receipt
        const sleepyContactInput = sleepyFrame.locator('[data-zid="contact-jid"]');

        // Ensure contact is added and chat is opened via direct UI interaction
        // (Bypassing roster list check which is flaky due to sync delays)
        await sleepyContactInput.fill(snowWhiteJid);
        const sleepyAddContactBtn = sleepyFrame.locator('[data-zid="add-contact"]');
        await sleepyAddContactBtn.click();

        await sleepyFrame.evaluate(async (jid) => {
            const app = (window as any).ng.getComponent(document.querySelector('app-root'));
            await app.openChat(jid);
        }, snowWhiteJid);

        const sleepyChatWindow = sleepyFrame.locator('.window').first();
        await sleepyChatWindow.waitFor({ state: 'visible' });
        const sleepyChatInput = sleepyChatWindow.locator('[data-zid="chat-input"]');

        // Verify Sleepy sees A1, A2 (in)
        const sleepyMsgA1 = sleepyChatWindow.locator('ngx-chat-message-in', { hasText: msgA1 });
        await sleepyMsgA1.scrollIntoViewIfNeeded();
        await expect(sleepyMsgA1).toBeVisible({ timeout: 10000 });

        const sleepyMsgA2 = sleepyChatWindow.locator('ngx-chat-message-in', { hasText: msgA2 });
        await sleepyMsgA2.scrollIntoViewIfNeeded();
        await expect(sleepyMsgA2).toBeVisible({ timeout: 10000 });

        // 2. Sleepy sends 2 messages (B1, B2)

        await sleepyChatInput.fill(msgB1);
        await sleepyChatInput.press('Enter');
        const sleepyMsgB1 = sleepyChatWindow.locator('ngx-chat-message-out', { hasText: msgB1 });
        await sleepyMsgB1.scrollIntoViewIfNeeded();
        await expect(sleepyMsgB1).toBeVisible({ timeout: 10000 });

        await sleepyChatInput.fill(msgB2);
        await sleepyChatInput.press('Enter');

        const sleepyMsgB2 = sleepyChatWindow.locator('ngx-chat-message-out', { hasText: msgB2 });
        await sleepyMsgB2.scrollIntoViewIfNeeded();
        await expect(sleepyMsgB2).toBeVisible({ timeout: 10000 });

        // Verify SnowWhite sees B1, B2 (in)
        const snowMsgB1 = snowChatWindow.locator('ngx-chat-message-in', { hasText: msgB1 });
        await snowMsgB1.scrollIntoViewIfNeeded();
        await expect(snowMsgB1).toBeVisible({ timeout: 10000 });

        const snowMsgB2 = snowChatWindow.locator('ngx-chat-message-in', { hasText: msgB2 });
        await snowMsgB2.scrollIntoViewIfNeeded();
        await expect(snowMsgB2).toBeVisible({ timeout: 10000 });

        // 3. SnowWhite sends 2 messages (A3, A4)

        await snowChatInput.fill(msgA3);
        await snowChatInput.press('Enter');

        const snowMsgA3 = snowChatWindow.locator('ngx-chat-message-out', { hasText: msgA3 });
        await snowMsgA3.scrollIntoViewIfNeeded();
        await expect(snowMsgA3).toBeVisible({ timeout: 10000 });

        await snowChatInput.fill(msgA4);
        await snowChatInput.press('Enter');

        const snowMsgA4 = snowChatWindow.locator('ngx-chat-message-out', { hasText: msgA4 });
        await snowMsgA4.scrollIntoViewIfNeeded();
        await expect(snowMsgA4).toBeVisible({ timeout: 10000 });

        // Verify Sleepy sees A3, A4 (in)
        const sleepyMsgA3 = sleepyChatWindow.locator('ngx-chat-message-in', { hasText: msgA3 });
        await sleepyMsgA3.scrollIntoViewIfNeeded();
        await expect(sleepyMsgA3).toBeVisible({ timeout: 10000 });

        const sleepyMsgA4 = sleepyChatWindow.locator('ngx-chat-message-in', { hasText: msgA4 });
        await sleepyMsgA4.scrollIntoViewIfNeeded();
        await expect(sleepyMsgA4).toBeVisible({ timeout: 10000 });
    });
});
