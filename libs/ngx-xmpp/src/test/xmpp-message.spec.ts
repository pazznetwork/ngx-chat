// SPDX-License-Identifier: AGPL-3.0-or-later
import { testUser, TestUtils } from './helpers/test-utils';
import { firstValueFrom, Subscription } from 'rxjs';
import { parseJid } from '@pazznetwork/ngx-chat-shared';
import { ensureNoRegisteredUser } from './helpers/admin-actions';
import { TestBed } from '@angular/core/testing';
import { XmppAdapterTestModule } from '../xmpp-adapter-test.module';
import type { XmppService } from '@pazznetwork/xmpp-adapter';
import { CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';

describe('message plugin', () => {
  let testUtils: TestUtils;
  let subscriptionMessage: Subscription;
  let subscriptionContacts: Subscription;

  beforeEach(() => {
    const testBed = TestBed.configureTestingModule({
      imports: [XmppAdapterTestModule],
    });
    testUtils = new TestUtils(testBed.inject<XmppService>(CHAT_SERVICE_TOKEN));
    subscriptionMessage = testUtils.chatService.messageService.message$.subscribe();
    subscriptionContacts = testUtils.chatService.contactListService.contacts$.subscribe();
  });

  afterEach(async () => {
    await testUtils.chatService.unregister(testUser);
    subscriptionMessage.unsubscribe();
    subscriptionContacts.unsubscribe();
  });

  it('should process received messages', async () => {
    await ensureNoRegisteredUser(testUser);
    await testUtils.chatService.register(testUser);

    const currentUserJid = await firstValueFrom(
      testUtils.chatService.chatConnectionService.userJid$
    );
    const currentTime = new Date().getTime();

    const someUserJid = 'someone@example.com';

    const messageStanza = `<message from="${someUserJid}" to="${currentUserJid}" type="chat"><body>message text</body></message>`;

    await testUtils.fakeWebsocketInStanza(messageStanza);

    const messageContact = await firstValueFrom(testUtils.chatService.messageService.message$);
    const contacts = await firstValueFrom(testUtils.chatService.contactListService.contacts$);
    expect(contacts.length).toBe(1);

    const someContact = contacts[0];

    if (someContact == null) {
      fail('First contact in contact list was undefined');
      return;
    }

    expect(someContact.equalsJid(parseJid(someUserJid))).toBeTrue();
    expect(someContact).toBe(messageContact);

    const messages = someContact.messageStore.messages;
    expect(messages.length).toBe(1);

    if (messages[0] == null) {
      fail('First message in message list was undefined');
      return;
    }

    expect(messages[0].body).toBe('message text');
    expect(messages[0].direction).toBe('in');
    expect(messages[0].datetime.getTime()).toBeLessThanOrEqual(currentTime);
    expect(messages[0].datetime.getTime())
      .withContext('incoming message should be processed within 20ms')
      .toBeLessThan(currentTime + 20);
    expect(messages[0].delayed).toBeFalse();
    expect(messages[0].fromArchive).toBeFalse();
  });

  it('should process received messages when they were delayed', async () => {
    await ensureNoRegisteredUser(testUser);
    await testUtils.chatService.register(testUser);

    const delay = '2021-08-17T15:33:25.375401Z';
    const someUserJid = 'someone@example.com';
    const currentUserJid = await firstValueFrom(
      testUtils.chatService.chatConnectionService.userJid$
    );

    const messageStanza = `<message from="${someUserJid}" to="${currentUserJid}"><delay stamp="${delay}"></delay><body>message text</body></message>`;

    await testUtils.fakeWebsocketInStanza(messageStanza);

    const contacts = await firstValueFrom(testUtils.chatService.contactListService.contacts$);
    expect(contacts.length).toBe(1);

    const someContact = contacts[0];

    if (someContact == null) {
      fail('First contact in contact list was undefined');
      return;
    }

    expect(someContact.jid.toString()).toBe(parseJid(someUserJid).toString());

    const messages = someContact.messageStore.messages;
    expect(messages.length).toBe(1);

    if (messages[0] == null) {
      fail('First message in message list was undefined');
      return;
    }

    expect(messages[0].datetime).toEqual(new Date(delay));
    expect(messages[0].delayed).toBeTrue();
    expect(messages[0].fromArchive).toBeFalse();
  });
});
