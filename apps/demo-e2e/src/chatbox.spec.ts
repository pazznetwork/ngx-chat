// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from '@playwright/test';
import { AppPage } from './page-objects/app.po';
import { EjabberdAdminPage } from './page-objects/ejabberd-admin.po';
import {
  devXmppDomain,
  devXmppJid,
  devXmppPassword,
} from '../../../libs/ngx-xmpp/src/.secrets-const';

const fooUser = 'foouser';
const barUser = 'baruser';
const testPassword = 'somepassword';
const fooUserJid = fooUser + 'local-jabber.entenhausen.pazz.de';
const barUserJid = barUser + 'local-jabber.entenhausen.pazz.de';

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
    await appPage.setupForTest();
  });

  test('should be able to submit message with enter key and button', async () => {
    await appPage.logIn(fooUser, testPassword);
    await appPage.addContact(barUserJid);
    await appPage.addContact(fooUserJid);

    const buttonSubmitMessage = 'message submitted with button';
    const enterKeySubmitMessage = 'message submitted with enter key';

    const chatWindow = await appPage.selectChatWithContact(barUserJid);
    await chatWindow.open();

    await chatWindow.write(buttonSubmitMessage, 'button');
    await chatWindow.assertLastMessage(buttonSubmitMessage, 'outgoing');

    await chatWindow.write(enterKeySubmitMessage, 'enter');
    await chatWindow.assertLastMessage(enterKeySubmitMessage, 'outgoing');

    await appPage.logOut();
  });
});
