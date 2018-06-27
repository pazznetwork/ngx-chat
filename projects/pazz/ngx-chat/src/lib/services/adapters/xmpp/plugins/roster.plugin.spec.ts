import { TestBed } from '@angular/core/testing';
import { x as xml } from '@xmpp/xml';

import { Stanza } from '../../../../core';
import { ContactSubscription } from '../../../../core/Subscription';
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
    let logService;

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
        logService = TestBed.get(LogService);
    });

    describe('loading roster', () => {

        it('should handle loading roster', async () => {

            client.send.and.callFake((content) => {
                chatConnectionService.onStanzaReceived(
                    xml('iq', {type: 'result', id: content.attrs.id},
                        xml('query', {},
                            xml('item', {subscription: 'both', jid: 'test@example.com', name: 'jon doe'}),
                            xml('item', {subscription: 'to', jid: 'test2@example.com', name: 'jane dane'}),
                            xml('item', {subscription: 'from', jid: 'test3@example.com', name: 'from ask', ask: 'subscribe'}),
                        )
                    ) as Stanza
                );
            });

            const contact1 = contactFactory.createContact('test@example.com', 'jon doe');
            contact1.subscription$.next(ContactSubscription.both);
            const contact2 = contactFactory.createContact('test2@example.com', 'jane dane');
            contact2.subscription$.next(ContactSubscription.to);
            const contact3 = contactFactory.createContact('test3@example.com', 'from ask');
            contact3.subscription$.next(ContactSubscription.from);
            contact3.pendingOut = true;

            const contacts = await new RosterPlugin(chatAdapter, contactFactory, logService).getRosterContacts();
            expect(contacts).toEqual([contact1, contact2, contact3]);
        });

    });

});
