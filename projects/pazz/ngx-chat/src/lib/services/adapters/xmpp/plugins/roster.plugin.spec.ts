import { TestBed } from '@angular/core/testing';
import { x as xml } from '@xmpp/xml';

import { Stanza } from '../../../../core';
import { ContactFactoryService } from '../../../contact-factory.service';
import { LogService } from '../../../log.service';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { XmppChatConnectionService, XmppClientToken } from '../xmpp-chat-connection.service';
import { RosterPlugin } from './roster.plugin';


describe('chat connection service', () => {

    let chatConnectionService;
    let chatAdapter;
    let contactFactory;
    let client;

    beforeEach(() => {
        client = jasmine.createSpyObj('Client', ['getValue', 'on', 'plugin', 'send']);

        TestBed.configureTestingModule({
            providers: [
                {provide: XmppClientToken, useValue: client},
                XmppChatConnectionService,
                XmppChatAdapter,
                LogService,
                ContactFactoryService
            ]
        });

        chatConnectionService = TestBed.get(XmppChatConnectionService);
        contactFactory = TestBed.get(ContactFactoryService);
        chatAdapter = TestBed.get(XmppChatAdapter);
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
            const contacts = await new RosterPlugin(chatAdapter, contactFactory).getRosterContacts();
            expect(contacts).toEqual([contact1, contact2]);
        });

    });

});
