import { test, expect } from '@playwright/test';
import { AppPage } from './page-objects/app.po';
import { ChatWindowPage } from './page-objects/chat-window.po';

test.describe('Offline Message Receiving (MAM Catch-up)', () => {
    let pageA, pageB;
    const domain = 'local-jabber.entenhausen.pazz.de';

    test('should receive message sent while offline upon reconnection (Sequential Single Page)', async ({ browser }) => {
        const uniqueSuffix = Date.now();
        const userA = `user-a-${uniqueSuffix}`;
        const userB = `user-b-${uniqueSuffix}`;
        const userAJid = `${userA}@${domain}`;
        const userBJid = `${userB}@${domain}`;

        // Single Page for all interactions
        const appPage = await AppPage.create(browser);
        await appPage.setupForTest();

        // 1. Register Both Users & Ensure they handle auto-login
        const ensureRegisteredAndLoggedOut = async (user: string) => {
            try {
                await appPage.register(user, 'password');
                // Check if we are online (auto-login)
                try {
                    await expect(appPage.page.locator(appPage.connectionStateSelector)).toHaveText('online', { timeout: 5000 });
                    await appPage.logOut();
                    return;
                } catch (e) {
                    // Not online, maybe reload and try login to verify account exists?
                    await appPage.reload();
                }
            } catch (e) {
                await appPage.reload();
            }
        };

        await ensureRegisteredAndLoggedOut(userA);
        await ensureRegisteredAndLoggedOut(userB);

        // 2. Login A -> Add B -> Logout
        await appPage.logIn(userA, 'password');
        if (!await appPage.isContactInRoster(userB)) {
            await appPage.addContact(userBJid);
            // Wait for roster update? 
            // We can't wait for B to accept because B is offline.
            // But subscription request is sent.
        }
        await appPage.logOut();

        // 3. Login B -> Add A -> Send Message -> Logout
        await appPage.logIn(userB, 'password');
        if (!await appPage.isContactInRoster(userA)) {
            await appPage.addContact(userAJid);
        }

        // B needs to accept A's request? 
        // In this app, requests might be auto-accepted or require UI action.
        // If 'addContact' just sends subscription, and A sent one, 
        // B might see "Accept" button.
        // Let's check for "Accept" button in chat with A.
        const chatWindowB = await appPage.openChatWith(userAJid); // or selectChatWithContact if visible
        try {
            if (await chatWindowB.hasAddLink() || await chatWindowB.hasLinkWithUrl('')) {
                // Accept if possible, but for now we assume they can chat.
            }
        } catch (e) { }

        const msg = `Offline Catchup ${Date.now()}`;
        await chatWindowB.write(msg);
        await chatWindowB.assertLastMessage(msg, 'outgoing');
        await appPage.page.waitForTimeout(2000); // Wait for send
        await appPage.logOut();

        // 4. Login A -> Verify
        await appPage.logIn(userA, 'password');

        const chatWindowA = await appPage.selectChatWithContact(userB);

        // Verify Message
        await expect(async () => {
            const count = await chatWindowA.getMessageCount();
            expect(count).toBeGreaterThan(0);
        }).toPass({ timeout: 15000 });

        await chatWindowA.assertLastMessage(msg, 'incoming');
    });
});
