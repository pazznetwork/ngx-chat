// SPDX-License-Identifier: AGPL-3.0-or-later
import { testUser, TestUtils } from './helpers/test-utils';
import { TestBed } from '@angular/core/testing';
import { XmppAdapterTestModule } from '../xmpp-adapter-test.module';
import type { XmppService } from '@pazznetwork/xmpp-adapter';
import { CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';
import { combineLatest, first, firstValueFrom, switchMap } from 'rxjs';
import { Contact, Direction } from '@pazznetwork/ngx-chat-shared';
import {
  deleteMamChatMessages,
  ensureNoRegisteredUser,
  ensureRegisteredUser,
} from './helpers/admin-actions';

describe('message archive plugin', () => {
  let testUtils: TestUtils;

  beforeAll(async () => {
    const testBed = TestBed.configureTestingModule({
      imports: [XmppAdapterTestModule],
    });
    testUtils = new TestUtils(testBed.inject<XmppService>(CHAT_SERVICE_TOKEN));

    await ensureRegisteredUser(testUser);
    await ensureRegisteredUser(testUtils.friend);
    await deleteMamChatMessages();
  });

  afterAll(async () => {
    await ensureNoRegisteredUser(testUser);
    await ensureNoRegisteredUser(testUtils.friend);
  });

  it('should receive old messages from archive', async () => {
    const messageToFriend = 'message from testUser to friend';
    const recipient = new Contact(testUtils.friend.jid, 'Friend');

    const friendMessages = await firstValueFrom(
      combineLatest([
        testUtils.chatService.onOnline$.pipe(first()),
        testUtils.chatService.logIn(testUser),
      ]).pipe(
        switchMap(() =>
          testUtils.chatService.messageService.sendMessage(recipient, messageToFriend)
        ),
        switchMap(() => testUtils.chatService.logOut()),
        switchMap(() => testUtils.chatService.logIn(testUtils.friend)),
        switchMap(() =>
          combineLatest([
            testUtils.chatService.messageService.loadCompleteHistory(),
            testUtils.chatService.messageService.message$,
          ]).pipe(switchMap(([, messages]) => messages.messageStore.messages$))
        )
      )
    );

    expect(friendMessages).toBeDefined();
    expect(friendMessages.length).toBe(1);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const message = friendMessages[0]!;
    expect(message.body).toBe(messageToFriend);
    expect(message.direction).toBe(Direction.in);

    // logout friend user
    await testUtils.chatService.logOut();
  });
});
