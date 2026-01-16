import { test, expect } from '@playwright/test';
import { AppPage } from './page-objects/app.po';
import { EjabberdAdminPage } from './page-objects/ejabberd-admin.po';
import {
    devXmppDomain,
    devXmppJid,
    devXmppPassword,
} from '../secrets';
import { generateUser } from './utils/user-helper';

test.describe('Message Status', () => {
    let alice: string;
    let bob: string;

    let ejabberdAdminPage: EjabberdAdminPage;

    test.beforeEach(async ({ playwright }) => {
        alice = generateUser('alice');
        bob = generateUser('bob');

        // Register users
        ejabberdAdminPage = await EjabberdAdminPage.create(
            playwright,
            devXmppDomain,
            devXmppJid,
            devXmppPassword
        );
        // Reuse admin logic (admin page might need its own page object instantiation if static create doesn't attach to page)
        // The existing static create returns an instance.
        // We can use it.
        await ejabberdAdminPage.register(alice, 'test');
        await ejabberdAdminPage.register(bob, 'test');
    });

    test('should show sent, received and seen status indicators', async ({ browser }) => {
        // 1. Setup Alice
        const aliceContext = await browser.newContext();
        const aliceApp = await AppPage.create(aliceContext);
        await aliceApp.setupForTest();
        await aliceApp.logIn(alice, 'test');
        await expect(aliceApp.page.locator('[data-zid="chat-connection-state"]')).toHaveText('online');

        // 2. Setup Bob
        const bobContext = await browser.newContext();
        const bobApp = await AppPage.create(bobContext);
        await bobApp.setupForTest();
        await bobApp.logIn(bob, 'test');
        await expect(bobApp.page.locator('[data-zid="chat-connection-state"]')).toHaveText('online');

        // 3. Alice opens chat with Bob
        const aliceChatWindow = await aliceApp.openChatWithUnaffiliatedContact(bob);
        await aliceChatWindow.open();

        // 4. Bob opens chat with Alice (so he is online and ready to receive)
        const bobChatWindow = await bobApp.openChatWithUnaffiliatedContact(alice);
        await bobChatWindow.open();

        // 5. Alice sends message
        // Ensure Bob's window is fully ready to avoid race conditions with delivery receipts
        await bobChatWindow.waitForVisible();
        await bobApp.page.waitForTimeout(1000);

        const msg = 'Status Test Message';
        await aliceChatWindow.write(msg);

        // 6. Check "Sent" status (✓) on Alice's side
        const lastMessage = aliceChatWindow.getOutMessages().filter({ hasText: msg }).last();
        // SENT = ✓
        await expect(lastMessage.locator('ngx-chat-message-state-icon')).toContainText('✓', { timeout: 20000 });

        // 7. Check "Received" status (✓✓)
        // Bob is online, so he should receive it.
        const bobLastMessage = bobChatWindow.getInMessages().filter({ hasText: msg }).last();
        await expect(bobLastMessage).toBeVisible();

        // Alice should see ✓✓ (Delivered)
        // Wait for it robustly
        await expect(async () => {
            await expect(lastMessage.locator('ngx-chat-message-state-icon')).toContainText('✓✓');
        }).toPass({ timeout: 60000 });

        // 8. Check "Seen" status (colored ✓✓)
        // Bob needs to focus/interact. 
        // Force click on Bob's side to ensure "read" trigger
        await bobLastMessage.click();

        await expect(async () => {
            await expect(lastMessage.locator('ngx-chat-message-state-icon .state--seen')).toBeVisible();
        }).toPass({ timeout: 20000 });

        await aliceContext.close();
        await bobContext.close();
    });
});
