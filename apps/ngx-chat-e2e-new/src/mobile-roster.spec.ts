// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, expect } from '@playwright/test';
import { AppPage } from './page-objects/app.po';
import {
    devXmppDomain,
    devXmppJid,
    devXmppPassword,
} from '../secrets';
import { generateUser } from './utils/user-helper';
import { EjabberdAdminPage } from './page-objects/ejabberd-admin.po';

test.describe('Mobile/Separate Roster Logic', () => {
    let appPage: AppPage;
    let ejabberdAdminPage: EjabberdAdminPage;
    let mobileUser: string;
    let contact1: string;
    const password = 'password';

    test.beforeAll(async ({ browser, playwright }) => {
        appPage = await AppPage.create(browser);
        ejabberdAdminPage = await EjabberdAdminPage.create(
            playwright,
            devXmppDomain,
            devXmppJid,
            devXmppPassword
        );
        mobileUser = generateUser('mobileuser');
        contact1 = generateUser('contact1');

        // Register user and contact
        await ejabberdAdminPage.register(mobileUser, password);
        await ejabberdAdminPage.register(contact1, password);
    });

    /**
     * The user asked to find "that logic" - meaning the separate roster list 
     * which opens a chatbox full screen (flexible usage).
     * This test verifies that we can open a chat using the separate buttons 
     * found in index.component.html (mimicking a custom roster), 
     * receiving the message in the embedded ngx-chat-history component.
     */
    test('should open chat via separate roster list (mobile mode)', async ({ browser }) => {
        // Login contact1 in a separate context to ensure they are online and we receive an echo/carbon
        const contact1Context = await browser.newContext();
        const contact1Page = await AppPage.create(contact1Context);
        await contact1Page.setupForTest();
        await contact1Page.logIn(contact1, password);
        // We don't need to do anything with contact1, just having them online is enough.

        console.log('Navigating to app...');
        await appPage.setupForTest(); // goto /
        console.log('Logging in as', mobileUser);
        console.log('Logging in as', mobileUser);
        await appPage.page.setViewportSize({ width: 375, height: 812 });
        await appPage.logIn(mobileUser, password);
        await appPage.page.evaluate(() => (window as any).app.showWidget = false);

        // Add contact to ensure they appear in the separate list
        await appPage.addContact(contact1 + '@' + devXmppDomain);
        // Standard roster is hidden in this test mode to prevent overlay, so we skip checking it.


        // Wait for connection state to be online
        await expect(appPage.page.locator('[data-zid="chat-connection-state"]')).toContainText('online');

        // Assert "Contacts chat" header is visible (meaning *ngIf passed)
        await expect(appPage.page.locator('h1', { hasText: 'Contacts chat' })).toBeVisible();

        // Find the "separate roster list" button.
        // It should contain the contact name/JID.
        // Note: index.component.html uses {{ contact.name }} which might be JID if name is missing.
        console.log('Waiting for contact button...');
        const separateRosterButton = appPage.page.locator('button', { hasText: contact1 }).first();
        await expect(separateRosterButton).toBeVisible();

        // Click to open "full screen" (embedded) chat
        await separateRosterButton.click();


        // Verify the embedded chat history appears
        // <ngx-chat-history [recipient]="selectedContact"> ...
        // We need a locator for something specific to ngx-chat-history or the wrapper.
        // ngx-chat-file-drop is the wrapper in index.component.html
        const embeddedChat = appPage.page.locator('ngx-chat-file-drop');
        await expect(embeddedChat).toBeVisible();

        // Verify we can send a message via this embedded view
        // The input is ngx-chat-window-input
        const input = embeddedChat.locator('textarea');
        await expect(input).toBeVisible();

        await input.fill('Hello from mobile mode');
        await input.press('Enter');

        // Assert message appears in history
        await expect(embeddedChat.locator('ngx-chat-message-text-area', { hasText: 'Hello from mobile mode' })).toBeVisible({ timeout: 15000 });


    });

    test.afterAll(async () => {
        await appPage.page.goto('about:blank').catch(() => { });
    });
});
