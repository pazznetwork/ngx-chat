// SPDX-License-Identifier: MIT
import { TestBed } from '@angular/core/testing';
import { XmppAdapterTestModule } from '../xmpp-adapter-test.module';
import { TestUtils } from './helpers/test-utils';
import type { XmppService } from '@pazznetwork/xmpp-adapter';
import { CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';
import { $msg } from '@pazznetwork/strophets';
import { ensureNoRegisteredUser, ensureRegisteredUser } from './helpers/admin-actions';
import { Direction } from '@pazznetwork/ngx-chat-shared';
import { firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';

describe('message archive plugin', () => {
  let testUtils: TestUtils;

  const from = 'conference.local-jabber.entenhausen.pazz.de';
  const userJid = 'me@example.com/myresource';
  const roomJidBare = 'someroom@conference.example.com';

  beforeEach(() => {
    const testBed = TestBed.configureTestingModule({
      imports: [XmppAdapterTestModule],
    });
    testUtils = new TestUtils(testBed.inject<XmppService>(CHAT_SERVICE_TOKEN));
  });

  it('should handle chat messages from archive by creating contacts and adding messages to contacts', async () => {
    const chatArchiveStanza = $msg({ from, to: testUtils.hero.jid })
      .c('result', { xmlns: 'urn:xmpp:mam:2' })
      .c('forwarded')
      .c('delay', { stamp: '2018-07-18T08:47:44.233057Z' })
      .up()
      .c('message', { from: userJid.toString(), to: testUtils.hero.jid, type: 'chat' })
      .c('origin-id', { id: 'id' })
      .up()
      .c('body', {}, 'message text');

    await ensureRegisteredUser(testUtils.hero);

    const contactsPromise = firstValueFrom(
      testUtils.chatService.contactListService.contacts$.pipe(
        filter((contacts) => contacts.length > 0)
      )
    );
    await testUtils.logIn.hero();

    await testUtils.fakeWebsocketInStanza(chatArchiveStanza.toString());

    const contacts = await contactsPromise;
    expect(contacts.length).toBe(1);
    expect(contacts[0]?.jid.toString()).toEqual(userJid);

    const messages = contacts[0]?.messageStore.messages;
    expect(messages?.length).toBe(1);
    expect(messages?.[0]?.body).toBe('message text');
    expect(messages?.[0]?.direction).toBe(Direction.in);
    expect(messages?.[0]?.datetime).toEqual(new Date('2018-07-18T08:47:44.233057Z'));
    expect(messages?.[0]?.fromArchive).toBe(true);

    await testUtils.logOut();

    await ensureNoRegisteredUser(testUtils.hero);
  });

  xit('should handle group chat messages by adding them to appropriate rooms', async () => {
    const groupChatArchiveStanza = $msg({ from, to: testUtils.hero.jid })
      .c('result', { xmlns: 'urn:xmpp:mam:2' })
      .c('forwarded')
      .c('delay', { stamp: '2021-08-17T15:33:25.375401Z' })
      .c('message', { from: roomJidBare + '/othernick', type: 'groupchat' })
      .c('body', {}, 'group chat!');

    await ensureRegisteredUser(testUtils.hero);

    const contactsPromise = firstValueFrom(testUtils.chatService.contactListService.contacts$);
    await testUtils.logIn.hero();

    await testUtils.fakeWebsocketInStanza(groupChatArchiveStanza.toString());

    const contacts = await contactsPromise;
    const roomMessages = contacts?.[0]?.messageStore.messages;

    expect(roomMessages?.length).toBe(1);

    const roomMessage = roomMessages?.[0];

    expect(roomMessage?.body).toBe('group chat!');
    expect(roomMessage?.datetime).toEqual(new Date('2021-08-17T15:33:25.375401Z'));
    expect(roomMessage?.direction).toBe(Direction.in);
    expect(roomMessage?.fromArchive).toBe(true);

    await testUtils.logOut();

    await ensureNoRegisteredUser(testUtils.hero);
  });

  xit('should handle MUC/Sub archive stanzas correctly', async () => {
    const mucSubArchiveStanza = $msg({ from, to: testUtils.hero.jid })
      .c('result', { xmlns: 'urn:xmpp:mam:2' })
      .c('forwarded')
      .c('delay', { stamp: '2021-08-17T15:33:25.375401Z' })
      .c('message')
      .c('event', { xmlns: 'http://jabber.org/protocol/pubsub#event' })
      .c('items', { node: 'urn:xmpp:mucsub:nodes:messages' })
      .c('item')
      .c('message', { from: roomJidBare + '/othernick', type: 'groupchat' })
      .c('body', {}, 'group chat!');

    await ensureRegisteredUser(testUtils.hero);

    const contactsPromise = firstValueFrom(testUtils.chatService.contactListService.contacts$);
    await testUtils.logIn.hero();

    await testUtils.fakeWebsocketInStanza(mucSubArchiveStanza.toString());

    const contacts = await contactsPromise;
    const roomMessages = contacts?.[0]?.messageStore.messages;

    expect(roomMessages?.length).toBe(1);

    const roomMessage = roomMessages?.[0];

    expect(roomMessage?.body).toBe('group chat!');
    expect(roomMessage?.datetime).toEqual(new Date('2021-08-17T15:33:25.375401Z'));
    expect(roomMessage?.direction).toBe(Direction.in);
    expect(roomMessage?.fromArchive).toBe(true);

    await testUtils.logOut();

    await ensureNoRegisteredUser(testUtils.hero);
  });
});
