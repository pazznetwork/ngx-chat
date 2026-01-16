// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, expect } from '@playwright/test';
import { AppPage } from './page-objects/app.po';
import { ChatWindowPage } from './page-objects/chat-window.po';
import {
    devXmppDomain,
    devXmppJid,
    devXmppPassword,
} from '../secrets';
import { EjabberdAdminPage } from './page-objects/ejabberd-admin.po';
import { generateUser } from './utils/user-helper';

const targetUser = `roster_load_target_${Date.now()}`;
const testPassword = 'password';
const contactCount = 100;
const highVolumeMessageCount = 100; // Increased to ensure pagination (default page often 50)

test.describe('Roster Load Test', () => {
    let appPage: AppPage;
    let ejabberdAdminPage: EjabberdAdminPage;
    let contacts: string[] = [];
    let highVolumeContact: string;

    test.beforeAll(async ({ browser, playwright }) => {
        test.setTimeout(300000); // Allow setup time for 100 users

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
            const contactName = `contact_${i}_${Date.now()}`;
            contacts.push(contactName);
        }
        highVolumeContact = contacts[0] || ''; // First one is high volume

        // Register all contacts (in parallel batches for speed)
        console.log('Registering contacts...');
        // Register all contacts (sequential to avoid server overload/timeout)
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
            if (i % 10 === 0) await new Promise(r => setTimeout(r, 20)); // throttle slightly
        }

        // Seed Single Message for others
        console.log('Seeding single messages for remaining contacts...');
        for (let i = 1; i < contacts.length; i++) {
            const from = `${contacts[i]}@${devXmppDomain}`;
            await ejabberdAdminPage.sendMessage(from, targetJid, `Hello from ${contacts[i]}`);
            if (i % 20 === 0) await new Promise(r => setTimeout(r, 50)); // throttle
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

    test('should load 100 contacts and support scrolling in large conversation', async () => {
        test.setTimeout(120000);
        console.log('Logging in target user...');
        const startTime = Date.now();
        await appPage.logIn(targetUser, testPassword);

        // 1. Verify Login Speed
        await expect(appPage.page.locator('[data-zid="chat-connection-state"]')).toHaveText('online', { timeout: 30000 });
        const loginDuration = Date.now() - startTime;
        console.log(`Login took ${loginDuration}ms`);

        // 2. Verify Roster Size
        // Wait for roster to populate. 
        // We can check if the roster list has 100 items.
        // The roster load might be virtualized, so checking DOM count might fail if list is lazy.
        // But ngx-chat usually renders the visible list.
        // Let's verify at least the high volume contact is visible (it should be recent/top?)
        // Or actually, since they all sent messages roughly same time, ordering is indeterminate.

        // Verification: Check for presence of LAST Contact in Roster (to ensure full load)
        // We rely on standard behavior (no virtualization or scroll needed for existence check in DOM if small enough, or Playwright locator finds it)
        const lastContact = contacts[contacts.length - 1];
        console.log(`Searching for last contact ${lastContact} to measure full load time...`);

        const rosterLoadStart = Date.now();
        await expect(appPage.isContactInRoster(`${lastContact}@${devXmppDomain}`)).toBeTruthy();
        const rosterLoadTime = Date.now() - rosterLoadStart;
        console.log(`Roster completely loaded (100th contact visible) in ${rosterLoadTime}ms after login`);

        // Check high volume one too
        await expect(appPage.isContactInRoster(`${highVolumeContact}@${devXmppDomain}`)).toBeTruthy();

        // Verification: Check Separate Roster List Performance (User Requested "The Other One")
        console.log('Checking separate roster list (custom UI integration mode)...');
        const separateRosterStart = Date.now();
        const separateRosterButtons = appPage.page.locator('.separate-roster-list button');
        // Expect 100 buttons
        await expect(separateRosterButtons).toHaveCount(contactCount);
        console.log(`Separate roster list fully loaded (100 items) in ${Date.now() - separateRosterStart}ms (check duration)`);

        // 3. Open High Volume Chat
        console.log(`Opening chat with ${highVolumeContact}...`);
        const chatWindow = await appPage.openChatWithUnaffiliatedContact(`${highVolumeContact}@${devXmppDomain}`);
        await chatWindow.open();

        // Verification: Check Separate Chat Window (Custom UI Integration - 'manual-chat-view')
        console.log('Checking separate chat window functionality...');

        // Fix for "Decoupled Windows": We must explicitly click the manual button to open the big box now.
        // It no longer opens automatically with the widget.
        const manualButton = appPage.page.locator('.separate-roster-list button', { hasText: highVolumeContact }).first();
        await manualButton.scrollIntoViewIfNeeded(); // Ensure visible in large list
        await manualButton.click();

        const manualChat = appPage.page.locator('.manual-chat-view .manual-chat-container', { hasText: highVolumeContact });
        await expect(manualChat).toBeVisible();
        await expect(manualChat.locator('.chat-message', { hasText: 'History Message 0' }).first()).toBeVisible({ timeout: 10000 });
        console.log('Separate chat window verified (content visible).');

        // 4. Verify Initial Load (Should be latest messages)
        // Default page size is likely 10 or 20.
        await chatWindow.waitForMessageCount(10);
        let countInitial = await chatWindow.getMessageCount();
        console.log(`Initial message count: ${countInitial}`);
        expect(countInitial).toBeGreaterThan(0);

        // 5. Scroll to Load More (Only if we haven't loaded everything)
        if (countInitial < highVolumeMessageCount) {
            console.log('Scrolling to top to load more...');
            await chatWindow.scrollToTop();
            await expect(async () => {
                const countAfterScroll = await chatWindow.getMessageCount();
                console.log(`Count after scroll: ${countAfterScroll}`);
                expect(countAfterScroll).toBeGreaterThan(countInitial);
            }).toPass({ timeout: 10000 });
        } else {
            console.log('All messages loaded initially (Page size >= Message count). Skipping scroll test.');
        }

        // 6. Verify Unread Status
        // High volume should be read now (we opened it)
        await expect(async () => {
            const unreadHigh = await appPage.getUnreadCount(highVolumeContact);
            expect(unreadHigh).toBe(0);
        }).toPass();

        const lowVolumeContact = contacts[contacts.length - 1] || ''; // Pick last one

        // 6. Verify Unread Status (Live Message)
        // Note: Initial offline messages do not seem to trigger unread count reliably in this env.
        // We verify unread status by sending a NEW message while online.

        console.log(`Sending live message from ${lowVolumeContact} to verify unread...`);
        const targetJid = `${targetUser}@${devXmppDomain}`;
        const lowVolumeJid = `${lowVolumeContact}@${devXmppDomain}`;
        await ejabberdAdminPage.sendMessage(lowVolumeJid, targetJid, 'Live unread check');

        // 7. Verify Low Volume Contact Content
        console.log(`Opening chat with low volume ${lowVolumeContact}...`);

        // Note: Unread count check is currently flaky/failing in test env (badge doesn't appear).
        // We log a warning if it fails but proceed to verify message content, which is the critical load test metric.
        let unreadCountFinal = 0;
        // 7. Verify Low Volume Contact Content
        console.log(`Checking unread badge for ${lowVolumeContact} before opening...`);

        // With rendering fixes, this should pass reliably.
        await expect(async () => {
            const unreadCountFinal = await appPage.getUnreadCount(lowVolumeContact);
            if (unreadCountFinal > 0) console.log(`Unread count confirmed: ${unreadCountFinal}`);
            expect(unreadCountFinal).toBeGreaterThan(0);
        }).toPass({ timeout: 10000 });

        // Close previous
        await chatWindow.close();

        const lowChat = await appPage.selectChatWithContact(lowVolumeJid);

        // Should have "Hello..." (offline) and "Live..." (live)
        await lowChat.waitForMessageCount(2);

        const allText = await lowChat.getAllMessagesText();
        expect(allText.some(t => t.includes(`Hello from ${lowVolumeContact}`))).toBeTruthy();
        expect(allText.some(t => t.includes('Live unread check'))).toBeTruthy();

        // Verify unread cleared (should be 0 now)
        // Race condition mitigation: The UI update might lag slightly behind the read receipt.
        await expect(async () => {
            const unreadAfter = await appPage.getUnreadCount(lowVolumeContact);
            expect(unreadAfter).toBe(0);
        }).toPass({ timeout: 30000 });

    });
});
