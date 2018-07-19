import { TestBed } from '@angular/core/testing';
import { Client } from '@xmpp/client-core';
import { x as xml } from '@xmpp/xml';
import { first, skip, take } from 'rxjs/operators';

import { Contact, Direction, Stanza } from '../../../core';
import { ChatServiceToken } from '../../chat-service';
import { ContactFactoryService } from '../../contact-factory.service';
import { LogService } from '../../log.service';
import { MessageUuidPlugin } from './plugins';
import { XmppChatAdapter } from './xmpp-chat-adapter.service';
import { XmppChatConnectionService, XmppClientToken } from './xmpp-chat-connection.service';

describe('XmppChatAdapter', () => {

    let chatService: XmppChatAdapter;
    let chatConnectionService: XmppChatConnectionService;
    let contactFactory;

    let contact1: Contact;
    let contact2: Contact;
    let contacts: Contact[];
    const sampleMessage = {
        direction: Direction.in,
        body: 'sample message',
        datetime: new Date()
    };

    beforeEach(() => {
        const xmppClientSpy = jasmine.createSpyObj('Client', ['getValue', 'on', 'plugin', 'send']);

        TestBed.configureTestingModule({
            providers: [
                {provide: XmppClientToken, useValue: xmppClientSpy},
                XmppChatConnectionService,
                {provide: ChatServiceToken, useClass: XmppChatAdapter},
                LogService,
                ContactFactoryService
            ]
        });

        chatService = TestBed.get(ChatServiceToken);
        chatConnectionService = TestBed.get(XmppChatConnectionService);
        contactFactory = TestBed.get(ContactFactoryService);
        chatService.addPlugins([new MessageUuidPlugin()]);

        contact1 = contactFactory.createContact('test@example.com', 'jon doe');
        contact2 = contactFactory.createContact('test2@example.com', 'jane dane');
        contacts = [contact1, contact2];
    });

    describe('contact management', () => {


        it('#appendContacts() should store contacts', () => {

            chatService.appendContacts(contacts);
            expect(chatService.contacts$.getValue())
                .toEqual(contacts);

        });

        it('#getContactById() should ignore resources', () => {

            chatService.appendContacts(contacts);
            expect(chatService.getContactById('test2@example.com/test123'))
                .toEqual(contact2, 'resources should be ignored');

        });

        it('#getContactById() should return the correct contact', () => {

            chatService.appendContacts(contacts);

            expect(chatService.getContactById('test@example.com'))
                .toEqual(contact1);

            expect(chatService.getContactById('test2@example.com'))
                .toEqual(contact2);

        });


        it('#getContactById() should return undefined when no such contact exists', () => {

            chatService.appendContacts(contacts);
            expect(chatService.getContactById('non@existing.com'))
                .toBeUndefined();

        });

        it('#contacts$ should provide contacts on update', (resolve) => {

            chatService.contacts$
                .pipe(skip(1)) // skip default contacts empty array
                .subscribe((newContacts) => {
                    expect(newContacts).toEqual(contacts);
                    resolve();
                });

            chatService.appendContacts(contacts);

        });

        it('#appendContacts() should not reset existing contacts', () => {

            const copyOfContact1 = contactFactory.createContact('test@example.com', 'jon doe');
            copyOfContact1.appendMessage(sampleMessage);
            chatService.appendContacts([copyOfContact1]);
            chatService.appendContacts(contacts);

            expect(chatService.getContactById(contact1.jidBare.toString()).messages)
                .toEqual([sampleMessage]);

        });

        it('#appendContacts() should not add existing contacts', () => {

            chatService.appendContacts([contact1]);
            expect(chatService.contacts$.getValue())
                .toEqual([contact1]);

            chatService.appendContacts([contact1]);
            expect(chatService.contacts$.getValue())
                .toEqual([contact1]);

        });

        it('#appendContacts() should not notify on non-updates', () => {

            let updateCount = 0;
            chatService.contacts$.subscribe(() => {
                updateCount++;
            });
            chatService.appendContacts([contact1]);
            chatService.appendContacts([contact1]);
            expect(updateCount).toEqual(2);

        });

    });

    describe('messages', () => {

        it('#messages$ should emit contact on received messages', (done) => {
            chatService.message$.pipe(first()).subscribe(contact => {
                expect(contact.name).toEqual(contact1.name);
                expect(contact.messages.length).toEqual(1);
                expect(contact.messages[0].body).toEqual('message text');
                expect(contact.messages[0].direction).toEqual(Direction.in);
                done();
            });
            chatService.appendContacts(contacts);
            chatConnectionService.onStanzaReceived(
                xml('message', {from: contact1.jidBare.toString()},
                    xml('body', {}, 'message text')) as Stanza);
        });

        it('#messages$ should emit contact on received messages', (done) => {
            chatService.appendContacts(contacts);
            chatService.getContactById(contact1.jidBare.toString()).messages$.pipe(first()).subscribe(message => {
                expect(message.body).toEqual('message text');
                expect(message.direction).toEqual(Direction.in);
                done();
            });
            chatConnectionService.onStanzaReceived(
                xml('message', {from: contact1.jidBare.toString()},
                    xml('body', {}, 'message text')) as Stanza);
        });

        it('#messages$ should emit a message with the same id a second time the messages of the contact should only have one', (done) => {
            let messagesSeen = 0;
            chatService.appendContacts(contacts);
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

        it('should clear contacts when logging out', () => {
            chatService.contacts$.next([contact1]);

            chatService.logOut();

            expect(chatService.contacts$.getValue()).toEqual([]);
        });

    });

});
