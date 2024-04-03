// SPDX-License-Identifier: MIT
import { TestBed } from '@angular/core/testing';
import { XmppAdapterTestModule } from '../xmpp-adapter-test.module';
import { TestUtils } from './helpers/test-utils';
import type { XmppService } from '@pazznetwork/xmpp-adapter';
import { CHAT_SERVICE_TOKEN, LogService } from '@pazznetwork/ngx-xmpp';
import { $msg } from '@pazznetwork/strophe-ts';
import { ensureNoRegisteredUser, ensureRegisteredUser } from './helpers/admin-actions';
import { Direction, parseJid, Room } from '@pazznetwork/ngx-chat-shared';
import { firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';

describe('message archive plugin', () => {
  let testUtils: TestUtils;

  const from = 'conference.local-jabber.entenhausen.pazz.de';
  const userJid = 'me@example.com/myresource';

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

  it('should handle chat messages from a users sending a message to 2 offline users', async () => {
    await ensureRegisteredUser(testUtils.hero);
    await ensureRegisteredUser(testUtils.friend);
    await ensureRegisteredUser(testUtils.father);
    const contactsPromise = firstValueFrom(
      testUtils.chatService.contactListService.contacts$.pipe(filter((c) => c.length === 2))
    );
    const messagesPromise = firstValueFrom(testUtils.chatService.messageService.message$);

    await testUtils.logIn.hero();
    await testUtils.chatService.contactListService.addContact(testUtils.friend.jid);
    await testUtils.chatService.contactListService.addContact(testUtils.father.jid);

    const [friend, father] = await contactsPromise;

    if (!friend || !father) {
      throw new Error('friend or father not found');
    }

    const friendMessage = 'message to friend';
    await testUtils.chatService.messageService.sendMessage(friend, friendMessage);
    await testUtils.chatService.messageService.sendMessage(father, 'message to father');
    await testUtils.logOut();

    await testUtils.logIn.friend();
    const recipient = await messagesPromise;
    expect(recipient.messageStore.messages.length).toBe(1);
    expect(recipient.messageStore.messages[0]?.body).toBe(friendMessage);
    await testUtils.logOut();

    await testUtils.logIn.friend();
    await testUtils.logOut();

    await ensureNoRegisteredUser(testUtils.hero);
    await ensureNoRegisteredUser(testUtils.friend);
    await ensureNoRegisteredUser(testUtils.father);
  });

  it('should handle group chat messages by adding them to appropriate rooms', async () => {
    const roomId = 'someroom';
    const roomJidBare = roomId + '@conference.example.com';
    const stamp = '2021-08-17T15:33:25.375401Z';
    const text = 'group chat!';
    const groupChatArchiveStanza = $msg({ from, to: testUtils.hero.jid })
      .c('result', { xmlns: 'urn:xmpp:mam:2' })
      .c('forwarded')
      .c('delay', { stamp })
      .c('message', { from: roomJidBare + '/othernick', type: 'groupchat' })
      .c('body', {}, text);

    await ensureRegisteredUser(testUtils.hero);

    const roomPromise = firstValueFrom(
      testUtils.chatService.roomService.rooms$.pipe(
        filter((rooms) => !!rooms?.find((room) => roomJidBare.includes(room.jid.local as string)))
      )
    );
    await testUtils.logIn.hero();
    testUtils.chatService.pluginMap.muc['createdRoomSubject'].next(
      new Room(new LogService(), parseJid(roomJidBare))
    );

    await testUtils.fakeWebsocketInStanza(groupChatArchiveStanza.toString());

    const rooms = await roomPromise;
    const roomMessages = rooms?.find((room) => roomJidBare.includes(room.jid.local as string))
      ?.messageStore.messages;

    expect(roomMessages?.length).toBe(1);

    const roomMessage = roomMessages?.[0];

    expect(roomMessage?.body).toBe(text);
    expect(roomMessage?.datetime).toEqual(new Date(stamp));
    expect(roomMessage?.direction).toBe(Direction.in);
    expect(roomMessage?.fromArchive).toBe(true);

    await testUtils.logOut();

    await ensureNoRegisteredUser(testUtils.hero);
  });

  xit('should handle MUC/Sub archive stanzas correctly', async () => {
    const stamp = '2021-08-17T15:33:25.375401Z';
    const text = 'group chat the second!';
    const roomId = 'anotherroom';
    const roomJidBare = roomId + '@conference.example.com';
    const mucSubArchiveStanza = $msg({ from, to: testUtils.villain.jid })
      .c('result', { xmlns: 'urn:xmpp:mam:2' })
      .c('forwarded')
      .c('delay', { stamp })
      .c('message')
      .c('event', { xmlns: 'http://jabber.org/protocol/pubsub#event' })
      .c('items', { node: 'urn:xmpp:mucsub:nodes:messages' })
      .c('item')
      .c('message', { from: roomJidBare + '/othernick', type: 'groupchat' })
      .c('body', {}, text);

    await ensureRegisteredUser(testUtils.villain);

    const roomPromise = firstValueFrom(
      testUtils.chatService.roomService.rooms$.pipe(
        filter((rooms) => !!rooms?.find((room) => roomJidBare.includes(room.jid.local as string)))
      )
    );
    await testUtils.logIn.villain();
    testUtils.chatService.pluginMap.muc['createdRoomSubject'].next(
      new Room(new LogService(), parseJid(roomJidBare))
    );

    await testUtils.fakeWebsocketInStanza(mucSubArchiveStanza.toString());

    const rooms = await roomPromise;
    const roomMessages = rooms?.find((room) => roomJidBare.includes(room.jid.local as string))
      ?.messageStore.messages;

    expect(roomMessages?.length).toBe(1);

    const roomMessage = roomMessages?.[0];

    expect(roomMessage?.body).toBe(text);
    expect(roomMessage?.datetime).toEqual(new Date(stamp));
    expect(roomMessage?.direction).toBe(Direction.in);
    expect(roomMessage?.fromArchive).toBe(true);

    await testUtils.logOut();

    await ensureNoRegisteredUser(testUtils.villain);
  });
});
