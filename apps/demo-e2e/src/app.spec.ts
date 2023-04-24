// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from '@playwright/test';
import { AppPage } from './page-objects/app.po';
import type { AuthRequest } from '@pazznetwork/ngx-chat-shared';
import {
  devXmppDomain,
  devXmppJid,
  devXmppPassword,
} from '../../../libs/ngx-xmpp/src/.secrets-const';
import { EjabberdAdminPage } from './page-objects/ejabberd-admin.po';

/**
 * Current features:
 *   * blocking of contacts
 *   * writing to users not in your contact list
 *   * messages are time stamped
 *   * file uploads, trough file select and drag and drop
 *   * message history (messages from past sessions are available)
 *   * message history on multiple devices stays the same
 *   * message state, (send, received, read)
 *   * chat rooms
 *   * chat room message notification
 *   * you are currently offline notification
 *   * push message notification
 *   * registration without admin
 *   * contact list - add / remove
 *   * unread messages count
 *   * image link preview
 */
test.describe.serial('ngx-chat', () => {
  const domain = devXmppDomain;
  const username = devXmppJid?.split('@')[0] as string;
  const password = devXmppPassword;

  const adminLogin: AuthRequest = {
    domain,
    username,
    password,
    service: `wss://${domain}:5280/websocket`,
  };

  const dwarfs = {
    doc: 'Doc',
    grumpy: 'Grumpy',
    happy: 'Happy',
    sleepy: 'Sleepy',
    bashful: 'Bashful',
    sneezy: 'Sneezy',
    dopey: 'Dopey',
  };

  const snowWhite = 'SnowWhite';
  const evilQueen = 'EvilQueen';
  const huntsman = 'Huntsman';

  let appPage: AppPage;
  let ejabberdAdminPage: EjabberdAdminPage;

  test.beforeAll(async ({ browser, playwright }) => {
    appPage = new AppPage(await browser.newPage());
    ejabberdAdminPage = await EjabberdAdminPage.create(
      playwright,
      adminLogin.domain,
      devXmppJid,
      adminLogin.password
    );
    await ejabberdAdminPage.requestDeleteAllUsersBesidesAdmin();
  });

  test('should be able to log in', async () => {
    await appPage.navigateToIndex();
    await appPage.setDomain(adminLogin.domain);
    await appPage.setService(adminLogin.service as string);
    await appPage.logIn(adminLogin.username, adminLogin.password);
    expect(await appPage.getOnlineStateText()).toContain('online');
  });

  test('should be able to log out', async () => {
    await appPage.logOut();
    expect(await appPage.getOfflineStateText()).toContain('offline');
  });

  test('should be able to register SnowWhite', async () => {
    await ejabberdAdminPage.register(snowWhite, snowWhite);
  });

  test('should be able to register the 7 dwarves', async () => {
    await ejabberdAdminPage.register(dwarfs.doc, dwarfs.doc);
    await ejabberdAdminPage.register(dwarfs.grumpy, dwarfs.grumpy);
    await ejabberdAdminPage.register(dwarfs.happy, dwarfs.happy);
    await ejabberdAdminPage.register(dwarfs.sleepy, dwarfs.sleepy);
    await ejabberdAdminPage.register(dwarfs.bashful, dwarfs.bashful);
    await ejabberdAdminPage.register(dwarfs.sneezy, dwarfs.sneezy);
    await ejabberdAdminPage.register(dwarfs.dopey, dwarfs.dopey);
  });

  test('should be able to register the Huntsman', async () => {
    await ejabberdAdminPage.register(huntsman, huntsman);
  });

  test('should be able to login as SnowWhite', async () => {
    await appPage.logIn(snowWhite, snowWhite);
  });

  test('should be able to add the 7 dwarves as SnowWhite contacts', async () => {
    await appPage.addContact(dwarfs.doc);
    await appPage.addContact(dwarfs.grumpy);
    await appPage.addContact(dwarfs.happy);
    await appPage.addContact(dwarfs.sleepy);
    await appPage.addContact(dwarfs.bashful);
    await appPage.addContact(dwarfs.sneezy);
    await appPage.addContact(dwarfs.dopey);
  });

  test('should be able to write to Sleepy and Grumpy', async () => {
    const sleepyMessage = 'Please wake up we have it is time for the mines';
    const snowWhiteChatWithSleepy = await appPage.openChatWith(dwarfs.sleepy);
    await snowWhiteChatWithSleepy.write(sleepyMessage);
    await snowWhiteChatWithSleepy.close();

    const grumpyMessage = 'Grump Grump Grump';
    const snowWhiteChatWithGrumpy = await appPage.openChatWith(dwarfs.grumpy);
    await snowWhiteChatWithGrumpy.write(grumpyMessage);
    await snowWhiteChatWithGrumpy.close();

    await appPage.logOut(); // log out Snow White

    await appPage.logIn(dwarfs.sleepy, dwarfs.sleepy);
    const sleepyChatWithSnowWhite = await appPage.openChatWith(snowWhite);
    expect(await sleepyChatWithSnowWhite.getNthMessage(0)).toEqual(sleepyMessage);
    await appPage.logOut();

    await appPage.logIn(dwarfs.grumpy, dwarfs.grumpy);
    const grumpyChatWithSnowWhite = await appPage.openChatWith(snowWhite);
    expect(await grumpyChatWithSnowWhite.getNthMessage(0)).toEqual(grumpyMessage);
    await appPage.logOut();
  });

  test('should be able to write as the EvilQueen to SnowWhite', async () => {
    await ejabberdAdminPage.register(evilQueen, evilQueen);
    expect(appPage.isRegistrationForUserSuccessful(evilQueen)).toBeTruthy();

    const queenMessage = 'Do you like apples?';
    await appPage.logIn(evilQueen, evilQueen);
    const evilQueenChatWithSnowWhite = await appPage.openChatWith(snowWhite);
    await evilQueenChatWithSnowWhite.write(queenMessage);
    await evilQueenChatWithSnowWhite.close();
  });

  test('should be able to send click able link and a image with preview as well', async () => {
    const evilQueenChatWithSnowWhite = await appPage.openChatWith(snowWhite);

    const imageLink = 'https://pixabay.com/images/id-1475977/';
    await evilQueenChatWithSnowWhite.write(imageLink);
    expect(evilQueenChatWithSnowWhite.hasLinkWithUrl(imageLink)).toBeTruthy();

    const imageLinkWithFileExtension =
      'https://upload.wikimedia.org/wikipedia/en/3/3d/Poisoned_Apple_cd_cover.jpg';
    await evilQueenChatWithSnowWhite.write(imageLinkWithFileExtension);
    expect(evilQueenChatWithSnowWhite.hasLinkWithUrl(imageLinkWithFileExtension)).toBeTruthy();
    expect(evilQueenChatWithSnowWhite.hasImageWithUrl(imageLinkWithFileExtension)).toBeTruthy();
    await appPage.logOut();
  });

  test('should be able to block the EvilQueen as SnowWhite', async () => {
    await appPage.logIn(snowWhite, snowWhite);
    expect(appPage.isContactInRoster(evilQueen)).toBeTruthy();
    const snowWhiteChatWithEvilQueen = await appPage.openChatWith(evilQueen);
    await snowWhiteChatWithEvilQueen.block();
    expect(await appPage.isContactNotInRoster(evilQueen)).toBeTruthy();
    await appPage.logOut();
  });

  test('should no longer be able to write as the EvilQueen to SnowWhite', async () => {
    const message = 'ANSWER ME!';
    await appPage.logIn(evilQueen, evilQueen);
    const chat = await appPage.openChatWith(snowWhite);
    await chat.write(message);
    await appPage.logOut();
    await appPage.logIn(snowWhite, snowWhite);
    expect(await appPage.isContactNotInRoster(evilQueen)).toBeTruthy();
    await appPage.logOut();
  });

  test('should be able to unblock the EvilQueen as SnowWhite', async () => {
    await appPage.logIn(snowWhite, snowWhite);
    await appPage.unblockContact(evilQueen);
    expect(await appPage.isContactInRoster(evilQueen)).toBeTruthy();
    await appPage.logOut();
  });

  test('should be able to write as the Huntsman to SnowWhite', async () => {
    const queenMessage = 'Do NOT eat any apples!!11elf!';
    await ejabberdAdminPage.register(huntsman, huntsman);
    await appPage.logIn(huntsman, huntsman);
    const huntsmanChatWithSnowWhite = await appPage.openChatWith(snowWhite);
    await huntsmanChatWithSnowWhite.write(queenMessage);
    await appPage.logOut();
  });

  test('should be able to block the Huntsman as SnowWhite', async () => {
    await appPage.logIn(snowWhite, snowWhite);
    expect(await appPage.isContactInRoster(huntsman)).toBeTruthy();
    const snowWhiteChatWithHuntsman = await appPage.openChatWith(huntsman);
    await snowWhiteChatWithHuntsman.block();
    expect(await appPage.isContactInRoster(huntsman)).toBeFalsy();
  });

  test('should no longer be able to write as the Huntsman to SnowWhite', async () => {
    const message = 'Hello? :(';
    await appPage.logIn(huntsman, huntsman);
    const chat = await appPage.openChatWith(snowWhite);
    await chat.write(message);
    await appPage.logOut();
    await appPage.logIn(snowWhite, snowWhite);
    expect(await appPage.isContactInRoster(huntsman)).toBeFalsy();
    await appPage.logOut();
  });

  test('should be able to unblock the Huntsman as SnowWhite', async () => {
    await appPage.logIn(snowWhite, snowWhite);
    await appPage.unblockContact(huntsman);
    expect(await appPage.isContactInRoster(huntsman)).toBeTruthy();
    await appPage.logOut();
  });

  test('should be able to accept the Huntsman request as SnowWhite', async () => {
    await appPage.logIn(snowWhite, snowWhite);
    await appPage.addContact(huntsman);
    expect(await appPage.isContactInRoster(huntsman)).toBeTruthy();
    const chat = await appPage.openChatWith(huntsman);
    await chat.denyContactRequest();
    await chat.hasBlockLink();
    await chat.isAcceptDisabled();
    await chat.isDenyDisabled();
    await chat.dismiss();
    await chat.acceptContactRequest();
    await appPage.logOut();
  });
});
