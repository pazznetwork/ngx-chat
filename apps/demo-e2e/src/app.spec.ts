// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from '@playwright/test';
import { AppPage } from './page-objects/app.po';

import { EjabberdAdminPage } from './page-objects/ejabberd-admin.po';
import {
  devXmppDomain,
  devXmppJid,
  devXmppPassword,
} from '../../../libs/ngx-xmpp/src/.secrets-const';

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
  const dwarfs = {
    doc: 'Doc',
    grumpy: 'Grumpy',
    happy: 'Happy',
    sleepy: 'Sleepy',
    bashful: 'Bashful',
    sneezy: 'Sneezy',
    dopey: 'Dopey',
  };

  const snowWhite = 'snowwhite';
  const evilQueen = 'evilqueen';
  const huntsman = 'huntsman';

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
    await ejabberdAdminPage.deleteAllBesidesAdminUser();
    await ejabberdAdminPage.register(evilQueen, evilQueen);
    await ejabberdAdminPage.register(snowWhite, snowWhite);
    await ejabberdAdminPage.register(huntsman, huntsman);
    await ejabberdAdminPage.register(dwarfs.doc, dwarfs.doc);
    await ejabberdAdminPage.register(dwarfs.grumpy, dwarfs.grumpy);
    await ejabberdAdminPage.register(dwarfs.happy, dwarfs.happy);
    await ejabberdAdminPage.register(dwarfs.sleepy, dwarfs.sleepy);
    await ejabberdAdminPage.register(dwarfs.bashful, dwarfs.bashful);
    await ejabberdAdminPage.register(dwarfs.sneezy, dwarfs.sneezy);
    await ejabberdAdminPage.register(dwarfs.dopey, dwarfs.dopey);
  });

  test('should be able to log in', async () => {
    await appPage.setupForTest();
    await appPage.loginAdmin();
    expect(await appPage.getOnlineStateText()).toContain('online');
  });

  test('should be able to log out', async () => {
    await appPage.logOut();
    expect(await appPage.getOfflineStateText()).toContain('offline');
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

  test('should be able to write as the Huntsman to SnowWhite', async () => {
    const huntsmanMessage = 'Do NOT eat any apples!!11elf!';
    await appPage.logIn(huntsman, huntsman);
    const huntsmanChatWithSnowWhite = await appPage.openChatWith(snowWhite);
    await huntsmanChatWithSnowWhite.write(huntsmanMessage);
    await appPage.logOut();
  });

  test('should be able to block the Huntsman as SnowWhite', async () => {
    await appPage.logIn(snowWhite, snowWhite);
    expect(await appPage.isContactInRoster(huntsman)).toBeTruthy();
    const snowWhiteChatWithHuntsman = await appPage.openChatWith(huntsman);
    await snowWhiteChatWithHuntsman.block();
    expect(await appPage.isBlockedListVisible()).toBeTruthy();
    await appPage.logOut();
  });

  test('should no longer be able to write as the Huntsman to SnowWhite', async () => {
    const message = 'Hello? :(';
    await appPage.logIn(huntsman, huntsman);
    const chat = await appPage.openChatWith(snowWhite);
    await chat.write(message);
    await appPage.logOut();
    await appPage.logIn(snowWhite, snowWhite);
    const snowChat = await appPage.openChatWith(huntsman);
    await snowChat.assertLastMessageIsNot(message);
    await appPage.logOut();
  });

  test('should be able to unblock the Huntsman as SnowWhite', async () => {
    await appPage.logIn(snowWhite, snowWhite);
    await appPage.unblockContact(huntsman);
    expect(await appPage.isBlockedListHidden()).toBeTruthy();
    expect(await appPage.isContactInRoster(huntsman)).toBeTruthy();
    await appPage.logOut();
  });

  test('should be able to accept the Huntsman request as SnowWhite', async () => {
    await appPage.logIn(huntsman, huntsman);
    await appPage.addContact(snowWhite);
    await appPage.logOut();

    await appPage.logIn(snowWhite, snowWhite);
    // const chat = await appPage.openChatWith(huntsman);
    // await chat.denyContactRequest();
    // await chat.hasBlockLink();
    // await chat.acceptContactRequest();
    expect(await appPage.isContactInRoster(huntsman)).toBeTruthy();
    await appPage.logOut();
  });
});
