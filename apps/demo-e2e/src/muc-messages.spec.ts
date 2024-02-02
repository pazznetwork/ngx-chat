// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from '@playwright/test';
import { AppPage } from './page-objects/app.po';
import {
  devXmppDomain,
  devXmppJid,
  devXmppPassword,
} from '../../../libs/ngx-xmpp/src/.secrets-const';
import { EjabberdAdminPage } from './page-objects/ejabberd-admin.po';

const testPassword = 'test';

test.describe.serial('ngx-chat', () => {
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
    await ejabberdAdminPage.deleteAllBesidesAdminUser();

    await mainPage.setupForTest();
  });

  test.afterAll(() => ejabberdAdminPage.deleteAllBesidesAdminUser());

  test('grant membership to single user to single room async (one is online another offline)', async () => {
    const room = 'mines';
    const owner = 'owner';
    const slave = 'slave';
    await ejabberdAdminPage.register(owner, testPassword);
    await ejabberdAdminPage.register(slave, testPassword);

    await mainPage.logIn(owner, testPassword);
    const ownerMuc = mainPage.createMUCPageObject();
    await ownerMuc.createRoom(room);
    await ownerMuc.selectRoom();
    await ownerMuc.grantMembership(slave);
    await ownerMuc.inviteUser(slave);
    const ownerChat = await mainPage.openChatWith(room);
    const welcome = 'Welcome to the the mines!';
    await ownerChat.write(welcome);
    await mainPage.logOut();

    await mainPage.logIn(slave, testPassword);
    const slaveMuc = mainPage.createMUCPageObject();
    await slaveMuc.acceptInvite(room);
    const slaveChat = await mainPage.openChatWith(room);
    await slaveChat.assertLastMessage(welcome);
    const workWork = 'Work work more work...';
    await ownerChat.write(workWork);
    await mainPage.logOut();

    await mainPage.logIn(owner, testPassword);
    const later = await mainPage.openChatWith(room);
    await later.assertLastMessage(workWork);
    await mainPage.logOut();
  });

  test.skip('should be able to create a room, write a message, invite bob and tim, let them join and see the message, and destroy the room', async () => {
    const room = 'wonderland';
    const alice = 'alice';
    const bob = 'bob';
    const tim = 'tim';
    const hello = 'Hello my dear friends';
    await ejabberdAdminPage.register(alice, testPassword);
    await ejabberdAdminPage.register(bob, testPassword);
    await ejabberdAdminPage.register(tim, testPassword);

    await mainPage.logIn(alice, testPassword);
    const aliceMuc = mainPage.createMUCPageObject();

    await aliceMuc.createRoom(room);
    await aliceMuc.selectRoom();
    await aliceMuc.grantMembership(alice);
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
