// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from '@playwright/test';
import { AppPage } from './page-objects/app.po';
import {
    devXmppDomain,
    devXmppJid,
    devXmppPassword,
} from '../secrets';
import { EjabberdAdminPage } from './page-objects/ejabberd-admin.po';
import { generateUser } from './utils/user-helper';

const testPassword = 'test';

test.describe('Unread Badge Verification', () => {
    let alice = '';
    let bob = '';
    let appPage: AppPage;
    let ejabberdAdminPage: EjabberdAdminPage;

    test.beforeAll(async ({ browser, playwright }) => {
        alice = generateUser('alice');
        bob = generateUser('bob');

        appPage = await AppPage.create(browser);
        ejabberdAdminPage = await EjabberdAdminPage.create(
            playwright,
            devXmppDomain,
            devXmppJid,
            devXmppPassword
        );

        await appPage.setupForTest();
        await ejabberdAdminPage.register(alice, testPassword);
        await ejabberdAdminPage.register(bob, testPassword);
    });

    test.afterAll(async () => {
        await appPage.page.goto('about:blank').catch(() => { });
    });

    test('should show correct unread badge count when receiving, reading, and receiving new messages', async () => {
        // 1. Login Alice
        await appPage.logIn(alice, testPassword);

        // 2. Add Bob as contact (Mutual roster)
        // Note: For badge reliability, we ensure they are in the roster.
        await appPage.addContact(bob);

        // We need Bob to accept/add Alice to be fully mutual? 
        // Or unread works for Unaffiliated too (as verified by my previous log analysis).
        // But let's keep it simple. Alice adds Bob. Bob is in Alice's roster (pending or not).

        // 3. Bob sends a message to Alice

        const msg1 = `Message 1 ${Date.now()}`;
        await ejabberdAdminPage.sendMessage(`${bob}@${devXmppDomain}`, `${alice}@${devXmppDomain}`, msg1);

        // 4. Verify Badge = 1

        await expect(async () => {
            const count = await appPage.getUnreadCount(bob);
            expect(count).toBe(1);
        }).toPass({ timeout: 10000 });

        // 5. Alice opens chat (Reads message)

        let chatWindow = await appPage.selectChatWithContact(bob);
        await chatWindow.open();
        await chatWindow.waitForMessageCount(1);

        // Use more robust interaction to trigger "read" status
        await chatWindow.write('', 'enter');

        // Wait for unread status to clear
        await expect(async () => {
            const count = await appPage.getUnreadCount(bob);
            expect(count).toBe(0);
        }).toPass({ timeout: 15000 });

        // 6. Close chat? Or keep open?
        // If kept open, new messages are read immediately if window is focused?
        // Let's close it to ensure new message increments badge.
        await chatWindow.close();

        // 7. Bob sends Message 2

        const msg2 = `Message 2 ${Date.now()}`;
        await ejabberdAdminPage.sendMessage(`${bob}@${devXmppDomain}`, `${alice}@${devXmppDomain}`, msg2);

        // 8. Verify Badge = 1

        await expect(async () => {
            const count = await appPage.getUnreadCount(bob);
            expect(count).toBe(1);
        }).toPass({ timeout: 10000 });

        // Optional: Bob sends Message 3 -> Badge = 2

        const msg3 = `Message 3 ${Date.now()}`;
        await ejabberdAdminPage.sendMessage(`${bob}@${devXmppDomain}`, `${alice}@${devXmppDomain}`, msg3);

        await expect(async () => {
            const count = await appPage.getUnreadCount(bob);
            expect(count).toBe(2);
        }).toPass({ timeout: 5000 });

        // Cleanup
        await appPage.logOut();
    });
});
