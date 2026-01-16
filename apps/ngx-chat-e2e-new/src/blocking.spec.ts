// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from '@playwright/test';
import { AppPage } from './page-objects/app.po';
import { generateUser } from './utils/user-helper';

import { EjabberdAdminPage } from './page-objects/ejabberd-admin.po';
import {
  devXmppDomain,
  devXmppJid,
  devXmppPassword,
} from '../secrets';

test.describe('ngx-chat', () => {
  let ass = '';
  let duty = '';

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

    // Dynamic users per test to avoid state pollution
    ass = generateUser('arsch');
    duty = generateUser('dienst');

    await appPage.setupForTest();
    await ejabberdAdminPage.register(ass, ass);
    await ejabberdAdminPage.register(duty, duty);
  });

  test.afterEach(async () => {
    await appPage.page.goto('about:blank').catch(() => { });
  });

  test('should be able to block the ass as duty', async () => {
    await appPage.logIn(ass, ass);
    const chat = await appPage.openChatWithUnaffiliatedContact(duty);
    await chat.write('I fart in your general direction');
    await appPage.logOut();
    await appPage.page.waitForTimeout(1000);

    await appPage.logIn(duty, duty);
    await expect(async () => {
      expect(await appPage.isContactInRoster(ass)).toBeTruthy();
    }).toPass({ timeout: 10000 });
    await appPage.openChatWith(ass);

    await appPage.blockContact(ass);
    await expect(async () => {
      expect(await appPage.isContactInBlockedList(ass)).toBeTruthy();
    }).toPass({ timeout: 10000 });
    expect(await appPage.isContactInUnaffiliatedList(ass)).toBeFalsy();
    await appPage.logOut();
    await appPage.page.waitForTimeout(1000);
  });

  test('should no longer be able to write as ass to duty', async () => {
    // Setup: Duty must block Ass first (since we have fresh users)
    await appPage.logIn(duty, duty);
    const setupChat = await appPage.openChatWithUnaffiliatedContact(ass);
    await setupChat.write('You are going to be blocked.');
    await appPage.blockContact(ass);

    // Verify block is committed before logging out
    await expect(async () => {
      expect(await appPage.isContactInBlockedList(ass)).toBeTruthy();
    }).toPass({ timeout: 10000 });
    // Small wait for server propagation
    await appPage.page.waitForTimeout(1000);
    await appPage.logOut();
    await appPage.page.waitForTimeout(1000);

    const message = 'FART!';
    await appPage.logIn(ass, ass);
    const chat = await appPage.openChatWith(duty);
    await chat.write(message);
    await appPage.logOut();
    await appPage.page.waitForTimeout(1000);

    await appPage.logIn(duty, duty);
    await expect(async () => {
      expect(await appPage.isContactInBlockedList(ass)).toBeTruthy();
    }).toPass({ timeout: 10000 });
    expect(await appPage.isContactInUnaffiliatedList(ass)).toBeFalsy();

    const window = await appPage.openChatWith(ass);

    await expect(window.getInMessages().filter({ hasText: message })).toHaveCount(0);
    await appPage.logOut();
    await appPage.page.waitForTimeout(1000);
  });

  test('should be able to unblock the ass as duty', async () => {
    // Setup: Duty must block Ass first
    await appPage.logIn(duty, duty);
    await appPage.openChatWithUnaffiliatedContact(ass);
    await appPage.blockContact(ass);
    // Verify block is committed
    await expect(async () => {
      expect(await appPage.isContactInBlockedList(ass)).toBeTruthy();
    }).toPass({ timeout: 10000 });

    // Now verify unblock
    await appPage.unblockContact(ass);

    // Verify removed from blocked list
    await expect(async () => {
      expect(await appPage.isContactInBlockedList(ass)).toBeFalsy();
    }).toPass({ timeout: 10000 });

    // Wait for server propagation of unblock stanza before logging out
    await appPage.page.waitForTimeout(10000);

    await appPage.logOut();
    await appPage.page.waitForTimeout(1000);

    // As proof of unblocking, Ass sends a message and Duty should receive it
    const msg = 'I am back!';
    await appPage.logIn(ass, ass);
    const chat = await appPage.openChatWith(duty);
    await chat.write(msg);
    await appPage.logOut();
    await appPage.page.waitForTimeout(1000);

    await appPage.logIn(duty, duty);
    const dutyChat = await appPage.openChatWith(ass);

    await expect(dutyChat.getInMessages().filter({ hasText: msg })).toBeVisible({ timeout: 10000 });
    await appPage.logOut();
    await appPage.page.waitForTimeout(1000);
  });

  test('should keep unblocked contacts as such', async () => {
    // Setup: Block then Unblock
    await appPage.logIn(duty, duty);
    await appPage.openChatWithUnaffiliatedContact(ass);
    await appPage.blockContact(ass);
    // Verify block is committed
    await expect(async () => {
      expect(await appPage.isContactInBlockedList(ass)).toBeTruthy();
    }).toPass({ timeout: 10000 });

    await appPage.unblockContact(ass);
    await appPage.logOut();
    await appPage.page.waitForTimeout(1000);

    // Verify persistence after relogin
    await appPage.logIn(duty, duty);
    expect(await appPage.isContactInBlockedList(ass)).toBeFalsy();
    await appPage.logOut();
    await appPage.page.waitForTimeout(1000);
  });


});
