import { TestBed } from '@angular/core/testing';
import { Client } from '@xmpp/client-core';
import { x as xml } from '@xmpp/xml';
import { first, skip, take } from 'rxjs/operators';
import { Contact, Direction } from '../core';
import { ChatConnectionService, XmppClientToken } from './chat-connection.service';
import { ChatService } from './chat.service';
import { LogService } from './log.service';

let chatService: ChatService;
let chatConnectionService: ChatConnectionService;

describe('chat service', () => {

    beforeEach(() => {
        const spy = jasmine.createSpyObj('Client', ['getValue', 'on', 'plugin']);

        TestBed.configureTestingModule({
            providers: [
                {provide: XmppClientToken, useValue: spy},
                ChatConnectionService,
                ChatService,
                LogService
            ]
        });

        chatService = TestBed.get(ChatService);
        chatService.initialize();
        chatConnectionService = TestBed.get(ChatConnectionService);
    });

    let contact1: Contact;
    let contact2: Contact;
    let contacts: Contact[];
    const sampleMessage = {
        direction: Direction.in,
        body: 'sample message',
        datetime: new Date()
    };

    beforeEach(() => {
        contact1 = new Contact('test@example.com', 'jon doe');
        contact2 = new Contact('test2@example.com', 'jane dane');
        contacts = [contact1, contact2];
    });

    describe('contact management', () => {


        it('#setContacts() should store contacts', () => {

            chatService.setContacts(contacts);
            expect(chatService.contacts$.getValue())
                .toEqual(contacts);

        });

        it('#getContactByJid() should ignore resources', () => {

            chatService.setContacts(contacts);
            expect(chatService.getContactByJid('test2@example.com/test123'))
                .toEqual(contact2, 'resources should be ignored');

        });

        it('#getContactByJid() should return the correct contact', () => {

            chatService.setContacts(contacts);

            expect(chatService.getContactByJid('test@example.com'))
                .toEqual(contact1);

            expect(chatService.getContactByJid('test2@example.com'))
                .toEqual(contact2);

        });


        it('#getContactByJid() should return undefined when no such contact exists', () => {

            chatService.setContacts(contacts);
            expect(chatService.getContactByJid('non@existing.com'))
                .toBeUndefined();

        });

        it('#contacts$ should provide contacts on update', (resolve) => {

            chatService.contacts$
                .pipe(skip(1)) // skip default contacts empty array
                .subscribe((newContacts) => {
                    expect(newContacts).toEqual(contacts);
                    resolve();
                });

            chatService.setContacts(contacts);

        });

        it('#setContacts() should not reset existing contacts', () => {

            const copyOfContact1 = new Contact('test@example.com', 'jon doe');
            copyOfContact1.appendMessage(sampleMessage);
            chatService.setContacts([copyOfContact1]);
            chatService.setContacts(contacts);

            expect(chatService.getContactByJid(contact1.jidPlain).messages)
                .toEqual([sampleMessage]);

        });

        it('#setContacts() should remove non existing contacts', () => {

            chatService.setContacts([contact1]);
            chatService.setContacts([contact2]);

            expect(chatService.getContactByJid(contact1.jidPlain))
                .toBeUndefined();

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
            chatService.setContacts(contacts);
            chatConnectionService.onStanzaReceived(
                xml('message', {from: contact1.jidPlain},
                    xml('body', {}, 'message text')));
        });

        it('#messages$ should emit contact on received messages', (done) => {
            chatService.setContacts(contacts);
            chatService.getContactByJid(contact1.jidPlain).messages$.pipe(first()).subscribe(message => {
                expect(message.body).toEqual('message text');
                expect(message.direction).toEqual(Direction.in);
                done();
            });
            chatConnectionService.onStanzaReceived(
                xml('message', {from: contact1.jidPlain},
                    xml('body', {}, 'message text')));
        });

        it('#messages$ should emit a message with the same id a second time the messages of the contact should only have one', (done) => {
            let messagesSeen = 0;
            chatService.setContacts(contacts);
            chatService.message$.pipe(take(2)).subscribe(contact => {
                expect(contact.messages[0].body).toEqual('message text');
                expect(contact.messages[0].direction).toEqual(Direction.in);
                expect(contact.messages[0].id).toEqual('id');
                messagesSeen++;
                if (messagesSeen === 2) {
                    expect(chatService.getContactByJid(contact1.jidPlain).messages.length).toEqual(1);
                    done();
                }
            });
            const sampleMessageStanzaWithId = xml('message', {from: contact1.jidPlain},
                xml('origin-id', {id: 'id'}),
                xml('body', {}, 'message text'));
            chatConnectionService.onStanzaReceived(sampleMessageStanzaWithId);
            chatConnectionService.onStanzaReceived(sampleMessageStanzaWithId);
        });

    });

});
