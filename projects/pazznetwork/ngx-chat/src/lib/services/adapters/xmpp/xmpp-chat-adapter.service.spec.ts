import { TestBed } from '@angular/core/testing';
import { jid as parseJid, xml } from '@xmpp/client';
import { first, take } from 'rxjs/operators';
import { Contact } from '../../../core/contact';
import { Direction } from '../../../core/message';
import { Stanza } from '../../../core/stanza';

import { testLogService } from '../../../test/log-service';
import { MockClientFactory } from '../../../test/xmppClientMock';
import { ChatServiceToken } from '../../chat-service';
import { ContactFactoryService } from '../../contact-factory.service';
import { LogService } from '../../log.service';
import { MessageUuidPlugin } from './plugins/message-uuid.plugin';
import { MessagePlugin } from './plugins/message.plugin';
import { XmppChatAdapter } from './xmpp-chat-adapter.service';
import { XmppChatConnectionService } from './xmpp-chat-connection.service';
import { XmppClientFactoryService } from './xmpp-client-factory.service';

describe('XmppChatAdapter', () => {

    let chatService: XmppChatAdapter;
    let chatConnectionService: XmppChatConnectionService;
    let contactFactory;

    let contact1: Contact;
    let contact2: Contact;
    let contacts: Contact[];

    beforeEach(() => {
        const mockClientFactory = new MockClientFactory();
        const xmppClientMock = mockClientFactory.clientInstance;

        const logService = testLogService();
        TestBed.configureTestingModule({
            providers: [
                XmppChatConnectionService,
                {provide: XmppClientFactoryService, useValue: mockClientFactory},
                {provide: ChatServiceToken, useClass: XmppChatAdapter},
                {provide: LogService, useValue: logService},
                ContactFactoryService
            ]
        });

        chatConnectionService = TestBed.inject(XmppChatConnectionService);
        chatConnectionService.client = xmppClientMock;
        contactFactory = TestBed.inject(ContactFactoryService);
        chatService = TestBed.inject(ChatServiceToken) as XmppChatAdapter;
        chatService.addPlugins([new MessageUuidPlugin(), new MessagePlugin(chatService, logService)]);

        contact1 = contactFactory.createContact('test@example.com', 'jon doe');
        contact2 = contactFactory.createContact('test2@example.com', 'jane dane');
        contacts = [contact1, contact2];

        chatConnectionService.userJid = parseJid('me', 'example.com', 'something');
    });

    describe('contact management', () => {

        it('#getContactById() should ignore resources', () => {

            chatService.contacts$.next(contacts);
            expect(chatService.getContactById('test2@example.com/test123'))
                .toEqual(contact2);

        });

        it('#getContactById() should return the correct contact', () => {

            chatService.contacts$.next(contacts);

            expect(chatService.getContactById('test@example.com'))
                .toEqual(contact1);

            expect(chatService.getContactById('test2@example.com'))
                .toEqual(contact2);

        });

        it('#getContactById() should return undefined when no such contact exists', () => {

            chatService.contacts$.next(contacts);
            expect(chatService.getContactById('non@existing.com'))
                .toBeUndefined();

        });

    });

    describe('messages', () => {

        it('#messages$ should emit contact on received messages', (done) => {
            chatService.message$.pipe(first()).subscribe(contact => {
                expect(contact.jidBare.toString()).toEqual(contact1.jidBare.toString());
                expect(contact.messages.length).toEqual(1);
                expect(contact.messages[0].body).toEqual('message text');
                expect(contact.messages[0].direction).toEqual(Direction.in);
                done();
            });
            chatConnectionService.onStanzaReceived(
                xml('message', {from: contact1.jidBare.toString()},
                    xml('body', {}, 'message text')) as Stanza);
        });

        it('#messages$ should not emit contact on sending messages', () => {
            return new Promise<void>((resolve) => {
                let emitted = false;
                chatService.message$.pipe(first()).subscribe(() => emitted = true);
                chatService.sendMessage(contact1.jidBare.toString(), 'send message text');
                setTimeout(() => {
                    expect(emitted).toBeFalsy();
                    resolve();
                }, 500);
            });
        });

        it('#messages$ in contact should emit message on received messages', (done) => {
            chatService.getOrCreateContactById(contact1.jidBare.toString()).messages$.pipe(first()).subscribe(message => {
                expect(message.body).toEqual('message text');
                expect(message.direction).toEqual(Direction.in);
                done();
            });
            chatConnectionService.onStanzaReceived(
                xml('message', {from: contact1.jidBare.toString()},
                    xml('body', {}, 'message text')) as Stanza);
        });

        it('#messages$ in contact should emit on sending messages', (done) => {
            chatService.getOrCreateContactById(contact1.jidBare.toString()).messages$.pipe(first()).subscribe(message => {
                expect(message.direction).toEqual(Direction.out);
                expect(message.body).toEqual('send message text');
                done();
            });
            chatService.sendMessage(contact1.jidBare.toString(), 'send message text');
        });

        it('#messages$ should emit a message with the same id a second time, the message in the contact should only exist once', (done) => {
            let messagesSeen = 0;
            chatService.message$.pipe(take(2)).subscribe(contact => {
                expect(contact.messages[0].body).toEqual('message text');
                expect(contact.messages[0].direction).toEqual(Direction.in);
                expect(contact.messages[0].id).toEqual('id');
                messagesSeen++;
                if (messagesSeen === 2) {
                    expect(chatService.getContactById(contact1.jidBare.toString()).messages.length).toEqual(1);
                    done();
                }
            });
            const sampleMessageStanzaWithId = xml('message', {from: contact1.jidBare.toString()},
                xml('origin-id', {id: 'id'}),
                xml('body', {}, 'message text')) as Stanza;
            chatConnectionService.onStanzaReceived(sampleMessageStanzaWithId);
            chatConnectionService.onStanzaReceived(sampleMessageStanzaWithId);
        });

    });

    describe('states', () => {

        it('should clear contacts when logging out', async () => {
            chatService.chatConnectionService.state$.next('online');
            await chatService.state$.pipe(first(state => state === 'online')).toPromise();
            chatService.contacts$.next([contact1]);
            chatService.chatConnectionService.state$.next('disconnected');
            await chatService.state$.pipe(first(state => state === 'disconnected')).toPromise();
            expect(chatService.contacts$.getValue()).toEqual([]);
        });

    });

});
