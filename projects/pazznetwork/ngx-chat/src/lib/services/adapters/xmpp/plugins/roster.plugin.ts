import { jid as parseJid, xml } from '@xmpp/client';
import { Contact } from '../../../../core/contact';
import { Presence } from '../../../../core/presence';
import { PresenceStanza, Stanza } from '../../../../core/stanza';
import { ContactSubscription } from '../../../../core/subscription';
import { LogService } from '../../../log.service';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';

/**
 * https://xmpp.org/rfcs/rfc6121.html#roster-add-success
 */
export class RosterPlugin extends AbstractXmppPlugin {

    constructor(
        private chatService: XmppChatAdapter,
        private logService: LogService,
    ) {
        super();
    }

    handleStanza(stanza: Stanza) {
        if (this.isCapabilitiesStanza(stanza)) {
            return false;
        }
        if (this.isRosterPushStanza(stanza)) {
            return this.handleRosterPushStanza(stanza);
        } else if (this.isPresenceStanza(stanza)) {
            return this.handlePresenceStanza(stanza);
        }
        return false;
    }

    private isRosterPushStanza(stanza: Stanza) {
        return stanza.name === 'iq'
            && stanza.attrs.type === 'set'
            && stanza.getChild('query', 'jabber:iq:roster');
    }

    private isPresenceStanza(stanza: Stanza): stanza is PresenceStanza {
        return stanza.name === 'presence' && !stanza.getChild('x', 'http://jabber.org/protocol/muc#user');
    }

    private isCapabilitiesStanza(stanza: Stanza) {
        const child = stanza.getChild('c', 'http://jabber.org/protocol/caps');
        return !!child;
    }

    private handleRosterPushStanza(stanza: Stanza) {

        // TODO:
        // Security Warning: Traditionally, a roster push included no 'from' address, with the result that all roster pushes were sent
        // implicitly from the bare JID of the account itself. However, this specification allows entities other than the user's server
        // to maintain roster information, which means that a roster push might include a 'from' address other than the bare JID of the
        // user's account. Therefore, the client MUST check the 'from' address to verify that the sender of the roster push is authorized
        // to update the roster. If the client receives a roster push from an unauthorized entity, it MUST NOT process the pushed data; in
        // addition, the client can either return a stanza error of <service-unavailable/> error or refuse to return a stanza error at all
        // (the latter behavior overrides a MUST-level requirement from [XMPP‑CORE] for the purpose of preventing a presence leak).

        const itemChild = stanza.getChild('query').getChild('item');
        const contact = this.chatService.getOrCreateContactById(itemChild.attrs.jid, itemChild.attrs.name || itemChild.attrs.jid);
        contact.pendingOut$.next(itemChild.attrs.ask === 'subscribe');
        const subscriptionStatus = itemChild.attrs.subscription || 'none';

        this.chatService.chatConnectionService.sendIqAckResult(stanza.attrs.id);

        let handled = false;

        if (subscriptionStatus === 'remove') {
            contact.pendingOut$.next(false);
            contact.subscription$.next(ContactSubscription.none);
            handled = true;
        } else if (subscriptionStatus === 'none') {
            contact.subscription$.next(ContactSubscription.none);
            handled = true;
        } else if (subscriptionStatus === 'to') {
            contact.subscription$.next(ContactSubscription.to);
            handled = true;
        } else if (subscriptionStatus === 'from') {
            contact.subscription$.next(ContactSubscription.from);
            handled = true;
        } else if (subscriptionStatus === 'both') {
            contact.subscription$.next(ContactSubscription.both);
            handled = true;
        }

        if (handled) {
            const existingContacts = this.chatService.contacts$.getValue();
            this.chatService.contacts$.next(existingContacts);
        }

        return handled;
    }

    private handlePresenceStanza(stanza: PresenceStanza) {
        const fromAsContact = this.chatService.getOrCreateContactById(stanza.attrs.from);
        const isAddressedToMe = this.chatService.chatConnectionService.userJid.bare().equals(parseJid(stanza.attrs.to).bare());
        if (isAddressedToMe) {
            if (!stanza.attrs.type) {
                // https://xmpp.org/rfcs/rfc3921.html#stanzas-presence-children-show
                const show = stanza.getChildText('show');
                const presenceMapping: { [key: string]: Presence } = {
                    chat: Presence.present,
                    null: Presence.present,
                    away: Presence.away,
                    dnd: Presence.away,
                    xa: Presence.away,
                };
                const presence = presenceMapping[show];
                if (presence) {
                    fromAsContact.updateResourcePresence(stanza.attrs.from, presence);
                } else {
                    this.logService.error('illegal presence:', stanza.attrs.from, show);
                }
                return true;
            } else if (stanza.attrs.type === 'unavailable') {
                fromAsContact.updateResourcePresence(stanza.attrs.from, Presence.unavailable);
                return true;
            } else if (stanza.attrs.type === 'subscribe') {
                if (fromAsContact.isSubscribed() || fromAsContact.pendingOut$.getValue()) {
                    // subscriber is already a contact of us, approve subscription
                    fromAsContact.pendingIn$.next(false);
                    this.sendAcceptPresenceSubscriptionRequest(stanza.attrs.from);
                    fromAsContact.subscription$.next(
                        this.transitionSubscriptionRequestReceivedAccepted(fromAsContact.subscription$.getValue()));
                    this.chatService.contacts$.next(this.chatService.contacts$.getValue());
                    return true;
                } else if (fromAsContact) {
                    // subscriber is known but not subscribed or pending
                    fromAsContact.pendingIn$.next(true);
                    this.chatService.contacts$.next(this.chatService.contacts$.getValue());
                    return true;
                }
            } else if (stanza.attrs.type === 'subscribed') {
                fromAsContact.pendingOut$.next(false);
                fromAsContact.subscription$.next(this.transitionSubscriptionRequestSentAccepted(fromAsContact.subscription$.getValue()));
                this.chatService.contacts$.next(this.chatService.contacts$.getValue());
                return true;
            } else if (stanza.attrs.type === 'unsubscribed') {
                // TODO: handle unsubscribed
            } else if (stanza.attrs.type === 'unsubscribe') {
                // TODO: handle unsubscribe
            }
        }
        return false;
    }

