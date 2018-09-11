import { TestBed } from '@angular/core/testing';
import { JID } from '@xmpp/jid';
import { x as xml } from '@xmpp/xml';

import { Contact, ContactSubscription, Presence, Stanza } from '../../../../core';
import { testLogService } from '../../../../test/logService';
import { createXmppClientMock } from '../../../../test/xmppClientMock';
import { ContactFactoryService } from '../../../contact-factory.service';
import { LogService } from '../../../log.service';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { XmppChatConnectionService, XmppClientToken } from '../xmpp-chat-connection.service';
import { RosterPlugin } from './roster.plugin';


describe('roster plugin', () => {

    let chatConnectionService: XmppChatConnectionService;
    let chatAdapter: XmppChatAdapter;
    let contactFactory: ContactFactoryService;
    let xmppClientMock;
    let logService: LogService;

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
        chatAdapter.addPlugins([new RosterPlugin(chatAdapter, contactFactory, logService)]);

        chatConnectionService.userJid = new JID('me', 'example.com', 'something');
    });

    describe('loading roster', () => {

        it('should handle loading roster', async () => {

            xmppClientMock.send.and.callFake((content) => {
                chatConnectionService.onStanzaReceived(
                    xml('iq', {type: 'result', id: content.attrs.id},
                        xml('query', {},
                            xml('item', {subscription: 'both', jid: 'test@example.com', name: 'jon doe'}),
                            xml('item', {subscription: 'to', jid: 'test2@example.com', name: 'jane dane'}),
                            xml('item', {subscription: 'from', jid: 'test3@example.com', name: 'from ask', ask: 'subscribe'}),
                            xml('item', {jid: 'test4@example.com'}),
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
            const contact4 = contactFactory.createContact('test4@example.com');

            const contacts = await new RosterPlugin(chatAdapter, contactFactory, logService).getRosterContacts();
            expect(contacts).toEqual([contact1, contact2, contact3, contact4]);
        });

    });

    describe('handling presence stanzas', () => {

        async function setupMockContact(): Promise<Contact> {
            xmppClientMock.send.and.callFake((content) => {
                chatConnectionService.onStanzaReceived(
                    xml('iq', {type: 'result', id: content.attrs.id},
                        xml('query', {},
                            xml('item', {subscription: 'to', jid: 'test@example.com', name: 'jon doe'})
                        )
                    ) as Stanza
                );
            });
            await chatAdapter.getPlugin(RosterPlugin).refreshRosterContacts();
            return chatAdapter.contacts$.getValue()[0];
        }

        it('should handle presence available', async () => {
            const contact = await setupMockContact();

            expect(contact.presence$.getValue())
                .toEqual(Presence.unavailable);

            const handled = chatAdapter.getPlugin(RosterPlugin).handleStanza(
                xml('presence', {from: 'test@example.com', to: 'me@example.com/resource'})
            );
            expect(handled).toBeTruthy();

            expect(contact.presence$.getValue())
                .toEqual(Presence.present);

        });

        async function testPresenceAfterShow(show: string) {
            const contact = await setupMockContact();

            expect(contact.presence$.getValue())
                .toEqual(Presence.unavailable);

            const handled = chatAdapter.getPlugin(RosterPlugin).handleStanza(
                xml('presence', {from: 'test@example.com', to: 'me@example.com/resource'},
                    xml('show', {}, show))
            );
            expect(handled).toBeTruthy();

            expect(contact.presence$.getValue())
                .toEqual(Presence.present);
        }

        it('should handle presence show stanzas with a show "away" element', async () => {
            await testPresenceAfterShow('away');
        });

        it('should handle presence show stanzas with a show "chat" element', async () => {
            await testPresenceAfterShow('chat');
        });

        it('should handle presence show stanzas with a show "dnd" element', async () => {
            await testPresenceAfterShow('dnd');
        });

        it('should handle presence show stanzas with a show "xa" element', async () => {
            await testPresenceAfterShow('xa');
        });

        it('should handle presence unavailable stanzas', async () => {
            const contact = await setupMockContact();

            contact.presence$.next(Presence.present);
            expect(contact.presence$.getValue()).toEqual(Presence.present);

            const handled = chatAdapter.getPlugin(RosterPlugin).handleStanza(
                xml('presence', {from: 'test@example.com', to: 'me@example.com/resource', type: 'unavailable'})
            );
            expect(handled).toBeTruthy();

            expect(contact.presence$.getValue())
                .toEqual(Presence.unavailable);
        });

        function assertAcceptedPresenceSubscription() {
            expect(xmppClientMock.send).toHaveBeenCalledTimes(2);
            const stanzaSent = xmppClientMock.send.calls.mostRecent().args[0];
            expect(stanzaSent.name).toEqual('presence');
            expect(stanzaSent.attrs.type).toEqual('subscribed');
            expect(stanzaSent.attrs.to).toEqual('test@example.com');
        }

        it('should handle subscribe from a contact and promote subscription from "to" to "both"', async () => {
            const contact = await setupMockContact();
            contact.pendingIn = true;
            contact.subscription$.next(ContactSubscription.to);

            const handled = chatAdapter.getPlugin(RosterPlugin).handleStanza(
                xml('presence', {from: 'test@example.com', to: 'me@example.com/resource', type: 'subscribe'})
            );
            expect(handled).toBeTruthy();

            expect(contact.pendingIn).toBeFalsy();
            assertAcceptedPresenceSubscription();
            expect(contact.subscription$.getValue()).toEqual(ContactSubscription.both);
        });

        it('should handle subscribe from a contact and promote subscription from "none" to "from"', async () => {
            const contact = await setupMockContact();
            contact.pendingOut = true;
            contact.pendingIn = true;
            contact.subscription$.next(ContactSubscription.none);

            const handled = chatAdapter.getPlugin(RosterPlugin).handleStanza(
                xml('presence', {from: 'test@example.com', to: 'me@example.com/resource', type: 'subscribe'})
            );
            expect(handled).toBeTruthy();

            expect(contact.pendingIn).toBeFalsy();
            assertAcceptedPresenceSubscription();
            expect(contact.subscription$.getValue()).toEqual(ContactSubscription.from);
        });

        it('should add a pending in flag to a contact where we have no subscription or pending subscription to', async () => {

            const contact = contactFactory.createContact('test@example.com', 'jon doe');
            chatAdapter.contacts$.next([contact]);

            const handled = chatAdapter.getPlugin(RosterPlugin).handleStanza(
                xml('presence', {from: 'test@example.com', to: 'me@example.com/resource', type: 'subscribe'})
            );
            expect(handled).toBeTruthy();

            expect(contact.pendingIn).toBeTruthy();
        });

        it('should add a pending in flag and create a contact when we never seen him before', async () => {
            const handled = chatAdapter.getPlugin(RosterPlugin).handleStanza(
                xml('presence', {from: 'test@example.com', to: 'me@example.com/resource', type: 'subscribe'})
            );
            expect(handled).toBeTruthy();

            chatAdapter.contactRequestsReceived$.subscribe(contacts => {
                expect(contacts.length).toEqual(1);
                const contact = contacts[0];
                expect(contact.pendingIn).toBeTruthy();
                expect(contact.subscription$.getValue()).toEqual(ContactSubscription.none);
            });
        });

        it('should reset pending out on contact and transition subscription state if contact accepts our subscription', async () => {
            const contact = await setupMockContact();
            contact.subscription$.next(ContactSubscription.none);
            contact.pendingOut = true;

            const handled = chatAdapter.getPlugin(RosterPlugin).handleStanza(
                xml('presence', {from: 'test@example.com', to: 'me@example.com/resource', type: 'subscribed'})
            );
            expect(handled).toBeTruthy();

            chatAdapter.contactsSubscribed$.subscribe(contacts => {
                expect(contacts.length).toEqual(1);
                const subscribedContact = contacts[0];
                expect(subscribedContact).toEqual(contact);
                expect(subscribedContact.pendingOut).toBeFalsy();
                expect(subscribedContact.subscription$.getValue()).toEqual(ContactSubscription.to);
            });
        });

        it('should not accept muc presence stanzas', async () => {
            const handled = chatAdapter.getPlugin(RosterPlugin).handleStanza(
                xml('presence', {from: 'test@example.com', to: 'me@example.com/resource'},
                    xml('x', {xmlns: 'http://jabber.org/protocol/muc#user'})
                )
            );
            expect(handled).toBeFalsy();
        });

    });

});
