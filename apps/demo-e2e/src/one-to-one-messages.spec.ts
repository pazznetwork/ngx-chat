// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from '@playwright/test';
import { AppPage } from './page-objects/app.po';
import { devXmppDomain } from '../../../libs/ngx-xmpp/src/.secrets-const';

const fooUser = 'foouser';
const barUser = 'baruser';
const testPassword = 'somepassword';
const fooUserJid = fooUser + devXmppDomain;
const barUserJid = barUser + devXmppDomain;

test.describe('ngx-chat', () => {
  let appPage: AppPage;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    appPage = new AppPage(page);

    await appPage.register(fooUser, testPassword);
    await appPage.addContact(barUserJid);
    await appPage.register(barUser, testPassword);
    await appPage.addContact(fooUserJid);
    await appPage.logOut();
  });

  test('connected user1Jid and user2Jid should be able to write and receive their messages', async () => {
    const messageFrom1To2 = 'hello mister 2';

    await appPage.logIn(fooUser, testPassword);
    let chatWindow = await appPage.selectChatWithContact(barUserJid);
    await chatWindow.open();
    await chatWindow.write(messageFrom1To2);
    await appPage.logOut();

    await appPage.logIn(barUser, testPassword);
    chatWindow = await appPage.selectChatWithContact(fooUserJid);
    await chatWindow.open();
    await chatWindow.assertLastMessage(messageFrom1To2, 'incoming');
    await appPage.logOut();
  });

  test('should open message component on message received', async ({ browser }) => {
    const context = await browser.newContext();
    const user2Page = await context.newPage();
    const user2AppPo = new AppPage(user2Page);
    const user1AppPo = appPage;

    await user1AppPo.logIn(fooUser, testPassword);
    await user2AppPo.logIn(barUser, testPassword);

    const user2ChatWindow = await user1AppPo.selectChatWithContact(barUserJid);
    const user1ChatWindow = await user2AppPo.selectChatWithContact(fooUserJid);

    await user2ChatWindow.open();
    await user2ChatWindow.write('please open');
    await user1ChatWindow.assertIsOpen();
  });
});
