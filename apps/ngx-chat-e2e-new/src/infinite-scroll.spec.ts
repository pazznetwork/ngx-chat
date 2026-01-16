
import { test, expect } from '@playwright/test';
import { AppPage } from './page-objects/app.po';
import { ChatWindowPage } from './page-objects/chat-window.po';
import { EjabberdAdminPage } from './page-objects/ejabberd-admin.po';

test.describe('Infinite Scroll', () => {
    let snowWhite: AppPage;
    let sleepy: AppPage;
    let snowWhitePage: any;
    let sleepyPage: any;

    test.beforeEach(async ({ browser, playwright }) => {
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

    test('should load recent messages initially and older messages on scroll', async ({ playwright }) => {
        test.setTimeout(120000);
        const suffix = Date.now();
        const u1 = 'sw_' + suffix;
        const u2 = 'sl_' + suffix;
        const pass = 'password';

        // Provision users via API for speed/stability
        const ejabberdAdmin = await EjabberdAdminPage.create(playwright);
        await ejabberdAdmin.register(u1, pass);
        await ejabberdAdmin.register(u2, pass);

        // 1. Establish connection (Login only, as registered via API)
        console.log(`Logging in ${u1}...`);
        await snowWhite.logIn(u1, pass);
        await expect(snowWhitePage.locator('[data-zid="chat-connection-state"]')).toHaveText('online');

        console.log(`Logging in ${u2}...`);
        await sleepy.logIn(u2, pass);
        await expect(sleepyPage.locator('[data-zid="chat-connection-state"]')).toHaveText('online');

        // 2. SnowWhite creates history (60 messages)
        await snowWhitePage.waitForTimeout(1000); // Wait for roster sync

        const u2Jid = `${u2}@local-jabber.entenhausen.pazz.de`;
        const u1Jid = `${u1}@local-jabber.entenhausen.pazz.de`; // Snow white JID

        console.log(`SnowWhite adding ${u2Jid}...`);
        await snowWhite.addContact(u2Jid);
        await snowWhite.selectChatWithContact(u2Jid);

        const chatWindow = new ChatWindowPage(snowWhitePage, u2Jid);

        const messageCountToSend = 50;
        console.log(`Sending ${messageCountToSend} messages...`);
        const longText = ' This is a long message to ensure we overflow the container height. '.repeat(5);
        for (let i = 1; i <= messageCountToSend; i++) {
            await chatWindow.write(`History Message ${i} ${longText}`);
        }

        // Allow time for Sleepy (currently connected) to receive them, 
        // ensuring they are archived on server.
        await sleepyPage.waitForTimeout(2000);

        // 3. Sleepy reloads to test fresh history loading
        console.log('Reloading Sleepy...');
        await sleepyPage.reload();
        await sleepy.logIn(u2, pass);
        await expect(sleepyPage.locator('[data-zid="chat-connection-state"]')).toHaveText('online');

        // 4. Sleepy opens chat
        await sleepy.openChatWithUnaffiliatedContact(u1Jid);
        const sleepyChat = new ChatWindowPage(sleepyPage, u1Jid);

        // 5. Verify only partial messages loaded initially (approx 10-20?)
        await sleepyChat.waitForMessageCount(1); // Wait for initial load
        let messageCount = await sleepyChat.getMessageCount();
        console.log('Initial message count:', messageCount);

        // Expectation: If 20 messages, and page size is 10. Initial 10-15.
        expect(messageCount).toBeGreaterThan(0);

        // 6. Scroll Up to Load More
        console.log('Scrolling up...');
        await sleepyChat.scrollToTop();
        // Wait for potential loading
        await sleepyPage.waitForTimeout(3000);

        // 7. Verify more messages loaded
        let newMessageCount = await sleepyChat.getMessageCount();
        console.log('New message count:', newMessageCount);
        expect(newMessageCount).toBeGreaterThan(messageCount);
    });
});
