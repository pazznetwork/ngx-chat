
import { test, expect } from '@playwright/test';
import { AppPage } from './page-objects/app.po';
import { ChatWindowPage } from './page-objects/chat-window.po';
import { EjabberdAdminPage } from './page-objects/ejabberd-admin.po';

test.describe('Manual Chat (Big Box) Scroll', () => {
    let snowWhite: AppPage;
    let sleepy: AppPage;
    let snowWhitePage: any;
    let sleepyPage: any;

    test.beforeEach(async ({ browser }) => {
        snowWhite = await AppPage.create(browser);
        sleepy = await AppPage.create(browser);
        snowWhitePage = snowWhite.page;
        sleepyPage = sleepy.page;

        await snowWhite.setupForTest();
        await sleepy.setupForTest();
    });

    test.afterEach(async () => {
        await snowWhitePage.close();
        await sleepyPage.close();
    });

    test('should open Big Box only and load older messages on scroll', async ({ playwright }) => {
        test.setTimeout(120000);
        const suffix = Date.now();
        const u1 = 'sw_m_' + suffix; // use different prefix to differentiate in logs
        const u2 = 'sl_m_' + suffix;
        const pass = 'password';

        // Provision users
        const ejabberdAdmin = await EjabberdAdminPage.create(playwright);
        await ejabberdAdmin.register(u1, pass);
        await ejabberdAdmin.register(u2, pass);

        // 1. Establish connection (SnowWhite)
        await snowWhite.logIn(u1, pass);
        await expect(snowWhitePage.locator('[data-zid="chat-connection-state"]')).toHaveText('online');

        // 2. Establish connection (Sleepy)
        await sleepy.logIn(u2, pass);
        await expect(sleepyPage.locator('[data-zid="chat-connection-state"]')).toHaveText('online');

        // 3. SnowWhite creates history (Ensure enough messages for scrolling, e.g. 50)
        await snowWhitePage.waitForTimeout(1000);
        const u2Jid = `${u2}@local-jabber.entenhausen.pazz.de`;
        const u1Jid = `${u1}@local-jabber.entenhausen.pazz.de`;

        await snowWhite.addContact(u2Jid);
        // Use standard widget to send messages for convenience
        await snowWhite.selectChatWithContact(u2Jid);
        const chatWindow = new ChatWindowPage(snowWhitePage, u2Jid);

        console.log('Sending 50 messages...');
        for (let i = 1; i <= 50; i++) {
            await chatWindow.write(`Manual History ${i}`);
        }

        await sleepyPage.waitForTimeout(2000); // Wait for delivery

        // 4. Sleepy reloads to clean state
        console.log('Reloading Sleepy...');
        await sleepyPage.reload();
        await sleepy.logIn(u2, pass);
        await expect(sleepyPage.locator('[data-zid="chat-connection-state"]')).toHaveText('online');

        await sleepy.addContact(u1Jid); // Add to roster to see "Contacts chat" button
        await sleepyPage.waitForTimeout(2000); // Wait for roster sync

        // 5. Sleepy opens MANUAL (Big) chat
        console.log('Opening Big Box...');
        // Find button in "Contacts chat" list by text match, more robust
        const manualButton = sleepyPage.locator('button').filter({ hasText: u1Jid }).first();
        await manualButton.waitFor();
        await manualButton.click();

        // 6. Verify WIDGET (Small Box) is NOT visible
        // Use looser match for widget check to be safe
        const widgetWindow = sleepyPage.locator(`.window`).filter({ has: sleepyPage.locator(`[data-zid*="${u1Jid.toLowerCase()}"]`) });
        await expect(widgetWindow).toBeHidden();
        console.log('Verified: Small widget did NOT open.');

        // 7. Verify MANUAL Container IS visible
        // Use prefix match ^ because actual JID might include resource (e.g. /12345)
        const manualContainer = sleepyPage.locator(`[data-zid^="manual-chat-window-${u1Jid}"]`);
        await expect(manualContainer).toBeVisible();
        console.log('Verified: Big Box IS open.');

        // 8. Verify Initial Message Count in Manual View
        // The manual view uses ngx-chat-history, which renders same message components.
        // We target messages *inside* the manual container.
        const manualMessages = manualContainer.locator('ngx-chat-message-in, ngx-chat-message-out');
        await expect(async () => {
            const count = await manualMessages.count();
            expect(count).toBeGreaterThan(0);
        }).toPass();

        const initialCount = await manualMessages.count();
        console.log('Initial manual message count:', initialCount);

        // 9. Scroll Manual View
        console.log('Scrolling manual view...');
        const scrollContainer = manualContainer.locator('.chat-messages-auto-scroll');
        await scrollContainer.evaluate((el: HTMLElement) => {
            // Robust scroll trigger: Move slightly down then to 0 to trigger 'scroll' event
            el.scrollTop = 10;
            el.dispatchEvent(new Event('scroll'));
            el.scrollTop = 0;
            // Trigger scroll event manually if needed by the directive
            el.dispatchEvent(new Event('scroll'));
        });

        await expect(async () => {
            const currentCount = await manualMessages.count();
            if (currentCount > initialCount) {
                return;
            }

            // Trigger scroll again if needed
            const scrollContainer = manualContainer.locator('.chat-messages-auto-scroll');
            await scrollContainer.evaluate((el: HTMLElement) => {
                el.scrollTop = 10;
                el.dispatchEvent(new Event('scroll'));
                el.scrollTop = 0;
                el.dispatchEvent(new Event('scroll'));
            });

            await sleepyPage.waitForTimeout(2000); // Wait for load

            const newCount = await manualMessages.count();
            console.log(`Manual Scroll attempt: ${currentCount} -> ${newCount}`);
            expect(newCount).toBeGreaterThan(initialCount);
        }).toPass({ timeout: 30000 });
    });

    test('should open Small Box (Widget) and load older messages on scroll', async ({ playwright }) => {
        test.setTimeout(120000);
        // console.log('TEST VERSION: DEBUG-TIMESTAMP-2026-01-16-20-40');
        // The original code had `chatWindow` and `sleepyPage` defined later in this test.
        // To make `retrieveUserJids` callable here, it would need to be defined or passed differently.
        // Assuming `retrieveUserJids` is a placeholder for some setup logic that might use these,
        // but without its definition, it's commented out to maintain syntactical correctness.
        // await retrieveUserJids(chatWindow, sleepyPage);
        const suffix = Date.now();
        const u1 = 'sw_w_' + suffix;
        const u2 = 'sl_w_' + suffix;
        const pass = 'password';

        const ejabberdAdmin = await EjabberdAdminPage.create(playwright);
        await ejabberdAdmin.register(u1, pass);
        await ejabberdAdmin.register(u2, pass);

        await snowWhite.logIn(u1, pass);
        await sleepy.logIn(u2, pass);

        const u2Jid = `${u2}@local-jabber.entenhausen.pazz.de`;
        const u1Jid = `${u1}@local-jabber.entenhausen.pazz.de`;

        await snowWhite.addContact(u2Jid);
        await snowWhite.selectChatWithContact(u2Jid);
        const chatWindow = new ChatWindowPage(snowWhitePage, u2Jid);

        const longText = ' This is a long message to ensure we overflow the container height. '.repeat(5);
        console.log('Sending 50 messages (Long) (Widget Test)...');
        // Match infinite-scroll volume (50 long messages)
        for (let i = 1; i <= 50; i++) {
            await chatWindow.write(`Widget History ${i} ${longText}`);
        }
        await sleepyPage.waitForTimeout(2000);

        console.log('Reloading Sleepy...');
        await sleepyPage.reload();
        await sleepy.logIn(u2, pass);
        await sleepy.addContact(u1Jid); // Re-enabled to verify if roster presence fixes archiving
        // await sleepyPage.waitForTimeout(2000);

        console.log('Opening Small Box (Widget)...');
        const widgetChat = await sleepy.openChatWithUnaffiliatedContact(u1Jid);
        await widgetChat.open();

        // Use standard locator construction from page object to verify its existence
        const widgetContainer = sleepyPage.locator('.window').filter({ has: sleepyPage.locator(`[data-zid*="${u1Jid.toLowerCase()}"]`) });
        await expect(widgetContainer).toBeVisible();
        console.log('Verified: Small Box IS open.');

        // Verify Big Box hidden
        const manualContainer = sleepyPage.locator(`[data-zid^="manual-chat-window-${u1Jid}"]`);
        await expect(manualContainer).toBeHidden();

        // Initial Count
        await widgetChat.waitForMessageCount(5);
        const initialCount = await widgetChat.getMessageCount();
        console.log('Initial widget message count:', initialCount);
        expect(initialCount).toBeGreaterThan(0);

        // Scroll
        // Scroll loop until more messages load
        // Scroll loop until more messages load
        // Capture specific debug logs to avoid manual searching
        const debugLogs: string[] = [];
        sleepyPage.on('console', msg => {
            const text = msg.text();
            if (text.includes('MAM-DEBUG') || text.includes('PO-DEBUG')) {
                debugLogs.push(text);
            }
        });

        console.log('Scrolling widget view with retry logic...');

        try {
            await expect(async () => {
                // Re-fetch current count inside retry
                const currentCount = await widgetChat.getMessageCount();
                if (currentCount > initialCount) {
                    return; // Success
                }

                // Ensure widget is focused and container is visible
                await widgetChat.open();

                // Trigger scroll again if needed
                await widgetChat.scrollToTop();
                await sleepyPage.waitForTimeout(3000);

                const newCount = await widgetChat.getMessageCount();
                console.log(`Scroll attempt: ${currentCount} -> ${newCount}`);
                expect(newCount).toBeGreaterThan(initialCount);
            }).toPass({ timeout: 60000 }); // Increased timeout for CI
        } catch (error) {
            // On failure, surface the captured logs directly in the error message
            const formattedLogs = debugLogs.join('\n');
            const summary = `
========================================
SCROLL TEST FAILED - FORENSIC REPORT
========================================
Captured Debug Logs:
${formattedLogs}
========================================
Original Error: ${error.message}
`;
            throw new Error(summary);
        }

        const finalCount = await widgetChat.getMessageCount();
        console.log('Final widget message count:', finalCount);
    });
});
