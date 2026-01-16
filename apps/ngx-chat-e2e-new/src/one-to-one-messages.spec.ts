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



test.describe('ngx-chat', () => {
  let alice = '';
  let bob = '';
  let tim = '';

  let appPage: AppPage;
  let ejabberdAdminPage: EjabberdAdminPage;

  test.beforeEach(async ({ browser, playwright }) => {
    // Generate fresh users for each test to avoid state pollution (e.g. blocking persisting)
    alice = generateUser('alice');
    bob = generateUser('bob');
    tim = generateUser('tim');

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
    await ejabberdAdminPage.register(tim, testPassword);
  });

  test.afterEach(async () => {
    await appPage.page.goto('about:blank').catch(() => { });
  });

  test('should be able to block contact after receiving message without contact request', async () => {
    await appPage.logIn(alice, testPassword);

    const aliceChatWindowWithBob = await appPage.openChatWithUnaffiliatedContact(bob);
    await aliceChatWindowWithBob.open();
    await aliceChatWindowWithBob.write('please open');
    await appPage.logOut();

    await appPage.logIn(bob, testPassword);
    const bobChatWindowWithAlice = await appPage.openChatWith(alice);
    await bobChatWindowWithAlice.assertIsOpen();
    await bobChatWindowWithAlice.block();

    await expect(async () => {
      test.expect(await appPage.isContactInUnaffiliatedList(alice)).toBeFalsy();
      test.expect(await appPage.isContactInBlockedList(alice)).toBeTruthy();
    }).toPass({ timeout: 10000 });

    await appPage.logOut();
  });

  test('should be able to add contact after receiving message without contact request', async () => {
    await appPage.logIn(alice, testPassword);

    const aliceChatWindowWithBob = await appPage.openChatWithUnaffiliatedContact(bob);
    await aliceChatWindowWithBob.open();
    await aliceChatWindowWithBob.write('please open');
    await appPage.logOut();

    await appPage.setupForTest();
    await appPage.logIn(bob, testPassword);
    const bobChatWindowWithAlice = await appPage.openChatWith(alice);
    await bobChatWindowWithAlice.assertIsOpen();
    test.expect(await bobChatWindowWithAlice.blockOrAddMessageIsVisible()).toBeTruthy();
    await bobChatWindowWithAlice.addContact();
    await bobChatWindowWithAlice.blockOrAddMessageWaitForHidden();
    test.expect(await appPage.isContactInRoster(alice)).toBeTruthy();
    await appPage.logOut();

    await appPage.logIn(bob, testPassword);
    await expect(async () => {
      test.expect(await appPage.isContactInRoster(alice)).toBeTruthy();
    }).toPass({ timeout: 10000 });
    await appPage.logOut();
  });

  test('alice should be able to write to bob and bob should receive the message', async () => {
    const messageToBobFromAlice = `Good Morning Bob! ${Date.now()}`; // Unique per test
    await appPage.logIn(alice, testPassword);
    await appPage.addContact(bob);
    let chatWindow = await appPage.selectChatWithContact(bob);
    await chatWindow.open();
    await chatWindow.write(messageToBobFromAlice);
    // Wait for message to appear in Alice's view to ensure it was submitted before logout
    await expect(chatWindow.getOutMessages().filter({ hasText: messageToBobFromAlice })).toBeVisible({ timeout: 5000 });
    await appPage.logOut();

    await appPage.logIn(bob, testPassword);
    chatWindow = await appPage.selectChatWithContact(alice);
    // We wait for the specific unique message to become visible first.
    // This handles the race condition where older messages ("please open") are loaded first.
    const messages = chatWindow.getInMessages();
    await expect(messages.filter({ hasText: messageToBobFromAlice })).toBeVisible({ timeout: 30000 });

    // Once visible, we ensure it's the last one to verify correct ordering.
    await expect(messages.last()).toContainText(messageToBobFromAlice, { timeout: 10000 });

    await appPage.logOut();
  });

  test('alice should be able to write to tim and tim should receive the message after adding alice as contact', async () => {
    const messageToContactFromAlice = `Be a CONTACT!!! ${Date.now()}`; // Unique per test
    await appPage.logIn(alice, testPassword);
    await appPage.addContact(tim);
    let chatWindow = await appPage.selectChatWithContact(tim);
    await chatWindow.open();
    await chatWindow.write(messageToContactFromAlice);
    await appPage.logOut();

    await appPage.logIn(tim, testPassword);
    await appPage.addContact(alice);
    chatWindow = await appPage.selectChatWithContact(alice);

    // Stabilized assertion
    const messages = chatWindow.getInMessages();
    await expect(messages.filter({ hasText: messageToContactFromAlice })).toBeVisible({ timeout: 30000 });
    await expect(messages.last()).toContainText(messageToContactFromAlice, { timeout: 10000 });

    await appPage.logOut();
  });

  test('alice should be able to write to tim and tim should receive the message even without adding alice as contact', async () => {
    const messageToContactFromAlice = `Be a CONTACT!!! ${Date.now()}`; // Unique per test
    await appPage.logIn(alice, testPassword);
    await appPage.addContact(tim);
    let chatWindow = await appPage.selectChatWithContact(tim);
    await chatWindow.open();
    await chatWindow.write(messageToContactFromAlice);
    await appPage.logOut();

    await appPage.logIn(tim, testPassword);
    chatWindow = await appPage.selectChatWithContact(alice);

    // Stabilized assertion
    const messages = chatWindow.getInMessages();
    await expect(messages.filter({ hasText: messageToContactFromAlice })).toBeVisible({ timeout: 30000 });
    await expect(messages.last()).toContainText(messageToContactFromAlice, { timeout: 10000 });

    await appPage.logOut();
  });

  test('should open message component on message received', async () => {
    const bobAppPo = await appPage.newPage();
    const aliceAppPo = appPage;

    await aliceAppPo.logIn(alice, testPassword);
    await bobAppPo.logIn(bob, testPassword);

    await aliceAppPo.addContact(bob);
    const aliceChatWindowWithBob = await aliceAppPo.selectChatWithContact(bob);
    await bobAppPo.addContact(alice);

    await aliceChatWindowWithBob.open();
    await aliceChatWindowWithBob.write('please open bob');
    bobAppPo.getChatWindow(alice).assertIsOpen();
  });
});
