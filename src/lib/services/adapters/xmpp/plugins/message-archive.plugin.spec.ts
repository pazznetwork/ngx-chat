import { TestBed } from '@angular/core/testing';
import { Client, jid as parseJid, xml } from '@xmpp/client';
import { Contact } from '../../../../core/contact';
import { Direction } from '../../../../core/message';
import { testLogService } from '../../../../test/log-service';
import { MockClientFactory } from '../../../../test/xmppClientMock';
import { ContactFactoryService } from '../../../contact-factory.service';
import { LogService } from '../../../log.service';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { XmppChatConnectionService } from '../xmpp-chat-connection.service';
import { XmppClientFactoryService } from '../xmpp-client-factory.service';
import { MessageArchivePlugin } from './message-archive.plugin';
import SpyObj = jasmine.SpyObj;
import { MessagePlugin } from './message.plugin';
import { ServiceDiscoveryPlugin } from './service-discovery.plugin';
import { MultiUserChatPlugin } from './multi-user-chat/multi-user-chat.plugin';
import { Room } from './multi-user-chat/room';

describe('message archive plugin', () => {

    let chatConnectionService: XmppChatConnectionService;
    let chatAdapter: XmppChatAdapter;
    let contactFactory: ContactFactoryService;
    let xmppClientMock: SpyObj<Client>;
    let otherContact: Contact;
    const otherContactJid = parseJid('someone@else.com');
    const userJid = parseJid('me@example.com/myresource');
    const roomJid = parseJid('someroom@conference.example.com/mynick');

    const chatArchiveStanza =
        xml('message', {},
            xml('result', {xmlns: 'urn:xmpp:mam:2'},
                xml('forwarded', {},
                    xml('delay', {stamp: '2018-07-18T08:47:44.233057Z'}),
                    xml('message', {from: userJid.toString(), to: otherContactJid.toString(), type: 'chat'},
                        xml('origin-id', {id: 'id'}),
                        xml('body', {}, 'message text')))));

    const groupChatArchiveStanza =
        xml('message', {},
            xml('result', {xmlns: 'urn:xmpp:mam:2'},
                xml('forwarded', {},
                    xml('delay', {stamp: '2021-08-17T15:33:25.375401Z'}),
                    xml('message', {from: roomJid.bare().toString() + '/othernick', type: 'groupchat'},
                        xml('body', {}, 'group chat!')))));

    const mucSubArchiveStanza =
        xml('message', {},
            xml('result', {xmlns: 'urn:xmpp:mam:2'},
                xml('forwarded', {},
                    xml('delay', {stamp: '2021-08-17T15:33:25.375401Z'}),
                    xml('message', {},
                        xml('event', {xmlns: 'http://jabber.org/protocol/pubsub#event'},
                            xml('items', {node: 'urn:xmpp:mucsub:nodes:messages'},
                                xml('item', {},
                                    xml('message', {from: roomJid.bare().toString() + '/othernick', type: 'groupchat'},
                                        xml('body', {}, 'group chat!'))))))))); // see: https://xkcd.com/297/

    beforeEach(() => {
        const mockClientFactory = new MockClientFactory();
        xmppClientMock = mockClientFactory.clientInstance;

        TestBed.configureTestingModule({
            providers: [
                XmppChatConnectionService,
                {provide: XmppClientFactoryService, useValue: mockClientFactory},
                XmppChatAdapter,
                {provide: LogService, useValue: testLogService()},
                ContactFactoryService,
            ],
        });

        chatConnectionService = TestBed.inject(XmppChatConnectionService);
        chatConnectionService.client = xmppClientMock;

        contactFactory = TestBed.inject(ContactFactoryService);
        chatAdapter = TestBed.inject(XmppChatAdapter);
        otherContact = contactFactory.createContact(otherContactJid.toString(), 'jon doe');
    });

    it('should handle chat messages from archive by creating contacts and adding messages to contacts', () => {
        const serviceDiscoveryPlugin = {
            supportsFeature() {
                return Promise.resolve(false);
            },
        } as any as ServiceDiscoveryPlugin;
        const messagePlugin = new MessagePlugin(chatAdapter, testLogService());
        const messageArchivePlugin = new MessageArchivePlugin(chatAdapter, serviceDiscoveryPlugin, null, testLogService(), messagePlugin);
        chatAdapter.addPlugins([messageArchivePlugin]);
        chatConnectionService.onOnline(userJid);

        chatConnectionService.onStanzaReceived(chatArchiveStanza);

        const contacts = chatAdapter.contacts$.getValue();
        expect(contacts.length).toBe(1);
        expect(contacts[0].jidBare).toEqual(otherContact.jidBare);

        const messages = contacts[0].messages;
        expect(messages.length).toBe(1);
        expect(messages[0].body).toBe('message text');
        expect(messages[0].direction).toBe(Direction.out);
        expect(messages[0].datetime).toEqual(new Date('2018-07-18T08:47:44.233057Z'));
        expect(messages[0].fromArchive).toBe(true);
    });

    it('should handle group chat messages by adding them to appropriate rooms', () => {
        const serviceDiscoveryPlugin = {
            supportsFeature() {
                return Promise.resolve(false);
            },
        } as unknown as ServiceDiscoveryPlugin;
        const logService = testLogService();
        const multiUserChatPlugin = new MultiUserChatPlugin(chatAdapter, logService, null);
        const messageArchivePlugin = new MessageArchivePlugin(chatAdapter, serviceDiscoveryPlugin, multiUserChatPlugin, logService, null);
        chatAdapter.addPlugins([messageArchivePlugin, multiUserChatPlugin]);
        chatConnectionService.onOnline(userJid);
        const room = new Room(roomJid, logService);
        room.nick = roomJid.resource;
        multiUserChatPlugin.rooms$.next([room]);

        chatConnectionService.onStanzaReceived(groupChatArchiveStanza);

        const roomMessages = multiUserChatPlugin.rooms$.getValue()[0].messages;

        expect(roomMessages.length).toBe(1);

        const roomMessage = roomMessages[0];

        expect(roomMessage.body).toBe('group chat!');
        expect(roomMessage.datetime).toEqual(new Date('2021-08-17T15:33:25.375401Z'));
        expect(roomMessage.direction).toBe(Direction.in);
        expect(roomMessage.fromArchive).toBe(true);
    });

    it('should handle MUC/Sub archive stanzas correctly', () => {
        const serviceDiscoveryPlugin = {
            supportsFeature() {
                return Promise.resolve(false);
            },
        } as unknown as ServiceDiscoveryPlugin;
        const logService = testLogService();
        const multiUserChatPlugin = new MultiUserChatPlugin(chatAdapter, logService, null);
        const messageArchivePlugin = new MessageArchivePlugin(chatAdapter, serviceDiscoveryPlugin, multiUserChatPlugin, logService, null);
        chatAdapter.addPlugins([messageArchivePlugin, multiUserChatPlugin]);
        chatConnectionService.onOnline(userJid);
        const room = new Room(roomJid, logService);
        room.nick = roomJid.resource;
        multiUserChatPlugin.rooms$.next([room]);

        chatConnectionService.onStanzaReceived(mucSubArchiveStanza);

        const roomMessages = multiUserChatPlugin.rooms$.getValue()[0].messages;

        expect(roomMessages.length).toBe(1);

        const roomMessage = roomMessages[0];

        expect(roomMessage.body).toBe('group chat!');
        expect(roomMessage.datetime).toEqual(new Date('2021-08-17T15:33:25.375401Z'));
        expect(roomMessage.direction).toBe(Direction.in);
        expect(roomMessage.fromArchive).toBe(true);
    });

    it('should not request messages if message archive plugin is not set ', () => {
        chatConnectionService.onOnline(userJid);

        chatConnectionService.onStanzaReceived(chatArchiveStanza);

        expect(chatAdapter.contacts$.getValue()).toEqual([]);
    });

});
