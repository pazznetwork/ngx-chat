import { TestBed } from '@angular/core/testing';
import { jid as parseJid, xml } from '@xmpp/client';
import { Contact } from '../../../../core/contact';
import { Presence } from '../../../../core/presence';
import { Stanza } from '../../../../core/stanza';
import { ContactSubscription } from '../../../../core/subscription';
import { testLogService } from '../../../../test/log-service';
import { MockClientFactory } from '../../../../test/xmppClientMock';
import { ContactFactoryService } from '../../../contact-factory.service';
import { LogService } from '../../../log.service';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { XmppChatConnectionService } from '../xmpp-chat-connection.service';
import { XmppClientFactoryService } from '../xmpp-client-factory.service';
import { RosterPlugin } from './roster.plugin';

describe('roster plugin', () => {

    let chatConnectionService: XmppChatConnectionService;
    let chatAdapter: XmppChatAdapter;
    let contactFactory: ContactFactoryService;
    let xmppClientMock;
    let logService: LogService;

    beforeEach(() => {
        const mockClientFactory = new MockClientFactory();
        xmppClientMock = mockClientFactory.clientInstance;

        TestBed.configureTestingModule({
            providers: [
                XmppChatConnectionService,
                {provide: XmppClientFactoryService, useValue: mockClientFactory},
                XmppChatAdapter,
                {provide: LogService, useValue: testLogService()},
                ContactFactoryService
            ]
        });

        chatConnectionService = TestBed.inject(XmppChatConnectionService);
        chatConnectionService.client = xmppClientMock;
        contactFactory = TestBed.inject(ContactFactoryService);
        chatAdapter = TestBed.inject(XmppChatAdapter);
        logService = TestBed.inject(LogService);
        chatAdapter.addPlugins([new RosterPlugin(chatAdapter, logService)]);

        chatConnectionService.userJid = parseJid('me', 'example.com', 'something');
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
            contact3.pendingOut$.next(true);
            const contact4 = contactFactory.createContact('test4@example.com');

            const contacts = await new RosterPlugin(chatAdapter, logService).getRosterContacts();
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
                xml('presence', {from: 'test@example.com', to: 'me@example.com/resource'}) as Stanza
            );
            expect(handled).toBeTruthy();

            expect(contact.presence$.getValue())
                .toEqual(Presence.present);

        });

        async function testPresenceAfterShow(show: string, expectedPresence: Presence) {
            const contact = await setupMockContact();

            expect(contact.presence$.getValue())
                .toEqual(Presence.unavailable);

            const handled = chatAdapter.getPlugin(RosterPlugin).handleStanza(
                xml('presence', {from: 'test@example.com', to: 'me@example.com/resource'},
                    xml('show', {}, show)) as Stanza
            );
            expect(handled).toBeTruthy();

            expect(contact.presence$.getValue())
                .toEqual(expectedPresence);
        }

        it('should handle presence show stanzas with a show "away" element', async () => {
            await testPresenceAfterShow('away', Presence.away);
        });

        it('should handle presence show stanzas with a show "chat" element', async () => {
            await testPresenceAfterShow('chat', Presence.present);
        });

        it('should handle presence show stanzas with a show "dnd" element', async () => {
            await testPresenceAfterShow('dnd', Presence.away);
        });

        it('should handle presence show stanzas with a show "xa" element', async () => {
            await testPresenceAfterShow('xa', Presence.away);
        });

        it('should handle presence unavailable stanzas', async () => {
            const contact = await setupMockContact();

            contact.updateResourcePresence(contact.jidBare.toString() + '/bla', Presence.present);
            expect(contact.presence$.getValue()).toEqual(Presence.present);

            const handled = chatAdapter.getPlugin(RosterPlugin).handleStanza(
                xml('presence', {from: 'test@example.com/bla', to: 'me@example.com/bla', type: 'unavailable'}) as Stanza
            );
            expect(handled).toBeTruthy();

            expect(contact.presence$.getValue()).toEqual(Presence.unavailable);
        });

        it('should handle multiple resources and summarize the status', async () => {
            const contact = await setupMockContact();

            contact.updateResourcePresence(contact.jidBare.toString() + '/foo', Presence.away);
            expect(contact.presence$.getValue()).toEqual(Presence.away);

            contact.updateResourcePresence(contact.jidBare.toString() + '/bar', Presence.present);
            expect(contact.presence$.getValue()).toEqual(Presence.present);

            contact.updateResourcePresence(contact.jidBare.toString() + '/bar', Presence.unavailable);
            expect(contact.presence$.getValue()).toEqual(Presence.away);

            contact.updateResourcePresence(contact.jidBare.toString() + '/foo', Presence.unavailable);
            expect(contact.presence$.getValue()).toEqual(Presence.unavailable);

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
            contact.pendingIn$.next(true);
            contact.subscription$.next(ContactSubscription.to);

            const handled = chatAdapter.getPlugin(RosterPlugin).handleStanza(
                xml('presence', {from: 'test@example.com', to: 'me@example.com/resource', type: 'subscribe'}) as Stanza
            );
            expect(handled).toBeTruthy();

            expect(contact.pendingIn$.getValue()).toBeFalsy();
            assertAcceptedPresenceSubscription();
            expect(contact.subscription$.getValue()).toEqual(ContactSubscription.both);
        });

        it('should handle subscribe from a contact and promote subscription from "none" to "from"', async () => {
            const contact = await setupMockContact();
            contact.pendingOut$.next(true);
            contact.pendingIn$.next(true);
            contact.subscription$.next(ContactSubscription.none);

            const handled = chatAdapter.getPlugin(RosterPlugin).handleStanza(
                xml('presence', {from: 'test@example.com', to: 'me@example.com/resource', type: 'subscribe'}) as Stanza
            );
            expect(handled).toBeTruthy();

            expect(contact.pendingIn$.getValue()).toBeFalsy();
            assertAcceptedPresenceSubscription();
            expect(contact.subscription$.getValue()).toEqual(ContactSubscription.from);
        });

        it('should add a pending in flag to a contact where we have no subscription or pending subscription to', async () => {

            const contact = contactFactory.createContact('test@example.com', 'jon doe');
            chatAdapter.contacts$.next([contact]);

            const handled = chatAdapter.getPlugin(RosterPlugin).handleStanza(
                xml('presence', {from: 'test@example.com', to: 'me@example.com/resource', type: 'subscribe'}) as Stanza
            );
            expect(handled).toBeTruthy();

            expect(contact.pendingIn$.getValue()).toBeTruthy();
        });

        it('should add a pending in flag and create a contact when we never seen him before', async () => {
            const handled = chatAdapter.getPlugin(RosterPlugin).handleStanza(
                xml('presence', {from: 'test@example.com', to: 'me@example.com/resource', type: 'subscribe'}) as Stanza
            );
            expect(handled).toBeTruthy();

            chatAdapter.contactRequestsReceived$.subscribe(contacts => {
                expect(contacts.length).toEqual(1);
                const contact = contacts[0];
                expect(contact.pendingIn$.getValue()).toBeTruthy();
                expect(contact.subscription$.getValue()).toEqual(ContactSubscription.none);
            });
        });

        it('should reset pending out on contact and transition subscription state if contact accepts our subscription', async () => {
            const contact = await setupMockContact();
            contact.subscription$.next(ContactSubscription.none);
            contact.pendingOut$.next(true);

            const handled = chatAdapter.getPlugin(RosterPlugin).handleStanza(
                xml('presence', {from: 'test@example.com', to: 'me@example.com/resource', type: 'subscribed'}) as Stanza
            );
            expect(handled).toBeTruthy();

            chatAdapter.contactsSubscribed$.subscribe(contacts => {
                expect(contacts.length).toEqual(1);
                const subscribedContact = contacts[0];
                expect(subscribedContact).toEqual(contact);
                expect(subscribedContact.pendingOut$.getValue()).toBeFalsy();
                expect(subscribedContact.subscription$.getValue()).toEqual(ContactSubscription.to);
            });
        });

        it('should not accept muc presence stanzas', async () => {
            const handled = chatAdapter.getPlugin(RosterPlugin).handleStanza(
                xml('presence', {from: 'test@example.com', to: 'me@example.com/resource'},
                    xml('x', {xmlns: 'http://jabber.org/protocol/muc#user'})
                ) as Stanza
            );
            expect(handled).toBeFalsy();
        });

    });

});
