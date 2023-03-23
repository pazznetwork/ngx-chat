// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from '@playwright/test';
import { AppPage } from './page-objects/app.po';

const fooUser = 'foouser';
const barUser = 'baruser';
const testPassword = 'somepassword';
const fooUserJid = fooUser + 'local-jabber.entenhausen.pazz.de';
const barUserJid = barUser + 'local-jabber.entenhausen.pazz.de';

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

  test('should be able to submit message with enter key and button', async () => {
    await appPage.logIn(fooUser, testPassword);

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

  // todo: also add test for text area clearing after successful sending of a message
});
