import { TestBed } from '@angular/core/testing';
import { x as xml } from '@xmpp/xml';
import { first } from 'rxjs/operators';

import { Stanza } from '../../../core';
import { ContactFactoryService } from '../../contact-factory.service';
import { LogService } from '../../log.service';
import { XmppChatConnectionService, XmppClientToken } from './xmpp-chat-connection.service';

describe('chat connection service', () => {

    let chatConnectionService;
    let contactFactory;
    let client;

    beforeEach(() => {
        client = jasmine.createSpyObj('Client', ['getValue', 'on', 'plugin', 'send']);

        TestBed.configureTestingModule({
            providers: [
                {provide: XmppClientToken, useValue: client},
                XmppChatConnectionService,
                LogService,
                ContactFactoryService
            ]
        });

        chatConnectionService = TestBed.get(XmppChatConnectionService);
        contactFactory = TestBed.get(ContactFactoryService);
    });

    it('#getNextIqId() should generate new iq ids', () => {
        expect(chatConnectionService.getNextIqId())
            .not.toEqual(chatConnectionService.getNextIqId(), 'two consecutive iq ids should not match');
    });

    describe('receiving messages', () => {

        it('should emit events on receiving a message', (done) => {
            chatConnectionService.stanzaMessage$.pipe(first()).subscribe(async (stanza) => {
                await expect(stanza.getChildText('body')).toEqual('message text');
                done();
            });
            chatConnectionService.onStanzaReceived(
                xml('message', {},
                    xml('body', {}, 'message text')));
        });

    });

    describe('loading roster', () => {

        it('should handle loading roster', async () => {

            client.send.and.callFake((content) => {
                chatConnectionService.onStanzaReceived(
                    xml('iq', {type: 'result', id: content.attrs.id},
                        xml('query', {},
                            xml('item', {subscription: 'both', jid: 'test@example.com', name: 'jon doe'}),
                            xml('item', {subscription: 'both', jid: 'test2@example.com', name: 'jane dane'}),
                        )
                    ) as Stanza
                );
            });

            const contact1 = contactFactory.createContact('test@example.com', 'jon doe');
            const contact2 = contactFactory.createContact('test2@example.com', 'jane dane');
            const contacts = await chatConnectionService.getRosterContacts();
            expect(contacts).toEqual([contact1, contact2]);
        });

    });

});
