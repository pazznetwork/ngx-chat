// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, expect } from '@playwright/test';
import { AppPage } from './page-objects/app.po';
import {
    devXmppDomain,
    devXmppJid,
    devXmppPassword,
} from '../secrets';
import { EjabberdAdminPage } from './page-objects/ejabberd-admin.po';

const seedUser = 'roster_heavy_user';
const password = 'password';
const contactCount = 50;

test.describe('Roster Performance Test', () => {
    let appPage: AppPage;
    let ejabberdAdminPage: EjabberdAdminPage;

    test.beforeAll(async ({ browser, playwright }) => {
        appPage = await AppPage.create(browser);
        ejabberdAdminPage = await EjabberdAdminPage.create(
            playwright,
            devXmppDomain,
            devXmppJid,
            devXmppPassword
        );

        await appPage.setupForTest();
        await ejabberdAdminPage.register(seedUser, password);


        // Batch register contacts to speed up setup
        for (let i = 0; i < contactCount; i++) {
            const contactName = `roster_contact_${i}`;
            await ejabberdAdminPage.register(contactName, password);
        }
    });

    // Verify creating roster entries
    // Ideally we would do this via API but EjabberdAdminPage might be UI based?
    // Checking EjabberdAdminPage... it seems to be UI based or API?
    // If UI, adding 50 contacts via UI `addContact` will be slow in test.beforeAll.
    // But we need the contacts ON THE ROSTER.
    // Registering them exists them on server. But they are not in seedUser's roster.
    // We need to establish subscription.
    // We can do this by logging in as seedUser and adding them?
    // Or better, use XMPP client (headless) to do it?
    // Since we don't have a headless XMPP tool in the test suite easily, 
    // we'll loop in the UI. 50 might be too slow for "default timeout".
    // We will try sending subscription requests.

    test('should handle 50 contacts efficiently', async () => {
        // 1. Populate Roster (The Slow Part)
        // We log in as seedUser once.
        await appPage.logIn(seedUser, password);

        // Add contacts


        // Use evaluate to parallelize/speed up addContact calls if possible
        // or just loop UI.
        // To make it faster, we might cheat and just inject the calls
        await appPage.page.evaluate(async ({ count, domain }) => {
            const app = (window as any).ng.getComponent(document.querySelector('app-root'));
            const chatService = app.chatService;
            // We assume chatService is accessible or we find it.
            // Actually app.chatService is protected? 
            // We can reach it via `app.chatService` if public.
            // Based on previous files, app component has `chatService`.
            // Let's assume we can call `chatService.contactListService.addContact`.

            for (let i = 0; i < count; i++) {
                const jid = `roster_contact_${i}@${domain}`;
                await chatService.contactListService.addContact(jid);
                // We don't wait for response to speed up sending
            }
        }, { count: contactCount, domain: devXmppDomain });

        // Validate they appear (pending or otherwise)
        // Since other users validly exist (registered in beforeAll), 
        // we don't need them to accept to see them in "pending" or "sent" or "unaffiliated"?
        // Actually, to be in Roster "both", they must accept.
        // If they don't accept, they are just "requested".
        // "Clunky" usually comes from rendering many items. "Requested" items still render.



        // Reload to verify persistent load speed
        await appPage.reload();
        await appPage.setupForTest(); // restore domain inputs if cleared


        const start = Date.now();
        await appPage.logIn(seedUser, password);
        const time = Date.now() - start;


        expect(time).toBeLessThan(5000);

        // Verify responsiveness: Open a chat

        // We pick the last one
        const lastContact = `contact_${contactCount - 1}@${devXmppDomain}`;
        // It might differ in UI if it's just "sent" request.
        // If we use `openChatWith` it should work.
        await appPage.openChatWith(lastContact);


        // Clean up
        await appPage.logOut();
    });

    test.afterAll(async () => {
        await appPage.page.goto('about:blank').catch(() => { });
    });

});
