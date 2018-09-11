import { TestBed } from '@angular/core/testing';
import { jid as parseJid } from '@xmpp/jid';
import { x as xml } from '@xmpp/xml';

import { Contact, Direction } from '../../../../core';
import { testLogService } from '../../../../test/logService';
import { createXmppClientMock } from '../../../../test/xmppClientMock';
import { ContactFactoryService } from '../../../contact-factory.service';
import { LogService } from '../../../log.service';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { XmppChatConnectionService, XmppClientToken } from '../xmpp-chat-connection.service';
import { MessageArchivePlugin } from './message-archive.plugin';
import { MessagePlugin } from './message.plugin';


describe('message archive plugin', () => {

    let chatConnectionService: XmppChatConnectionService;
    let chatAdapter: XmppChatAdapter;
    let contactFactory: ContactFactoryService;
    let xmppClientMock;
    let logService: LogService;
    let contact1: Contact;
    const userJid = parseJid('me@example.com/myresource');

    const validArchiveStanza =
        xml('message', {},
            xml('result', {xmlns: 'urn:xmpp:mam:2'},
                xml('forwarded', {},
                    xml('delay', {stamp: '2018-07-18T08:47:44.233057Z'}),
                    xml('message', {to: userJid.toString(), from: 'someone@else.com/resource'},
                        xml('origin-id', {id: 'id'}),
                        xml('body', {}, 'message text')))));

    beforeEach(() => {
        xmppClientMock = createXmppClientMock();

        TestBed.configureTestingModule({
            providers: [
                {provide: XmppClientToken, useValue: xmppClientMock},
                XmppChatConnectionService,
                XmppChatAdapter,
                {provide: LogService, useValue: testLogService()},
                ContactFactoryService
            ]
        });

        chatConnectionService = TestBed.get(XmppChatConnectionService);
        contactFactory = TestBed.get(ContactFactoryService);
        chatAdapter = TestBed.get(XmppChatAdapter);
        logService = TestBed.get(LogService);
        contact1 = contactFactory.createContact('someone@else.com', 'jon doe');
    });

    it('should send a request, create contacts and add messages ', () => {
        const messageArchivePlugin = new MessageArchivePlugin(chatAdapter);
        chatAdapter.addPlugins([messageArchivePlugin]);
        chatConnectionService.onOnline(userJid);

        chatConnectionService.onStanzaReceived(validArchiveStanza);

        const contacts = chatAdapter.contacts$.getValue();
        expect(contacts.length).toEqual(1);
        expect(contacts[0].jidBare).toEqual(contact1.jidBare);

        const messages = contacts[0].messages;
        expect(messages.length).toEqual(1);
        expect(messages[0].body).toEqual('message text');
        expect(messages[0].direction).toEqual(Direction.in);
        expect(messages[0].datetime).toEqual(new Date('2018-07-18T08:47:44.233057Z'));
    });

    it('should not request messages if message archive plugin is not set ', () => {
        chatConnectionService.onOnline(userJid);

        chatConnectionService.onStanzaReceived(validArchiveStanza);

        expect(chatAdapter.contacts$.getValue()).toEqual([]);
    });

});
