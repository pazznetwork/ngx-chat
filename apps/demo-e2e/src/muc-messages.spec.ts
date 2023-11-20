// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from '@playwright/test';
import { AppPage } from './page-objects/app.po';
import {
  devXmppDomain,
  devXmppJid,
  devXmppPassword,
} from '../../../libs/ngx-xmpp/src/.secrets-const';
import { EjabberdAdminPage } from './page-objects/ejabberd-admin.po';

const alice = 'alice';
const bob = 'bob';
const tim = 'tim';
const testPassword = 'test';

const room = 'wonderland';

test.describe.serial.only('ngx-chat', () => {
  let mainPage: AppPage;
  let ejabberdAdminPage: EjabberdAdminPage;

  test.beforeAll(async ({ browser, playwright }) => {
    mainPage = await AppPage.create(browser);
    ejabberdAdminPage = await EjabberdAdminPage.create(
      playwright,
      devXmppDomain,
      devXmppJid,
      devXmppPassword
    );
    await ejabberdAdminPage.requestDeleteAllUsersBesidesAdmin();

    await mainPage.setupForTest();
    await ejabberdAdminPage.register(alice, testPassword);
    await ejabberdAdminPage.register(bob, testPassword);
    await ejabberdAdminPage.register(tim, testPassword);
  });

  test.afterAll(() => ejabberdAdminPage.requestDeleteAllUsersBesidesAdmin());

  test('should be able to create a room, write a message, invite bob and tim, let them join and see the message, and destroy the room', async () => {
    const hello = 'Hello my dear friends';

    await mainPage.logIn(alice, testPassword);
    const aliceMuc = mainPage.createMUCPageObject();

    await aliceMuc.createRoom(room);
    await aliceMuc.selectRoom();
    await aliceMuc.inviteUser(bob);
    await aliceMuc.inviteUser(tim);

    const aliceRoomChat = await mainPage.openChatWith(room);
    await aliceRoomChat.write(hello);

    const bobPage = await mainPage.logInInNewPage(bob, testPassword);
    const bobMuc = bobPage.createMUCPageObject();
    await bobMuc.acceptInvite(room);
    const timPage = await mainPage.logInInNewPage(tim, testPassword);
    const timMuc = timPage.createMUCPageObject();
    await timMuc.acceptInvite(room);
    const bobRoomChat = await bobPage.openChatWith(room);
    const timRoomChat = await bobPage.openChatWith(room);

    const iAmBob = 'I am bob';
    expect(await bobRoomChat.getNthMessage(1)).toContain(hello);
    await bobRoomChat.write(iAmBob);

    const considerMeTim = 'consider me tim';
    expect(await timRoomChat.getNthMessage(1)).toContain(hello);
    expect(await timRoomChat.getNthMessage(2)).toContain(iAmBob);
    await timRoomChat.write(considerMeTim);

    expect(await bobRoomChat.getNthMessage(3)).toContain(considerMeTim);

    expect(await aliceRoomChat.getNthMessage(2)).toContain(iAmBob);
    expect(await aliceRoomChat.getNthMessage(3)).toContain(considerMeTim);
    await bobMuc.leaveRoom();

    const alone = 'Finally alone, tim :D';
    await aliceRoomChat.write(alone);
    expect(await timRoomChat.getNthMessage(4)).toContain(alone);

    expect(await bobRoomChat.assertLastMessageIsNot(alone)).toBeTruthy();
    await aliceMuc.kickUser(tim);

    const reallyAlone = 'Now I am really alone';
    await aliceRoomChat.write(reallyAlone);
    expect(await timRoomChat.assertLastMessageIsNot(reallyAlone)).toBeTruthy();

    await aliceMuc.destroy();

    await mainPage.logOut();
    await bobPage.logOut();
    await timPage.logOut();
  });
});
