// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from '@playwright/test';
import { AppPage } from './page-objects/app.po';
import {
  devXmppDomain,
  devXmppJid,
  devXmppPassword,
} from '../../../libs/ngx-xmpp/src/.secrets-const';
import { EjabberdAdminPage } from './page-objects/ejabberd-admin.po';

const fooUser = 'foouser';
const barUser = 'baruser';
const testPassword = 'somepassword';
const fooUserJid = fooUser + devXmppDomain;
const barUserJid = barUser + devXmppDomain;

test.describe('ngx-chat', () => {
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

    await ejabberdAdminPage.register(fooUser, testPassword);
    await ejabberdAdminPage.register(barUser, testPassword);
  });

  test('connected user1Jid and user2Jid should be able to write and receive their messages', async () => {
    const messageFrom1To2 = 'hello mister 2';

    await appPage.logIn(fooUser, testPassword);
    await appPage.addContact(barUserJid);
    let chatWindow = await appPage.selectChatWithContact(barUserJid);
    await chatWindow.open();
    await chatWindow.write(messageFrom1To2);
    await appPage.logOut();

    await appPage.logIn(barUser, testPassword);
    await appPage.addContact(fooUserJid);
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