    private transitionSubscriptionRequestReceivedAccepted(subscription: ContactSubscription) {
        switch (subscription) {
            case ContactSubscription.none:
                return ContactSubscription.from;
            case ContactSubscription.to:
                return ContactSubscription.both;
            default:
                return subscription;
        }
    }

    private transitionSubscriptionRequestSentAccepted(subscription: ContactSubscription) {
        switch (subscription) {
            case ContactSubscription.none:
                return ContactSubscription.to;
            case ContactSubscription.from:
                return ContactSubscription.both;
            default:
                return subscription;
        }
    }

    private sendAcceptPresenceSubscriptionRequest(jid: string) {
        const contact = this.chatService.getOrCreateContactById(jid);
        contact.pendingIn$.next(false);
        this.chatService.chatConnectionService.send(
            xml('presence', {to: jid, type: 'subscribed', id: this.chatService.chatConnectionService.getNextIqId()})
        );
    }

    public onBeforeOnline(): PromiseLike<any> {
        return this.refreshRosterContacts();
    }

    getRosterContacts(): Promise<Contact[]> {
        return new Promise((resolve) =>
            this.chatService.chatConnectionService.sendIq(
                xml('iq', {type: 'get'},
                    xml('query', {xmlns: 'jabber:iq:roster'})
                )
            ).then(
                (responseStanza: Stanza) => resolve(this.convertToContacts(responseStanza)),
                (responseStanza: Stanza) => {
                    this.logService.error('error converting roster contact push', responseStanza.toString());
                    resolve([]);
                }
            )
        );
    }

    private convertToContacts(responseStanza: Stanza): Contact[] {
        return responseStanza.getChild('query').getChildElements()
            .map(rosterElement => {
                const contact = this.chatService.getOrCreateContactById(rosterElement.attrs.jid,
                    rosterElement.attrs.name || rosterElement.attrs.jid);
                contact.subscription$.next(this.parseSubscription(rosterElement.attrs.subscription));
                contact.pendingOut$.next(rosterElement.attrs.ask === 'subscribe');
                return contact;
            });
    }

    private parseSubscription(subscription: string): ContactSubscription {
        switch (subscription) {
            case 'to':
                return ContactSubscription.to;
            case 'from':
                return ContactSubscription.from;
            case 'both':
                return ContactSubscription.both;
            case 'none':
            default:
                return ContactSubscription.none;
        }
    }

    addRosterContact(jid: string): void {
        this.sendAcceptPresenceSubscriptionRequest(jid);
        this.sendAddToRoster(jid);
        this.sendSubscribeToPresence(jid);
    }

    private sendAddToRoster(jid: string) {
        return this.chatService.chatConnectionService.sendIq(
            xml('iq', {type: 'set'},
                xml('query', {xmlns: 'jabber:iq:roster'},
                    xml('item', {jid}))));
    }

    private sendSubscribeToPresence(jid: string) {
        this.chatService.chatConnectionService.send(
            xml('presence', {id: this.chatService.chatConnectionService.getNextIqId(), to: jid, type: 'subscribe'})
        );
    }

    removeRosterContact(jid: string): void {
        const contact = this.chatService.getContactById(jid);
        if (contact) {
            contact.subscription$.next(ContactSubscription.none);
            contact.pendingOut$.next(false);
            contact.pendingIn$.next(false);
            this.sendRemoveFromRoster(jid);
            this.sendWithdrawPresenceSubscription(jid);
        }
    }

    private sendRemoveFromRoster(jid: string) {
        this.chatService.chatConnectionService.sendIq(
            xml('iq', {type: 'set'},
                xml('query', {xmlns: 'jabber:iq:roster'},
                    xml('item', {jid, subscription: 'remove'}))));
    }

    private sendWithdrawPresenceSubscription(jid: string) {
        this.chatService.chatConnectionService.send(
            xml('presence', {id: this.chatService.chatConnectionService.getNextIqId(), to: jid, type: 'unsubscribed'})
        );
    }

    refreshRosterContacts() {
        return this.getRosterContacts();
    }
}
