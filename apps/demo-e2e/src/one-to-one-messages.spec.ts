// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from '@playwright/test';
import { AppPage } from './page-objects/app.po';
import {
  devXmppDomain,
  devXmppJid,
  devXmppPassword,
} from '../../../libs/ngx-xmpp/src/.secrets-const';
import { EjabberdAdminPage } from './page-objects/ejabberd-admin.po';

const alice = 'alice' + '@' + devXmppDomain;
const bob = 'bob' + '@' + devXmppDomain;
const tim = 'tim' + '@' + devXmppDomain;
const testPassword = 'somepassword';

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
    await appPage.register(alice, testPassword);
    await appPage.register(bob, testPassword);
    await appPage.register(tim, testPassword);
    await appPage.reload();
  });

  test.afterAll(() => ejabberdAdminPage.requestDeleteAllUsersBesidesAdmin());

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
    await appPage.reload();
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
    await appPage.reload();
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
    await appPage.reload();
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

  test('should be able to add contact after receiving message without contact request', async ({
    browser,
  }) => {
    await appPage.reload();
    const context = await browser.newContext();
    const bobPage = await context.newPage();
    await bobPage.goto('https://local.entenhausen.pazz.de:4200/');
    const bobAppPo = new AppPage(bobPage);
    await bobAppPo.setupForTest();
    const aliceAppPo = appPage;

    await aliceAppPo.logIn(alice, testPassword);
    await bobAppPo.logIn(bob, testPassword);

    const aliceChatWindowWithBob = await aliceAppPo.selectChatWithContact(bob);
    await aliceChatWindowWithBob.open();
    await aliceChatWindowWithBob.write('please open');

    const bobChatWindowWithAlice = bobAppPo.getChatWindow(alice);
    await bobChatWindowWithAlice.add();
    test.expect(await bobAppPo.isContactInRoster(alice)).toBeTruthy();
    await bobAppPo.logOut();

    await bobAppPo.logIn(bob, testPassword);
    test.expect(await bobAppPo.isContactInRoster(alice)).toBeTruthy();
    await bobAppPo.logOut();
  });

  test('should be able to block contact after receiving message without contact request', async ({
    browser,
  }) => {
    await appPage.reload();
    const context = await browser.newContext();
    const bobPage = await context.newPage();
    await bobPage.goto('https://local.entenhausen.pazz.de:4200/');
    const bobAppPo = new AppPage(bobPage);
    await bobAppPo.setupForTest();
    const aliceAppPo = appPage;

    await aliceAppPo.logIn(alice, testPassword);
    await bobAppPo.logIn(bob, testPassword);

    const aliceChatWindowWithBob = await aliceAppPo.selectChatWithContact(bob);
    await aliceChatWindowWithBob.open();
    await aliceChatWindowWithBob.write('please open');

    const bobChatWindowWithAlice = bobAppPo.getChatWindow(alice);
    await bobChatWindowWithAlice.block();
    test.expect(await bobAppPo.isContactNotInRoster(alice)).toBeTruthy();
  });
});
