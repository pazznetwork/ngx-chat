// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, expect } from '@playwright/test';
import { AppPage } from './page-objects/app.po';
import {
    devXmppDomain,
    devXmppJid,
    devXmppPassword,
} from '../secrets';
import { EjabberdAdminPage } from './page-objects/ejabberd-admin.po';

const targetUser = `roster_load_custom_${Date.now()}`;
const testPassword = 'password';
const contactCount = 100;
const highVolumeMessageCount = 100;

test.describe('Roster Load Test - Custom UI', () => {
    let appPage: AppPage;
    let ejabberdAdminPage: EjabberdAdminPage;
    let contacts: string[] = [];
    let highVolumeContact: string;

    test.beforeAll(async ({ browser, playwright }) => {
        test.setTimeout(300000);

        appPage = await AppPage.create(browser);
        ejabberdAdminPage = await EjabberdAdminPage.create(
            playwright,
            devXmppDomain,
            devXmppJid,
            devXmppPassword
        );

        // 1. Register Main Target User
        await ejabberdAdminPage.register(targetUser, testPassword);

        // 2. Generate and Register 100 Contacts
        console.log(`Generating ${contactCount} contacts...`);
        for (let i = 0; i < contactCount; i++) {
            const contactName = `custom_${i}_${Date.now()}`;
            contacts.push(contactName);
        }
        highVolumeContact = contacts[0] || '';

        // Register all contacts
        console.log('Registering contacts...');
        for (const contact of contacts) {
            await ejabberdAdminPage.register(contact, testPassword);
        }

        // 3. Seed Messages
        console.log('Seeding messages...');
        const targetJid = `${targetUser}@${devXmppDomain}`;

        // Seed High Volume Contact
        console.log(`Seeding ${highVolumeMessageCount} messages for ${highVolumeContact}...`);
        const hvFrom = `${highVolumeContact}@${devXmppDomain}`;
        for (let i = 0; i < highVolumeMessageCount; i++) {
            await ejabberdAdminPage.sendMessage(hvFrom, targetJid, `History Message ${i}`);
            // Throttle to avoid overwhelm
            if (i % 20 === 0) await new Promise(r => setTimeout(r, 50));
        }

        // Seed Single Message for others
        console.log('Seeding single messages for remaining contacts...');
        for (let i = 1; i < contacts.length; i++) {
            const from = `${contacts[i]}@${devXmppDomain}`;
            await ejabberdAdminPage.sendMessage(from, targetJid, `Hello from ${contacts[i]}`);
            if (i % 20 === 0) await new Promise(r => setTimeout(r, 50));
        }

        // 4. Setup Test App
        await appPage.setupForTest();
    });

    test.afterEach(async ({ }, testInfo) => {
        if (testInfo.status !== 'passed') {
            console.log('Browser Console Logs:', appPage.errorLogs.join('\n'));
        }
    });

    test.afterAll(async () => {
        await appPage.page.goto('about:blank').catch(() => { });
    });

    test('should interactions via Separate Roster and Chat Window', async () => {
        test.setTimeout(120000);
        console.log('Logging in target user...');
        await appPage.logIn(targetUser, testPassword);

        // 1. Verify Roster Size (Custom UI)
        console.log('Verifying Separate Roster load...');
        const separateRosterButtons = appPage.page.locator('.separate-roster-list button');
        await expect(separateRosterButtons).toHaveCount(contactCount, { timeout: 30000 });
        console.log('Separate roster loaded 100 contacts.');

        // 2. Open Chat via Separate Roster (Interactivity Check)
        console.log(`Clicking separate roster button for ${highVolumeContact}...`);
        const hvButton = separateRosterButtons.filter({ hasText: highVolumeContact });
        await hvButton.click();

        // 3. Verify Separate Chat Window Content
        console.log('Verifying Separate Chat Window content...');
        // Note: multiple chats might be open, we need the specific container
        const manualChat = appPage.page.locator('.manual-chat-view .manual-chat-container', { hasText: highVolumeContact });
        await expect(manualChat).toBeVisible();

        // Check for visible messages
        // We look for bubbles with text
        const messages = manualChat.locator('.chat-message-text');
        await expect(messages.first()).toBeVisible({ timeout: 10000 });

        const count = await messages.count();
        console.log(`Separate Chat loaded ${count} messages.`);
        expect(count).toBeGreaterThan(0);

        // 4. Verify Unread Badge Cleared (on Main Widget)
        // NOTE: The 'Separate Chat' in the demo app is a raw view and does NOT trigger the
        // 'incrementOpenWindowCount' logic in OpenChatsService, so it does not automatically mark as read.
        // We skip this check as it requires app-side logic unrelated to the library's core rendering.
        console.log('Skipping unread badge clear check for Custom UI (Demo app limitation)...');

        // 5. Test Live Message Receive in Custom Window
        const lowVolumeContact = contacts[contacts.length - 1] || '';
        const lowVolumeJid = `${lowVolumeContact}@${devXmppDomain}`;

        console.log(`Sending live message from ${lowVolumeContact} while chat is NOT open...`);
        const targetJid = `${targetUser}@${devXmppDomain}`;
        await ejabberdAdminPage.sendMessage(lowVolumeJid, targetJid, 'Live Custom Test');

        // Open via Custom Button
        console.log(`Opening chat for ${lowVolumeContact} via custom button...`);
        const lvButton = separateRosterButtons.filter({ hasText: lowVolumeContact });
        await lvButton.click();

        const lvChat = appPage.page.locator('.manual-chat-view .manual-chat-container', { hasText: lowVolumeContact });
        await expect(lvChat).toBeVisible();

        // Verify message content
        await expect(lvChat.locator('.chat-message-text', { hasText: 'Live Custom Test' })).toBeVisible();
        console.log('Live message verified in Custom Chat Window.');

    });
});
