// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from '@playwright/test';
import { AppPage } from './page-objects/app.po';
import {
  devXmppDomain,
  devXmppJid,
  devXmppPassword,
} from '../../../libs/ngx-xmpp/src/.secrets-const';
import { EjabberdAdminPage } from './page-objects/ejabberd-admin.po';

const alice = 'alice';
const bob = 'bob';
const tim = 'tim';
const testPassword = 'test';

const messageToBobFromAlice = 'Good Morning Bob!';
const messageToContactFromAlice = 'Be a CONTACT!!!';

test.describe.serial('ngx-chat', () => {
  let appPage: AppPage;
  let ejabberdAdminPage: EjabberdAdminPage;

  test.beforeAll(async ({ browser, playwright }) => {
    appPage = new AppPage(await browser.newPage());
    ejabberdAdminPage = await EjabberdAdminPage.create(
      playwright,
      devXmppDomain,
      devXmppJid,
      devXmppPassword
    );
    await ejabberdAdminPage.requestDeleteAllUsersBesidesAdmin();

    await appPage.setupForTest();
    await ejabberdAdminPage.register(alice, testPassword);
    await ejabberdAdminPage.register(bob, testPassword);
    await ejabberdAdminPage.register(tim, testPassword);
  });

  test.afterAll(() => ejabberdAdminPage.requestDeleteAllUsersBesidesAdmin());

  test('should be able to block contact after receiving message without contact request', async () => {
    await appPage.logIn(alice, testPassword);

    const aliceChatWindowWithBob = await appPage.openChatWithUnaffiliatedContact(bob);
    await aliceChatWindowWithBob.open();
    await aliceChatWindowWithBob.write('please open');
    await appPage.logOut();

    await appPage.logIn(bob, testPassword);
    const bobChatWindowWithAlice = await appPage.openChatWith(alice); // flaky if we assume that the chat window is already open
    await bobChatWindowWithAlice.block();
    test.expect(await appPage.isUnaffiliatedListHidden()).toBeTruthy();
    test.expect(await appPage.isBlockedListVisible()).toBeTruthy();
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
    const bobChatWindowWithAlice = await appPage.openChatWith(alice); // flaky if we assume that the chat window is already open
    test.expect(await bobChatWindowWithAlice.blockOrAddMessageIsVisible()).toBeTruthy();
    await bobChatWindowWithAlice.addContact();
    await bobChatWindowWithAlice.blockOrAddMessageWaitForHidden();
    test.expect(await appPage.isContactInRoster(alice)).toBeTruthy();
    await appPage.logOut();

    await appPage.logIn(bob, testPassword);
    test.expect(await appPage.isContactInRoster(alice)).toBeTruthy();
    await appPage.logOut();
  });

  test('alice should be able to write to bob and bob should receive the message', async () => {
    await appPage.logIn(alice, testPassword);
    await appPage.addContact(bob);
    let chatWindow = await appPage.selectChatWithContact(bob);
    await chatWindow.open();
    await chatWindow.write(messageToBobFromAlice);
    await appPage.logOut();

    await appPage.logIn(bob, testPassword);
    chatWindow = await appPage.selectChatWithContact(alice);
    await chatWindow.open();
    await chatWindow.assertLastMessage(messageToBobFromAlice, 'incoming');
    await appPage.logOut();
  });

  test('alice should be able to write to tim and tim should receive the message after adding alice as contact', async () => {
    await appPage.logIn(alice, testPassword);
    await appPage.addContact(tim);
    let chatWindow = await appPage.selectChatWithContact(tim);
    await chatWindow.open();
    await chatWindow.write(messageToContactFromAlice);
    await appPage.logOut();

    await appPage.logIn(tim, testPassword);
    await appPage.addContact(alice);
    chatWindow = await appPage.selectChatWithContact(alice);
    await chatWindow.open();
    await chatWindow.assertLastMessage(messageToContactFromAlice, 'incoming');
    await appPage.logOut();
  });

  test('alice should be able to write to tim and tim should receive the message even without adding alice as contact', async () => {
    await appPage.logIn(alice, testPassword);
    await appPage.addContact(tim);
    let chatWindow = await appPage.selectChatWithContact(tim);
    await chatWindow.open();
    await chatWindow.write(messageToContactFromAlice);
    await appPage.logOut();

    await appPage.logIn(tim, testPassword);
    chatWindow = await appPage.selectChatWithContact(alice);
    await chatWindow.open();
    await chatWindow.assertLastMessage(messageToContactFromAlice, 'incoming');
    await appPage.logOut();
  });

  test('should open message component on message received', async ({ browser }) => {
    const context = await browser.newContext();
    const bobPage = await context.newPage();
    await bobPage.goto('https://local.entenhausen.pazz.de:4200/');
    const bobAppPo = new AppPage(bobPage);
    await bobAppPo.setupForTest();
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
