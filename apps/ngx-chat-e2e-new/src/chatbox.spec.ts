// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, expect } from '@playwright/test';
import { AppPage } from './page-objects/app.po';
import { EjabberdAdminPage } from './page-objects/ejabberd-admin.po';
import { generateUser } from './utils/user-helper';
import {
  devXmppDomain,
  devXmppJid,
  devXmppPassword,
} from '../secrets';

let fooUser = 'foouser';
let barUser = 'baruser';
const testPassword = 'somepassword';
let barUserJid = barUser + '@' + devXmppDomain;

test.describe('ngx-chat', () => {
  let appPage: AppPage;
  let ejabberdAdminPage: EjabberdAdminPage;

  test.beforeEach(async ({ browser, playwright }) => {
    appPage = await AppPage.create(browser);
    ejabberdAdminPage = await EjabberdAdminPage.create(
      playwright,
      devXmppDomain,
      devXmppJid,
      devXmppPassword
    );

    // Dynamic users
    fooUser = generateUser('foouser');
    barUser = generateUser('baruser');
    barUserJid = barUser + '@' + devXmppDomain;

    await ejabberdAdminPage.register(fooUser, testPassword);
    await ejabberdAdminPage.register(barUser, testPassword);
    await appPage.setupForTest();
  });

  test.afterEach(async () => {
    await appPage.logOut().catch(() => { });
    await appPage.page.goto('about:blank').catch(() => { });
  });

  test('should be able to submit message with enter key and button', async () => {
    await appPage.logIn(fooUser, testPassword);
    await appPage.addContact(barUserJid);
    // await appPage.addContact(fooUserJid); // Adding self? Removed redundant call if not needed.

    const buttonSubmitMessage = 'message submitted with button';
    const enterKeySubmitMessage = 'message submitted with enter key';

    const chatWindow = await appPage.selectChatWithContact(barUserJid);
    await chatWindow.open();

    await chatWindow.write(buttonSubmitMessage, 'button');
    const buttonMsg = chatWindow.getOutMessages().filter({ hasText: buttonSubmitMessage });
    await buttonMsg.scrollIntoViewIfNeeded();
    await expect(buttonMsg).toBeVisible();

    await chatWindow.write(enterKeySubmitMessage, 'enter');
    const enterMsg = chatWindow.getOutMessages().filter({ hasText: enterKeySubmitMessage });
    await enterMsg.scrollIntoViewIfNeeded();
    await expect(enterMsg).toBeVisible();

    await appPage.logOut();
  });
});
