// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from '@playwright/test';
import { AppPage } from './page-objects/app.po';

import { EjabberdAdminPage } from './page-objects/ejabberd-admin.po';
import {
  devXmppDomain,
  devXmppJid,
  devXmppPassword,
} from '../../../libs/ngx-xmpp/src/.secrets-const';

test.describe.serial('ngx-chat', () => {
  const ass = 'arsch';
  const duty = 'dienst';

  let appPage: AppPage;
  let ejabberdAdminPage: EjabberdAdminPage;

  test.beforeAll(async ({ browser, playwright }) => {
    appPage = await AppPage.create(browser);
    ejabberdAdminPage = await EjabberdAdminPage.create(
      playwright,
      devXmppDomain,
      devXmppJid,
      devXmppPassword
    );
    await ejabberdAdminPage.requestDeleteAllUsersBesidesAdmin();

    await appPage.setupForTest();
    await ejabberdAdminPage.register(ass, ass);
    await ejabberdAdminPage.register(duty, duty);
  });

  test('should be able to block the ass as duty', async () => {
    await appPage.logIn(ass, ass);
    const chat = await appPage.openChatWithUnaffiliatedContact(duty);
    await chat.write('I fart in your general direction');
    await appPage.logOut();

    await appPage.logIn(duty, duty);
    expect(appPage.isContactInRoster(ass)).toBeTruthy();
    const snowWhiteChatWithEvilQueen = await appPage.openChatWith(ass);
    await snowWhiteChatWithEvilQueen.block();
    expect(await appPage.isBlockedListVisible()).toBeTruthy();
    expect(await appPage.isUnaffiliatedListHidden()).toBeTruthy();
    await appPage.logOut();
  });

  test('should no longer be able to write as ass to duty', async () => {
    const message = 'FART!';
    await appPage.logIn(ass, ass);
    const chat = await appPage.openChatWith(duty);
    await chat.write(message);
    await appPage.logOut();
    await appPage.logIn(duty, duty);
    expect(await appPage.isBlockedListVisible()).toBeTruthy();
    expect(await appPage.isUnaffiliatedListHidden()).toBeTruthy();
    const window = await appPage.openChatWith(ass);
    await window.assertLastMessageIsNot(message);
    await appPage.logOut();
  });

  test('should be able to unblock the ass as duty', async () => {
    await appPage.logIn(duty, duty);
    await appPage.unblockContact(ass);
    expect(await appPage.isBlockedListHidden()).toBeTruthy();
    expect(await appPage.isContactInRoster(ass)).toBeTruthy();
    await appPage.logOut();
  });

  test('should keep unblocked contacts as such', async () => {
    await appPage.logIn(duty, duty);
    expect(await appPage.isBlockedListHidden()).toBeTruthy();
    expect(await appPage.isContactInRoster(ass)).toBeTruthy();
    await appPage.logOut();
  });
});
