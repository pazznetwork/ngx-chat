import { TestBed } from '@angular/core/testing';
import { Client } from '@xmpp/client-core';
import { skip } from 'rxjs/operators';
import { Contact, Direction } from '../core';
import { ChatConnectionService, XmppClientToken } from './chat-connection.service';
import { ChatService } from './chat.service';
import { LogService } from './log.service';

let chatService: ChatService;
let valueServiceSpy: jasmine.SpyObj<Client>;

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
        valueServiceSpy = TestBed.get(XmppClientToken);

    });

    describe('contact management', () => {

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

            expect(chatService.getContactByJid(contact1.jid).messages)
                .toEqual([sampleMessage]);

        });

        it('#setContacts() should remove non existing contacts', () => {

            chatService.setContacts([contact1]);
            chatService.setContacts([contact2]);

            expect(chatService.getContactByJid(contact1.jid))
                .toBeUndefined();

        });

    });

});
